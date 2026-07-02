#!/bin/bash
# Run Prisma migrations via a one-off ECS Fargate task inside the VPC.
# Use this when RDS is private (not reachable from Bitbucket Pipelines runners).
#
# Usage:
#   ./run-migrations-ecs.sh [-e dev] [--region us-east-1]

set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
CLUSTER_NAME="${STACK_PREFIX}-cluster"
SERVICE_NAME="${STACK_PREFIX}-service"
CONTAINER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-container"
TASK_FAMILY="${STACK_PREFIX}-task"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    -e|--env)
      ENVIRONMENT="$2"
      STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
      CLUSTER_NAME="${STACK_PREFIX}-cluster"
      SERVICE_NAME="${STACK_PREFIX}-service"
      CONTAINER_NAME="${PROJECT_NAME}-${ENVIRONMENT}-container"
      TASK_FAMILY="${STACK_PREFIX}-task"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    -h|--help)
      sed -n '1,12p' "$0" | tail -n +2
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "Running Prisma migrations via ECS (private RDS)"
echo "  Cluster:  ${CLUSTER_NAME}"
echo "  Service:  ${SERVICE_NAME}"
echo "  Region:   ${AWS_REGION}"

SERVICE_JSON=$(aws ecs describe-services \
  --cluster "${CLUSTER_NAME}" \
  --services "${SERVICE_NAME}" \
  --region "${AWS_REGION}" \
  --query 'services[0]' \
  --output json)

TASK_DEF=$(echo "${SERVICE_JSON}" | jq -r '.taskDefinition // empty')
if [ -z "${TASK_DEF}" ] || [ "${TASK_DEF}" = "null" ]; then
  echo "ERROR: Could not resolve ECS task definition from service ${SERVICE_NAME}"
  exit 1
fi

SUBNETS=$(echo "${SERVICE_JSON}" | jq -r '[.networkConfiguration.awsvpcConfiguration.subnets[]] | join(",")')
SECURITY_GROUPS=$(echo "${SERVICE_JSON}" | jq -r '[.networkConfiguration.awsvpcConfiguration.securityGroups[]] | join(",")')
ASSIGN_PUBLIC_IP=$(echo "${SERVICE_JSON}" | jq -r '.networkConfiguration.awsvpcConfiguration.assignPublicIp // "DISABLED"')

if [ -z "${SUBNETS}" ] || [ -z "${SECURITY_GROUPS}" ]; then
  echo "ERROR: Could not read network configuration from ECS service"
  exit 1
fi

echo "Task definition: ${TASK_DEF}"
echo "Subnets:         ${SUBNETS}"
echo "Security groups: ${SECURITY_GROUPS}"

NETWORK_CONFIG="awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SECURITY_GROUPS}],assignPublicIp=${ASSIGN_PUBLIC_IP}}"

OVERRIDES=$(jq -n \
  --arg name "${CONTAINER_NAME}" \
  '{
    containerOverrides: [{
      name: $name,
      command: ["sh", "-c", "npx --yes prisma migrate deploy"]
    }]
  }')

echo "Starting migration task..."
TASK_ARN=$(aws ecs run-task \
  --cluster "${CLUSTER_NAME}" \
  --task-definition "${TASK_DEF}" \
  --launch-type FARGATE \
  --network-configuration "${NETWORK_CONFIG}" \
  --overrides "${OVERRIDES}" \
  --region "${AWS_REGION}" \
  --query 'tasks[0].taskArn' \
  --output text)

if [ -z "${TASK_ARN}" ] || [ "${TASK_ARN}" = "None" ]; then
  echo "ERROR: Failed to start migration ECS task"
  exit 1
fi

echo "Migration task: ${TASK_ARN}"
echo "Waiting for task to finish (may take 2-5 minutes)..."

aws ecs wait tasks-stopped \
  --cluster "${CLUSTER_NAME}" \
  --tasks "${TASK_ARN}" \
  --region "${AWS_REGION}"

TASK_JSON=$(aws ecs describe-tasks \
  --cluster "${CLUSTER_NAME}" \
  --tasks "${TASK_ARN}" \
  --region "${AWS_REGION}" \
  --query 'tasks[0]' \
  --output json)

STOP_CODE=$(echo "${TASK_JSON}" | jq -r '.stopCode // "unknown"')
EXIT_CODE=$(echo "${TASK_JSON}" | jq -r '.containers[0].exitCode // "null"')
REASON=$(echo "${TASK_JSON}" | jq -r '.stoppedReason // ""')
LOG_STREAM=$(echo "${TASK_JSON}" | jq -r '.containers[0].logStreamName // ""')

echo "Stop code:  ${STOP_CODE}"
echo "Exit code:  ${EXIT_CODE}"
if [ -n "${REASON}" ] && [ "${REASON}" != "null" ]; then
  echo "Reason:     ${REASON}"
fi
if [ -n "${LOG_STREAM}" ] && [ "${LOG_STREAM}" != "null" ]; then
  echo "Log stream: ${LOG_STREAM}"
fi

if [ "${EXIT_CODE}" != "0" ]; then
  echo ""
  echo "ERROR: Migration task failed. Check CloudWatch logs:"
  echo "  /ecs/${STACK_PREFIX}  stream: ${LOG_STREAM}"
  exit 1
fi

echo "Database migrations completed successfully via ECS."
