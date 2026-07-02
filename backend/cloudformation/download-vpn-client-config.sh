#!/bin/bash
# Export AWS Client VPN configuration and embed client certificate/key for OpenVPN.
#
# Usage:
#   ./download-vpn-client-config.sh [-e dev] [--region us-east-1] [--cert-dir /path/to/certs]
#
# Requires: aws CLI, VPN stack deployed, client.crt/client.key from setup-vpn-certs.sh

set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -e|--env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --cert-dir)
      CERT_DIR="$2"
      shift 2
      ;;
    -o|--output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [-e|--env <env>] [--region <region>] [--cert-dir <dir>] [-o output.ovpn]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Resolve paths after parsing -e (CERT_DIR must match environment, not default dev)
CERT_DIR="${CERT_DIR:-/tmp/${PROJECT_NAME}-${ENVIRONMENT}-vpn-certs}"
OUTPUT_FILE="${OUTPUT_FILE:-${PROJECT_NAME}-${ENVIRONMENT}-client.ovpn}"

STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}-client-vpn"

ENDPOINT_ID=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${AWS_REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='ClientVpnEndpointId'].OutputValue" \
  --output text 2>/dev/null || echo "")

if [ -z "${ENDPOINT_ID}" ] || [ "${ENDPOINT_ID}" = "None" ]; then
  echo "Could not find Client VPN endpoint ID from stack ${STACK_NAME}"
  exit 1
fi

CLIENT_CRT="${CERT_DIR}/client.crt"
CLIENT_KEY="${CERT_DIR}/client.key"

if [ ! -f "${CLIENT_CRT}" ] || [ ! -f "${CLIENT_KEY}" ]; then
  echo "Missing client certificate files in ${CERT_DIR}"
  echo "Run ./setup-vpn-certs.sh -e ${ENVIRONMENT} first."
  exit 1
fi

# Guard against embedding dev certs into a staging/uat profile (common when CERT_DIR was wrong)
if command -v openssl >/dev/null 2>&1; then
  CLIENT_SUBJECT=$(openssl x509 -in "${CLIENT_CRT}" -noout -subject 2>/dev/null || echo "")
  EXPECTED_CN="${PROJECT_NAME}-${ENVIRONMENT}-vpn-client"
  if ! echo "${CLIENT_SUBJECT}" | grep -q "${EXPECTED_CN}"; then
    echo "ERROR: client.crt in ${CERT_DIR} does not match environment '${ENVIRONMENT}'."
    echo "  Certificate subject: ${CLIENT_SUBJECT}"
    echo "  Expected CN containing: ${EXPECTED_CN}"
    echo "Run: ./setup-vpn-certs.sh -e ${ENVIRONMENT}"
    echo "Then re-run this script with --cert-dir /tmp/${PROJECT_NAME}-${ENVIRONMENT}-vpn-certs"
    exit 1
  fi
fi

aws ec2 export-client-vpn-client-configuration \
  --client-vpn-endpoint-id "${ENDPOINT_ID}" \
  --region "${AWS_REGION}" \
  --output text > "${OUTPUT_FILE}.base"

# VPC route + DNS so split-tunnel clients can reach private RDS (10.0.x.x)
VPC_DNS="${VPC_DNS:-10.0.0.2}"
VPC_ROUTE_CIDR="${VPC_ROUTE_CIDR:-10.0.0.0/22}"
# OpenVPN route netmask for /22
VPC_ROUTE_NETMASK="255.255.252.0"

{
  cat "${OUTPUT_FILE}.base"
  echo ""
  echo "dhcp-option DNS ${VPC_DNS}"
  echo "route ${VPC_ROUTE_CIDR%%/*} ${VPC_ROUTE_NETMASK}"
  echo ""
  echo "<cert>"
  cat "${CLIENT_CRT}"
  echo "</cert>"
  echo "<key>"
  cat "${CLIENT_KEY}"
  echo "</key>"
} > "${OUTPUT_FILE}"

rm -f "${OUTPUT_FILE}.base"

echo "VPN client configuration written to: ${OUTPUT_FILE}"
echo ""
echo "Connect with OpenVPN or AWS VPN Client:"
echo "  openvpn --config ${OUTPUT_FILE}"
echo "  # or import ${OUTPUT_FILE} into AWS VPN Client (macOS/Windows)"
