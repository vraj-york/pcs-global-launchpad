#!/bin/bash
# Diagnose (and optionally fix) VPN-connected DB access for dev/staging/uat.
#
# Use when: VPN connects but pgAdmin/psql times out (P1001).
#
# Usage:
#   ./diagnose-vpn-db-access.sh -e dev
#   ./diagnose-vpn-db-access.sh -e staging --fix
#   ./diagnose-vpn-db-access.sh -e uat --fix
#
# --fix applies common AWS remediations (VPC DNS on VPN, VPN SG on RDS).

set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
APPLY_FIX=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; }
info() { echo -e "[INFO] $*"; }

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -e|--env) ENVIRONMENT="$2"; shift 2 ;;
    --region) AWS_REGION="$2"; shift 2 ;;
    --fix) APPLY_FIX=true; shift ;;
    -h|--help)
      sed -n '1,14p' "$0" | tail -n +2
      exit 0
      ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
RDS_ID="${STACK_PREFIX}-rds"
VPN_STACK="${STACK_PREFIX}-client-vpn"
VPC_CIDR="${VPC_CIDR:-10.0.0.0/22}"
VPN_CLIENT_CIDR="${VPN_CLIENT_CIDR:-172.16.0.0/22}"
VPC_DNS="${VPC_DNS:-10.0.0.2}"

echo "=========================================="
echo "VPN + DB access diagnostic: ${ENVIRONMENT}"
echo "Region: ${AWS_REGION}"
echo "=========================================="
echo ""

command -v aws >/dev/null || { err "aws CLI required"; exit 1; }
command -v jq >/dev/null || { err "jq required"; exit 1; }

# --- RDS ---
info "Checking RDS ${RDS_ID}..."
RDS_JSON=$(aws rds describe-db-instances \
  --db-instance-identifier "${RDS_ID}" \
  --region "${AWS_REGION}" \
  --output json 2>/dev/null || echo "")

if [ -z "${RDS_JSON}" ]; then
  err "RDS instance ${RDS_ID} not found"
  exit 1
fi

RDS_ENDPOINT=$(echo "${RDS_JSON}" | jq -r '.DBInstances[0].Endpoint.Address')
RDS_PORT=$(echo "${RDS_JSON}" | jq -r '.DBInstances[0].Endpoint.Port')
RDS_PUBLIC=$(echo "${RDS_JSON}" | jq -r '.DBInstances[0].PubliclyAccessible')
RDS_STATUS=$(echo "${RDS_JSON}" | jq -r '.DBInstances[0].DBInstanceStatus')
RDS_SG=$(echo "${RDS_JSON}" | jq -r '.DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId')

info "Endpoint:  ${RDS_ENDPOINT}:${RDS_PORT}"
info "Status:    ${RDS_STATUS}"
info "Public:    ${RDS_PUBLIC}"
info "RDS SG:    ${RDS_SG}"

if [ "${RDS_PUBLIC}" = "true" ]; then
  warn "RDS is publicly accessible — VPN may not be required for DB access"
else
  ok "RDS is private — VPN required from laptop"
fi

RDS_IP=$(dig +short "${RDS_ENDPOINT}" @8.8.8.8 2>/dev/null | head -1 || true)
if [ -n "${RDS_IP}" ]; then
  info "RDS private IP (use in pgAdmin if hostname fails): ${RDS_IP}"
else
  warn "Could not resolve RDS hostname to IP"
fi

# --- RDS security group ---
info "Checking RDS security group inbound (port 5432)..."
SG_JSON=$(aws ec2 describe-security-groups --group-ids "${RDS_SG}" --region "${AWS_REGION}" --output json)
HAS_VPN_CIDR=$(echo "${SG_JSON}" | jq -r --arg cidr "${VPN_CLIENT_CIDR}" \
  '[.SecurityGroups[0].IpPermissions[]? | select(.FromPort==5432) | .IpRanges[]?.CidrIp] | index($cidr) != null')
HAS_PUBLIC=$(echo "${SG_JSON}" | jq -r \
  '[.SecurityGroups[0].IpPermissions[]? | select(.FromPort==5432) | .IpRanges[]?.CidrIp] | index("0.0.0.0/0") != null')

if [ "${HAS_VPN_CIDR}" = "true" ]; then
  ok "RDS SG allows VPN CIDR ${VPN_CLIENT_CIDR}"
else
  err "RDS SG missing VPN CIDR ${VPN_CLIENT_CIDR} on port 5432"
  if [ "${APPLY_FIX}" = true ]; then
    info "Adding VPN CIDR rule..."
    aws ec2 authorize-security-group-ingress \
      --group-id "${RDS_SG}" \
      --region "${AWS_REGION}" \
      --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=${VPN_CLIENT_CIDR},Description='VPN clients'}]"
    ok "Added VPN CIDR rule"
  fi
fi

if [ "${HAS_PUBLIC}" = "true" ]; then
  warn "RDS SG still allows 0.0.0.0/0 on 5432 — consider removing for security"
fi

