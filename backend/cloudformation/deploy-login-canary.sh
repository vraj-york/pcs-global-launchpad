#!/bin/bash
# Deploy CloudWatch Synthetics login-flow canary (Section 1.1 — item 1).
# Requires health-canary stack (shared S3 bucket) and a dedicated SuperAdmin test user.
# Credentials are stored in SSM Parameter Store (not in the template).

set -e

PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
SCHEDULE_RATE_MINUTES="${SCHEDULE_RATE_MINUTES:-10}"
LOGIN_PAGE_URL="${LOGIN_PAGE_URL:-}"
DASHBOARD_PATH="${DASHBOARD_PATH:-/dashboard}"
CANARY_LOGIN_EMAIL="${CANARY_LOGIN_EMAIL:-}"
CANARY_LOGIN_PASSWORD="${CANARY_LOGIN_PASSWORD:-}"
CANARY_ARTIFACTS_BUCKET="${CANARY_ARTIFACTS_BUCKET:-}"
CRITICAL_ALARM_TOPIC_ARN="${CRITICAL_ALARM_TOPIC_ARN:-}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -e|--env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --url)
      LOGIN_PAGE_URL="$2"
      shift 2
      ;;
    --email)
      CANARY_LOGIN_EMAIL="$2"
      shift 2
      ;;
    --password)
      CANARY_LOGIN_PASSWORD="$2"
      shift 2
      ;;
    --schedule)
      SCHEDULE_RATE_MINUTES="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 -e <env> --email <user> --password <pass> [--url https://host/login]"
      echo ""
      echo "Deploys 14-cloudwatch-synthetics-login-canary.yaml:"
      echo "  - Canary: login form → credentials → /dashboard"
      echo "  - Schedule: every 5–15 minutes (default 10)"
      echo "  - Alarm: any failure → critical SNS topic"
      echo ""
      echo "Required:"
      echo "  CANARY_LOGIN_EMAIL / --email     Dedicated SuperAdmin (no MFA / temp password)"
      echo "  CANARY_LOGIN_PASSWORD / --password"
      echo ""
      echo "Optional:"
      echo "  LOGIN_PAGE_URL=https://uat.bspblueprint.com/login  (default: https://<env>.bspblueprint.com/login)"
      echo "  DASHBOARD_PATH=/dashboard"
      echo "  SCHEDULE_RATE_MINUTES=10"
      exit 0
      ;;
    *)
      ENVIRONMENT="$1"
      shift
      ;;
  esac
done

STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSM_PREFIX="/${PROJECT_NAME}/${ENVIRONMENT}/canary"

if [ -z "$LOGIN_PAGE_URL" ]; then
  LOGIN_PAGE_URL="https://${ENVIRONMENT}.bspblueprint.com/login"
fi

if [ -z "$CANARY_LOGIN_EMAIL" ] || [ -z "$CANARY_LOGIN_PASSWORD" ]; then
  print_error "CANARY_LOGIN_EMAIL and CANARY_LOGIN_PASSWORD are required."
  print_error "Use a dedicated SuperAdmin with a permanent password and no email MFA challenge."
  exit 1
fi

if [ "$SCHEDULE_RATE_MINUTES" != "5" ] && [ "$SCHEDULE_RATE_MINUTES" != "10" ] && [ "$SCHEDULE_RATE_MINUTES" != "15" ]; then
  print_error "SCHEDULE_RATE_MINUTES must be 5, 10, or 15 (got ${SCHEDULE_RATE_MINUTES})."
  exit 1
fi

if [ -z "$CANARY_ARTIFACTS_BUCKET" ]; then
  CANARY_ARTIFACTS_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-health-canary" \
    --query "Stacks[0].Outputs[?OutputKey=='CanaryArtifactsBucketName'].OutputValue" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")
fi

if [ -z "$CANARY_ARTIFACTS_BUCKET" ] || [ "$CANARY_ARTIFACTS_BUCKET" = "None" ]; then
  print_error "Canary artifacts bucket not found. Deploy health canary first:"
  print_error "  ./deploy-health-canary.sh -e ${ENVIRONMENT}"
  print_error "Or set CANARY_ARTIFACTS_BUCKET explicitly."
  exit 1
fi

print_info "Storing canary credentials in SSM (${SSM_PREFIX}/login-*)..."
aws ssm put-parameter \
  --name "${SSM_PREFIX}/login-email" \
  --value "${CANARY_LOGIN_EMAIL}" \
  --type String \
  --overwrite \
  --region "$AWS_REGION" >/dev/null

aws ssm put-parameter \
  --name "${SSM_PREFIX}/login-password" \
  --value "${CANARY_LOGIN_PASSWORD}" \
  --type SecureString \
  --overwrite \
  --region "$AWS_REGION" >/dev/null

SCHEDULE_PERIOD_SECONDS=$((SCHEDULE_RATE_MINUTES * 60))
CANARY_PARAMS="LoginPageUrl=${LOGIN_PAGE_URL}"
CANARY_PARAMS="${CANARY_PARAMS} DashboardPath=${DASHBOARD_PATH}"
CANARY_PARAMS="${CANARY_PARAMS} SsmParameterPrefix=${SSM_PREFIX}"
CANARY_PARAMS="${CANARY_PARAMS} CanaryArtifactsBucketName=${CANARY_ARTIFACTS_BUCKET}"
CANARY_PARAMS="${CANARY_PARAMS} ScheduleRateMinutes=${SCHEDULE_RATE_MINUTES}"
CANARY_PARAMS="${CANARY_PARAMS} SchedulePeriodSeconds=${SCHEDULE_PERIOD_SECONDS}"

if [ -n "$CRITICAL_ALARM_TOPIC_ARN" ]; then
  CANARY_PARAMS="${CANARY_PARAMS} CriticalAlarmTopicArn=${CRITICAL_ALARM_TOPIC_ARN}"
else
  ALARMS_STACK="${STACK_PREFIX}-alarms"
  if ! aws cloudformation describe-stacks \
    --stack-name "$ALARMS_STACK" \
    --region "$AWS_REGION" >/dev/null 2>&1; then
    print_warn "Alarms stack ${ALARMS_STACK} not found — deploy 12-cloudwatch-alarms.yaml first,"
    print_warn "or pass CRITICAL_ALARM_TOPIC_ARN so failure notifications have an SNS target."
  fi
fi

print_info "Deploying login-flow canary stack: ${STACK_PREFIX}-login-canary"
print_info "  Login URL: ${LOGIN_PAGE_URL}"
print_info "  Dashboard: ${DASHBOARD_PATH}"
print_info "  User: ${CANARY_LOGIN_EMAIL}"
print_info "  Schedule: every ${SCHEDULE_RATE_MINUTES} minutes"

aws cloudformation deploy \
  --template-file "${SCRIPT_DIR}/14-cloudwatch-synthetics-login-canary.yaml" \
  --stack-name "${STACK_PREFIX}-login-canary" \
  --parameter-overrides \
    ProjectName="${PROJECT_NAME}" \
    Environment="${ENVIRONMENT}" \
    ${CANARY_PARAMS} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$AWS_REGION"

print_info "Login-flow canary deployed."
print_info "  View runs: AWS Console → CloudWatch → Synthetics → ${STACK_PREFIX}-login-flow"
print_info "  Alarm: ${STACK_PREFIX}-login-canary-failed"
print_warn "  Test user must be SuperAdmin with permanent password (no MFA / NEW_PASSWORD_REQUIRED)."
