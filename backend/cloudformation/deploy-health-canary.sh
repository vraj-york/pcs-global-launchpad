#!/bin/bash
# Deploy CloudWatch Synthetics health-check canary (Section 1.1 — item 3).
# Requires ALB stack; uses CriticalAlarmTopic from the alarms stack when present.

set -e

PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
SCHEDULE_RATE_MINUTES="${SCHEDULE_RATE_MINUTES:-10}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-}"
HEALTH_CHECK_USE_HTTPS="${HEALTH_CHECK_USE_HTTPS:-true}"
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
      HEALTH_CHECK_URL="$2"
      shift 2
      ;;
    --schedule)
      SCHEDULE_RATE_MINUTES="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [-e|--env dev|staging|uat|prod] [--url https://host/health] [--schedule 10]"
      echo ""
      echo "Deploys 13-cloudwatch-synthetics-health-canary.yaml:"
      echo "  - Canary: GET /health must return HTTP 200"
      echo "  - Schedule: every 5–15 minutes (default 10)"
      echo "  - Alarm: any canary failure → critical SNS topic"
      echo ""
      echo "Optional env:"
      echo "  HEALTH_CHECK_URL=https://api.example.com/health"
      echo "  HEALTH_CHECK_USE_HTTPS=false   Use http:// when building URL from ALB DNS"
      echo "  CRITICAL_ALARM_TOPIC_ARN=arn:aws:sns:...  Override imported alarms topic"
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

if [ -z "$HEALTH_CHECK_URL" ]; then
  ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-alb" \
    --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")

  if [ -z "$ALB_DNS" ] || [ "$ALB_DNS" = "None" ]; then
    print_error "ALB stack not found. Deploy 06-alb.yaml first, or set HEALTH_CHECK_URL."
    exit 1
  fi

  if [ "$HEALTH_CHECK_USE_HTTPS" = "true" ]; then
    HEALTH_CHECK_URL="https://${ALB_DNS}/health"
  else
    HEALTH_CHECK_URL="http://${ALB_DNS}/health"
  fi
fi

if [ "$SCHEDULE_RATE_MINUTES" != "5" ] && [ "$SCHEDULE_RATE_MINUTES" != "10" ] && [ "$SCHEDULE_RATE_MINUTES" != "15" ]; then
  print_error "SCHEDULE_RATE_MINUTES must be 5, 10, or 15 (got ${SCHEDULE_RATE_MINUTES})."
  exit 1
fi

CANARY_PARAMS="HealthCheckUrl=${HEALTH_CHECK_URL} ScheduleRateMinutes=${SCHEDULE_RATE_MINUTES}"
SCHEDULE_PERIOD_SECONDS=$((SCHEDULE_RATE_MINUTES * 60))
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

print_info "Deploying health-check canary stack: ${STACK_PREFIX}-health-canary"
print_info "  URL: ${HEALTH_CHECK_URL}"
print_info "  Schedule: every ${SCHEDULE_RATE_MINUTES} minutes"

aws cloudformation deploy \
  --template-file "${SCRIPT_DIR}/13-cloudwatch-synthetics-health-canary.yaml" \
  --stack-name "${STACK_PREFIX}-health-canary" \
  --parameter-overrides \
    ProjectName="${PROJECT_NAME}" \
    Environment="${ENVIRONMENT}" \
    ${CANARY_PARAMS} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region "$AWS_REGION"

print_info "Health-check canary deployed."
print_info "  View runs: AWS Console → CloudWatch → Synthetics canaries → ${STACK_PREFIX}-health-check"
print_info "  Alarm: ${STACK_PREFIX}-health-canary-failed"