# --- Client VPN ---
info "Checking Client VPN stack ${VPN_STACK}..."
ENDPOINT_ID=$(aws cloudformation describe-stacks \
  --stack-name "${VPN_STACK}" \
  --region "${AWS_REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='ClientVpnEndpointId'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -z "${ENDPOINT_ID}" ] || [ "${ENDPOINT_ID}" = "None" ]; then
  err "Client VPN stack ${VPN_STACK} not found"
  exit 1
fi

VPN_JSON=$(aws ec2 describe-client-vpn-endpoints \
  --client-vpn-endpoint-ids "${ENDPOINT_ID}" \
  --region "${AWS_REGION}" \
  --output json)

VPN_STATUS=$(echo "${VPN_JSON}" | jq -r '.ClientVpnEndpoints[0].Status.Code')
VPN_CLIENT_CIDR_ACTUAL=$(echo "${VPN_JSON}" | jq -r '.ClientVpnEndpoints[0].ClientCidrBlock')
VPN_DNS=$(echo "${VPN_JSON}" | jq -r '.ClientVpnEndpoints[0].DnsServers | if . == null then "null" else . end')

info "VPN endpoint: ${ENDPOINT_ID}"
info "VPN status:   ${VPN_STATUS}"
info "Client CIDR:  ${VPN_CLIENT_CIDR_ACTUAL}"

if [ "${VPN_STATUS}" != "available" ]; then
  err "VPN endpoint is not available"
fi

AUTH_CIDR=$(aws ec2 describe-client-vpn-authorization-rules \
  --client-vpn-endpoint-id "${ENDPOINT_ID}" \
  --region "${AWS_REGION}" \
  --query 'AuthorizationRules[0].DestinationCidr' \
  --output text 2>/dev/null || echo "")
info "VPN auth rule destination: ${AUTH_CIDR}"

VPN_SG=$(aws ec2 describe-client-vpn-target-networks \
  --client-vpn-endpoint-id "${ENDPOINT_ID}" \
  --region "${AWS_REGION}" \
  --query 'ClientVpnTargetNetworks[0].SecurityGroups[0]' \
  --output text 2>/dev/null || echo "")

HAS_VPN_SG=$(echo "${SG_JSON}" | jq -r --arg sg "${VPN_SG}" \
  '[.SecurityGroups[0].IpPermissions[]? | select(.FromPort==5432) | .UserIdGroupPairs[]?.GroupId] | index($sg) != null')

if [ -n "${VPN_SG}" ] && [ "${VPN_SG}" != "None" ]; then
  info "VPN endpoint SG: ${VPN_SG}"
  if [ "${HAS_VPN_SG}" = "true" ]; then
    ok "RDS SG allows VPN endpoint security group"
  else
    warn "RDS SG missing VPN endpoint SG ${VPN_SG}"
    if [ "${APPLY_FIX}" = true ]; then
      aws ec2 authorize-security-group-ingress \
        --group-id "${RDS_SG}" \
        --region "${AWS_REGION}" \
        --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId=${VPN_SG},Description='Client VPN endpoint'}]" \
        2>/dev/null || true
      ok "Added VPN endpoint SG rule (or already exists)"
    fi
  fi
fi

if [ "${VPN_DNS}" = "null" ] || [ -z "${VPN_DNS}" ]; then
  warn "VPN endpoint has no custom DNS — may cause hostname resolution issues"
  if [ "${APPLY_FIX}" = true ]; then
    aws ec2 modify-client-vpn-endpoint \
      --client-vpn-endpoint-id "${ENDPOINT_ID}" \
      --dns-servers "Enabled=true,CustomDnsServers=${VPC_DNS}" \
      --region "${AWS_REGION}" >/dev/null
    ok "Enabled VPC DNS ${VPC_DNS} on VPN endpoint"
  fi
else
  ok "VPN DNS configured: ${VPN_DNS}"
fi

# --- Local client cert check ---
CERT_DIR="/tmp/${PROJECT_NAME}-${ENVIRONMENT}-vpn-certs"
info "Checking local client cert ${CERT_DIR}/client.crt..."
if [ -f "${CERT_DIR}/client.crt" ]; then
  if command -v openssl >/dev/null 2>&1; then
    SUBJECT=$(openssl x509 -in "${CERT_DIR}/client.crt" -noout -subject 2>/dev/null || echo "")
    EXPECTED="${PROJECT_NAME}-${ENVIRONMENT}-vpn-client"
    if echo "${SUBJECT}" | grep -q "${EXPECTED}"; then
      ok "Client cert matches environment (${EXPECTED})"
    else
      err "Client cert mismatch: ${SUBJECT}"
      info "Run: ./setup-vpn-certs.sh -e ${ENVIRONMENT}"
      info "Then: ./download-vpn-client-config.sh -e ${ENVIRONMENT}"
    fi
  fi
else
  warn "No local client cert at ${CERT_DIR} — run ./setup-vpn-certs.sh -e ${ENVIRONMENT}"
fi

# --- Summary / local tests ---
echo ""
echo "=========================================="
echo "LOCAL TESTS (run on your laptop)"
echo "=========================================="
echo ""
echo "1. Disconnect other env VPNs (dev/staging/uat all use route ${VPC_CIDR})"
echo "2. Connect ONLY ${ENVIRONMENT} VPN"
echo "3. Run:"
echo ""
echo "   ifconfig | grep 'inet 172.16'"
echo "   netstat -rn | grep '10.0'"
if [ -n "${RDS_IP}" ]; then
  echo "   nc -zv ${RDS_IP} ${RDS_PORT}"
fi
echo ""
echo "=========================================="
echo "pgAdmin / psql settings"
echo "=========================================="
echo ""
echo "   Host:     ${RDS_IP:-$RDS_ENDPOINT}"
echo "   Port:     ${RDS_PORT}"
echo "   Database: bspdb   (confirm with team)"
echo "   SSL:      disable for first test"
echo ""
echo "Regenerate VPN profile:"
echo "   ./download-vpn-client-config.sh -e ${ENVIRONMENT} -o ${PROJECT_NAME}-${ENVIRONMENT}-client.ovpn"
echo ""
if [ "${APPLY_FIX}" = false ]; then
  echo "Apply AWS fixes automatically:"
  echo "   ./diagnose-vpn-db-access.sh -e ${ENVIRONMENT} --fix"
  echo ""
  warn "After --fix, disconnect and reconnect VPN"
fi
