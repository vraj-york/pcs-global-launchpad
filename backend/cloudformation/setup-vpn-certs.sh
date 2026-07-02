#!/bin/bash
# Generate self-signed CA/server/client certificates and import them into ACM
# for AWS Client VPN mutual TLS authentication.
#
# Usage:
#   ./setup-vpn-certs.sh [-e dev] [--region us-east-1]
#
# Outputs ARNs to copy into VPN stack deployment or export as env vars:
#   VPN_SERVER_CERT_ARN, VPN_CLIENT_CA_CERT_ARN

set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CERT_DIR="${CERT_DIR:-/tmp/${PROJECT_NAME}-${ENVIRONMENT}-vpn-certs}"

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
    -h|--help)
      echo "Usage: $0 [-e|--env <dev|staging|uat|prod>] [--region <aws-region>]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

CERT_DIR="/tmp/${PROJECT_NAME}-${ENVIRONMENT}-vpn-certs"
SERVER_COMMON_NAME="${PROJECT_NAME}-${ENVIRONMENT}-vpn.${AWS_REGION}.amazonaws.com"

echo "Generating VPN certificates in ${CERT_DIR}..."
mkdir -p "${CERT_DIR}"
cd "${CERT_DIR}"

if [ ! -f ca.key ]; then
  openssl genrsa -out ca.key 2048
  openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
    -subj "/CN=${PROJECT_NAME}-${ENVIRONMENT}-vpn-ca" \
    -out ca.crt
fi

if [ ! -f server.key ]; then
  openssl genrsa -out server.key 2048
  openssl req -new -key server.key \
    -subj "/CN=${SERVER_COMMON_NAME}" \
    -out server.csr

  cat > server.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${SERVER_COMMON_NAME}
DNS.2 = *.${AWS_REGION}.clientvpn.amazonaws.com
EOF

  openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out server.crt -days 825 -sha256 -extfile server.ext
fi

if [ ! -f client.key ]; then
  openssl genrsa -out client.key 2048
  openssl req -new -key client.key \
    -subj "/CN=${PROJECT_NAME}-${ENVIRONMENT}-vpn-client" \
    -out client.csr

  cat > client.ext <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature
extendedKeyUsage = clientAuth
EOF

  openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out client.crt -days 825 -sha256 -extfile client.ext
fi

echo "Importing certificates into ACM (${AWS_REGION})..."

SERVER_CERT_ARN=$(aws acm import-certificate \
  --region "${AWS_REGION}" \
  --certificate fileb://server.crt \
  --private-key fileb://server.key \
  --certificate-chain fileb://ca.crt \
  --query CertificateArn \
  --output text)

CLIENT_CA_CERT_ARN=$(aws acm import-certificate \
  --region "${AWS_REGION}" \
  --certificate fileb://ca.crt \
  --private-key fileb://ca.key \
  --query CertificateArn \
  --output text)

echo ""
echo "Certificates generated and imported successfully."
echo ""
echo "Server certificate ARN:"
echo "  ${SERVER_CERT_ARN}"
echo ""
echo "Client root CA certificate ARN:"
echo "  ${CLIENT_CA_CERT_ARN}"
echo ""
echo "Client certificate files (keep client.key private):"
echo "  ${CERT_DIR}/client.crt"
echo "  ${CERT_DIR}/client.key"
echo ""
echo "Deploy Client VPN stack with:"
echo "  VPN_SERVER_CERT_ARN=${SERVER_CERT_ARN} \\"
echo "  VPN_CLIENT_CA_CERT_ARN=${CLIENT_CA_CERT_ARN} \\"
echo "  ./deploy.sh -e ${ENVIRONMENT}"
echo ""
echo "Or manually:"
echo "  aws cloudformation deploy \\"
echo "    --template-file 09b-client-vpn.yaml \\"
echo "    --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-client-vpn \\"
echo "    --parameter-overrides ProjectName=${PROJECT_NAME} Environment=${ENVIRONMENT} \\"
echo "      ServerCertificateArn=${SERVER_CERT_ARN} \\"
echo "      ClientRootCertificateChainArn=${CLIENT_CA_CERT_ARN} \\"
echo "    --region ${AWS_REGION}"
