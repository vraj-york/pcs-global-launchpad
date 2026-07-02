#!/bin/bash
# Deploy CloudWatch log-based auth failure alarm (Section 1.2 — Failed login spike).
# Requires ECS stack (log group /ecs/<project>-<env>) and alarms stack for SNS.

set -e

PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
AUTH_FAILURE_THRESHOLD="${AUTH_FAILURE_THRESHOLD:-10}"
AUTH_FAILURE_PERIOD_SECONDS="${AUTH_FAILURE_PERIOD_SECONDS:-300}"
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
    --threshold)
      AUTH_FAILURE_THRESHOLD="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [-e|--env dev|staging|uat|prod] [--threshold 10]"
      echo ""
      echo "Deploys 15-cloudwatch-log-auth-failure-alarms.yaml:"
      echo "  - Metric filter on /ecs/<project>-<env> for CognitoAuthGuard rejection logs"
      echo "  - Alarm: > 10 auth failures in 5 min → critical SNS topic"
      echo ""
      echo "Optional env:"
      echo "  AUTH_FAILURE_THRESHOLD=10"
      echo "  AUTH_FAILURE_PERIOD_SECONDS=300"
      echo "  CRITICAL_ALARM_TOPIC_ARN=arn:aws:sns:...  Override imported alarms topic"
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
LOG_GROUP="/ecs/${STACK_PREFIX}"

if ! aws logs describe-log-groups \
  --log-group-name-prefix "$LOG_GROUP" \
  --query "logGroups[?logGroupName=='${LOG_GROUP}'].logGroupName" \
  --output text \
  --region "$AWS_REGION" 2>/dev/null | grep -q "$LOG_GROUP"; then
  print_error "ECS log group ${LOG_GROUP} not found. Deploy 05-ecs-fargate.yaml first."
  exit 1
fi

ALARM_PARAMS="AuthFailureThreshold=${AUTH_FAILURE_THRESHOLD} AuthFailurePeriodSeconds=${AUTH_FAILURE_PERIOD_SECONDS}"
if [ -n "$CRITICAL_ALARM_TOPIC_ARN" ]; then
  ALARM_PARAMS="${ALARM_PARAMS} CriticalAlarmTopicArn=${CRITICAL_ALARM_TOPIC_ARN}"
else
  ALARMS_STACK="${STACK_PREFIX}-alarms"
  if ! aws cloudformation describe-stacks \
    --stack-name "$ALARMS_STACK" \
    --region "$AWS_REGION" >/dev/null 2>&1; then
    print_warn "Alarms stack ${ALARMS_STACK} not found — deploy 12-cloudwatch-alarms.yaml first,"
    print_warn "or pass CRITICAL_ALARM_TOPIC_ARN so failure notifications have an SNS target."
  fi
fi

print_info "Deploying auth-failure alarm stack: ${STACK_PREFIX}-auth-failure-alarms"
print_info "  Log group: ${LOG_GROUP}"
print_info "  Threshold: > ${AUTH_FAILURE_THRESHOLD} failures in $((AUTH_FAILURE_PERIOD_SECONDS / 60)) min"

aws cloudformation deploy \
  --template-file "${SCRIPT_DIR}/15-cloudwatch-log-auth-failure-alarms.yaml" \
  --stack-name "${STACK_PREFIX}-auth-failure-alarms" \
  --parameter-overrides \
    ProjectName="${PROJECT_NAME}" \
    Environment="${ENVIRONMENT}" \
    ${ALARM_PARAMS} \
  --region "$AWS_REGION"

print_info "Auth-failure alarm deployed."
print_info "  Alarm: ${STACK_PREFIX}-failed-login-spike"
