#!/bin/bash

# CloudFormation Deployment Script
# This script deploys all CloudFormation stacks in the correct order

set -e  # Exit on error

# Configuration
PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
# Allow specifying environment via CLI: -e|--env or as first positional argument
# Example: ./deploy.sh -e staging  OR  ./deploy.sh staging
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"

# Option to skip waiting for ECS stack (use create/update-stack instead of deploy)
NO_WAIT=false

# Parse CLI arguments
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --no-wait)
            NO_WAIT=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [-e|--env <dev|staging|prod>] [--no-wait]"
            echo ""
            echo "Options:"
            echo "  --no-wait    Skip waiting for ECS stack (deploy in background, useful when ECS hangs)"
            echo ""
            echo "CloudWatch alarms (optional):"
            echo "  ALARM_EMAIL=ops@example.com ./deploy.sh"
            echo "  CRITICAL_ALARM_EMAIL=oncall@example.com  (optional, defaults to ALARM_EMAIL)"
            echo "  RDS_ALLOCATED_STORAGE_GB=20              (optional, match RDS stack)"
            echo "  DATABASE_CONNECTION_THRESHOLD=68         (optional, ~80% of max_connections)"
            echo "  ECS_DESIRED_TASK_COUNT=2                 (optional, match ECS desired count)"
            echo "  ENABLE_HEALTH_CANARY=false               (optional, skip Section 1.1 health canary)"
            echo "  HEALTH_CHECK_URL=https://api.example.com/health  (optional, default ALB /health)"
            echo "  SCHEDULE_RATE_MINUTES=10                 (optional, 5–15 per client monitoring doc)"
            echo "  ENABLE_AUTH_FAILURE_ALARMS=false         (optional, skip Section 1.2 failed-login spike alarm)"
            echo ""
            echo "Login-flow synthetics canary (optional — Section 1.1):"
            echo "  ENABLE_LOGIN_CANARY=true ./deploy.sh"
            echo "  CANARY_LOGIN_EMAIL=canary@example.com    (required when login canary enabled)"
            echo "  CANARY_LOGIN_PASSWORD=...               (required; stored in SSM, not in template)"
            echo "  LOGIN_PAGE_URL=https://uat.bspblueprint.com/login  (optional, default https://<env>.bspblueprint.com/login)"
            exit 0
            ;;
        -*|--*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            # positional argument as environment
            if [[ -z "$ENVIRONMENT" || "$ENVIRONMENT" == "dev" ]]; then
                ENVIRONMENT="$1"
            fi
            shift
            ;;
    esac
done

STACK_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Email logo: use a public hosted URL only (email clients block base64/data URIs).
# Set to your CloudFront-hosted logo, e.g. EMAIL_LOGO_URL=https://d1234.cloudfront.net/logo-email.png
EMAIL_LOGO_URL="${EMAIL_LOGO_URL:-https://bsp-blueprint-${ENVIRONMENT}-frontend.s3.us-east-1.amazonaws.com/EmailHeader.png}"

# CloudWatch alarms — set ALARM_EMAIL (or NON_CRITICAL_ALARM_EMAIL) to deploy 12-cloudwatch-alarms.yaml
NON_CRITICAL_ALARM_EMAIL="${NON_CRITICAL_ALARM_EMAIL:-${ALARM_EMAIL:-}}"
CRITICAL_ALARM_EMAIL="${CRITICAL_ALARM_EMAIL:-}"
RDS_ALLOCATED_STORAGE_GB="${RDS_ALLOCATED_STORAGE_GB:-20}"
DATABASE_CONNECTION_THRESHOLD="${DATABASE_CONNECTION_THRESHOLD:-68}"
ECS_DESIRED_TASK_COUNT="${ECS_DESIRED_TASK_COUNT:-2}"

# Health-check synthetics canary (Section 1.1) — deploys with alarms unless ENABLE_HEALTH_CANARY=false
ENABLE_HEALTH_CANARY="${ENABLE_HEALTH_CANARY:-true}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-}"
HEALTH_CHECK_USE_HTTPS="${HEALTH_CHECK_USE_HTTPS:-true}"
SCHEDULE_RATE_MINUTES="${SCHEDULE_RATE_MINUTES:-10}"

# Log-based auth failure alarm (Section 1.2) — deploys with alarms unless disabled
ENABLE_AUTH_FAILURE_ALARMS="${ENABLE_AUTH_FAILURE_ALARMS:-true}"
AUTH_FAILURE_THRESHOLD="${AUTH_FAILURE_THRESHOLD:-10}"

# Login-flow synthetics canary (Section 1.1) — opt-in; requires canary SuperAdmin credentials
ENABLE_LOGIN_CANARY="${ENABLE_LOGIN_CANARY:-false}"
LOGIN_PAGE_URL="${LOGIN_PAGE_URL:-}"
CANARY_LOGIN_EMAIL="${CANARY_LOGIN_EMAIL:-}"
CANARY_LOGIN_PASSWORD="${CANARY_LOGIN_PASSWORD:-}"
DASHBOARD_PATH="${DASHBOARD_PATH:-/dashboard}"

# Function to deploy a stack
deploy_stack() {
    local stack_name=$1
    local template_file=$2
    local parameters=$3

    print_info "Deploying stack: ${stack_name}"

    if [ -z "$parameters" ]; then
        aws cloudformation deploy \
            --template-file "$template_file" \
            --stack-name "$stack_name" \
            --region "$AWS_REGION" \
            --capabilities CAPABILITY_NAMED_IAM \
            --no-fail-on-empty-changeset \
            --parameter-overrides \
                ProjectName="$PROJECT_NAME" \
                Environment="$ENVIRONMENT"
    else
        aws cloudformation deploy \
            --template-file "$template_file" \
            --stack-name "$stack_name" \
            --region "$AWS_REGION" \
            --capabilities CAPABILITY_NAMED_IAM \
            --no-fail-on-empty-changeset \
            --parameter-overrides \
                ProjectName="$PROJECT_NAME" \
                Environment="$ENVIRONMENT" \
                $parameters
    fi

    if [ $? -eq 0 ]; then
        print_info "Stack ${stack_name} deployed successfully"
    else
        print_error "Failed to deploy stack ${stack_name}"
        exit 1
    fi
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

print_info "Starting CloudFormation deployment..."
print_info "Project: ${PROJECT_NAME}"
print_info "Environment: ${ENVIRONMENT}"
print_info "Region: ${AWS_REGION}"

# Deploy stacks in order
print_info "Step 1/17: Deploying VPC and Networking..."
deploy_stack "${STACK_PREFIX}-vpc" "01-vpc-network.yaml"

print_info "Step 2/17: Deploying Client VPN (required for private RDS access)..."
if [ -z "${VPN_SERVER_CERT_ARN:-}" ] || [ -z "${VPN_CLIENT_CA_CERT_ARN:-}" ]; then
    print_warn "VPN certificate ARNs not set. Generate them first:"
    print_warn "  cd backend/cloudformation && ./setup-vpn-certs.sh -e ${ENVIRONMENT}"
    print_warn "Then re-run deploy with VPN_SERVER_CERT_ARN and VPN_CLIENT_CA_CERT_ARN exported."
    exit 1
fi

deploy_stack "${STACK_PREFIX}-client-vpn" "09b-client-vpn.yaml" \
    "ServerCertificateArn=${VPN_SERVER_CERT_ARN} ClientRootCertificateChainArn=${VPN_CLIENT_CA_CERT_ARN}"

print_info "Step 3/17: Deploying S3 Buckets..."
deploy_stack "${STACK_PREFIX}-s3" "02-s3-buckets.yaml"

print_info "Step 4/17: Deploying ECR Repository..."
deploy_stack "${STACK_PREFIX}-ecr" "03-ecr-repository.yaml"

print_info "Step 5/17: Deploying Cognito User Pool..."
DOMAIN_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
deploy_stack "${STACK_PREFIX}-cognito" "04-cognito.yaml" "DomainPrefix=${DOMAIN_PREFIX}"

print_info "Step 6/17: Deploying Cognito Custom Email Sender Lambda..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-cognito" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")

# Fetch Cognito App Client IDs (regular and remember-me)
COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-cognito" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")

COGNITO_CLIENT_REMEMBER_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-cognito" \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientRememberMeId'].OutputValue" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")

if [ -n "$COGNITO_CLIENT_ID" ] && [ "$COGNITO_CLIENT_ID" != "None" ]; then
    print_info "Found Cognito Client ID: $COGNITO_CLIENT_ID"
    export VITE_AWS_USER_POOL_CLIENT_ID="$COGNITO_CLIENT_ID"
fi

if [ -n "$COGNITO_CLIENT_REMEMBER_ID" ] && [ "$COGNITO_CLIENT_REMEMBER_ID" != "None" ]; then
    print_info "Found Cognito Remember-Me Client ID: $COGNITO_CLIENT_REMEMBER_ID"
    export VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER="$COGNITO_CLIENT_REMEMBER_ID"
fi

if [ -n "$USER_POOL_ID" ] && [ "$USER_POOL_ID" != "None" ]; then
    print_info "Found User Pool ID: $USER_POOL_ID"
    SES_SENDER_EMAIL="${SES_SENDER_EMAIL:-notifications@bspblueprint.com}"
    
    # Deploy CloudFormation stack
    LAMBDA_PARAMS="UserPoolId=${USER_POOL_ID} SenderEmail=${SES_SENDER_EMAIL}"
    if [ -n "$EMAIL_LOGO_URL" ]; then
        LAMBDA_PARAMS="${LAMBDA_PARAMS} LogoUrl=${EMAIL_LOGO_URL}"
        print_info "Using Logo URL: $EMAIL_LOGO_URL"
    fi
    deploy_stack "${STACK_PREFIX}-cognito-lambda" "04-cognito-lambda.yaml" "$LAMBDA_PARAMS"
    
    # Get Lambda function name and deploy actual code
    LAMBDA_NAME=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-cognito-lambda" \
        --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionName'].OutputValue" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    
    if [ -n "$LAMBDA_NAME" ] && [ "$LAMBDA_NAME" != "None" ]; then
        LAMBDA_CODE_DIR="${SCRIPT_DIR}/lambda/custom-email-sender"
        if [ -d "$LAMBDA_CODE_DIR" ]; then
            print_info "Installing Lambda dependencies..."
            (cd "$LAMBDA_CODE_DIR" && npm install --omit=dev --silent)
            
            print_info "Deploying Lambda code from $LAMBDA_CODE_DIR..."
            LAMBDA_ZIP="/tmp/${STACK_PREFIX}-custom-email-sender.zip"
            rm -f "$LAMBDA_ZIP"
            (cd "$LAMBDA_CODE_DIR" && zip -rq "$LAMBDA_ZIP" .)
            
            # Update environment variables first
            KMS_KEY_ARN_VAL=$(aws cloudformation describe-stacks \
                --stack-name "${STACK_PREFIX}-cognito-lambda" \
                --query "Stacks[0].Outputs[?OutputKey=='KmsKeyArn'].OutputValue" \
                --output text \
                --region "$AWS_REGION" 2>/dev/null || echo "")
            
            if [ -n "$KMS_KEY_ARN_VAL" ] && [ "$KMS_KEY_ARN_VAL" != "None" ]; then
                LAMBDA_ENV_VARS="SES_SENDER_EMAIL=${SES_SENDER_EMAIL},KMS_KEY_ARN=${KMS_KEY_ARN_VAL}"
                if [ -n "$EMAIL_LOGO_URL" ]; then
                    LAMBDA_ENV_VARS="${LAMBDA_ENV_VARS},LOGO_URL=${EMAIL_LOGO_URL}"
                fi
                aws lambda update-function-configuration \
                    --function-name "$LAMBDA_NAME" \
                    --environment "Variables={${LAMBDA_ENV_VARS}}" \
                    --region "$AWS_REGION" > /dev/null 2>&1 || true
                sleep 5
            fi
            
            set +e
            aws lambda update-function-code \
                --function-name "$LAMBDA_NAME" \
                --zip-file "fileb://$LAMBDA_ZIP" \
                --region "$AWS_REGION" > /dev/null 2>&1
            if [ $? -eq 0 ]; then
                print_info "✅ Lambda code deployed successfully"
            else
                print_warn "⚠️  Failed to deploy Lambda code"
            fi
            set -e
            rm -f "$LAMBDA_ZIP"
        fi
    fi
    
    # Attach Lambda to Cognito User Pool
    LAMBDA_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-cognito-lambda" \
        --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    
    KMS_KEY_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-cognito-lambda" \
        --query "Stacks[0].Outputs[?OutputKey=='KmsKeyArn'].OutputValue" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    
    if [ -n "$LAMBDA_ARN" ] && [ "$LAMBDA_ARN" != "None" ] && [ -n "$KMS_KEY_ARN" ] && [ "$KMS_KEY_ARN" != "None" ]; then
        print_info "Attaching CustomEmailSender to Cognito User Pool..."

        # NOTE: aws cognito-idp update-user-pool RESETS any field that is not
        # explicitly passed back to its default value. In particular, omitting
        # --admin-create-user-config flips AllowAdminCreateUserOnly back to
        # false, which re-enables Self-service sign-up. To avoid that, we
        # describe the current pool and re-send all existing settings while
        # patching in the new LambdaConfig. We also force
        # AllowAdminCreateUserOnly=true to correct any previous drift caused
        # by earlier versions of this script.
        set +e
        CURRENT_POOL_JSON=$(aws cognito-idp describe-user-pool \
            --user-pool-id "$USER_POOL_ID" \
            --region "$AWS_REGION" \
            --output json 2>/dev/null)
        DESCRIBE_EXIT_CODE=$?
        set -e

        if [ $DESCRIBE_EXIT_CODE -ne 0 ] || [ -z "$CURRENT_POOL_JSON" ]; then
            print_warn "⚠️  Failed to describe current user pool; skipping CustomEmailSender attach to avoid resetting pool settings"
        else
            UPDATE_JSON=$(echo "$CURRENT_POOL_JSON" | jq \
                --arg userPoolId "$USER_POOL_ID" \
                --arg lambdaArn "$LAMBDA_ARN" \
                --arg kmsKeyId "$KMS_KEY_ARN" \
                '{
                    UserPoolId: $userPoolId,
                    Policies: .UserPool.Policies,
                    DeletionProtection: .UserPool.DeletionProtection,
                    LambdaConfig: ((.UserPool.LambdaConfig // {}) + {
                        CustomEmailSender: {
                            LambdaVersion: "V1_0",
                            LambdaArn: $lambdaArn
                        },
                        KMSKeyID: $kmsKeyId
                    }),
                    AutoVerifiedAttributes: .UserPool.AutoVerifiedAttributes,
                    SmsVerificationMessage: .UserPool.SmsVerificationMessage,
                    EmailVerificationMessage: .UserPool.EmailVerificationMessage,
                    EmailVerificationSubject: .UserPool.EmailVerificationSubject,
                    VerificationMessageTemplate: .UserPool.VerificationMessageTemplate,
                    SmsAuthenticationMessage: .UserPool.SmsAuthenticationMessage,
                    UserAttributeUpdateSettings: .UserPool.UserAttributeUpdateSettings,
                    MfaConfiguration: .UserPool.MfaConfiguration,
                    DeviceConfiguration: .UserPool.DeviceConfiguration,
                    EmailConfiguration: .UserPool.EmailConfiguration,
                    SmsConfiguration: .UserPool.SmsConfiguration,
                    UserPoolTags: .UserPool.UserPoolTags,
                    AdminCreateUserConfig: (((.UserPool.AdminCreateUserConfig // {}) + {AllowAdminCreateUserOnly: true}) | with_entries(select(.value != null))),
                    UserPoolAddOns: .UserPool.UserPoolAddOns,
                    AccountRecoverySetting: .UserPool.AccountRecoverySetting
                } | with_entries(select(.value != null))')

            UPDATE_TMP=$(mktemp -t cognito-update.XXXXXX.json)
            ERR_TMP=$(mktemp -t cognito-update-err.XXXXXX.log)
            printf '%s' "$UPDATE_JSON" > "$UPDATE_TMP"

            set +e
            aws cognito-idp update-user-pool \
                --cli-input-json "file://$UPDATE_TMP" \
                --region "$AWS_REGION" > /dev/null 2> "$ERR_TMP"
            UPDATE_EXIT_CODE=$?
            set -e

            if [ $UPDATE_EXIT_CODE -eq 0 ]; then
                print_info "✅ CustomEmailSender attached to Cognito (existing settings preserved, AllowAdminCreateUserOnly=true enforced)"
                rm -f "$UPDATE_TMP" "$ERR_TMP"
            else
                print_error "❌ Failed to attach CustomEmailSender. AWS error:"
                cat "$ERR_TMP"
                print_warn "   Update payload saved at: $UPDATE_TMP"
                print_warn "   Stderr saved at: $ERR_TMP"
            fi
        fi
    fi
else
    print_warn "⚠️  Could not get User Pool ID. Skipping Lambda deployment."
fi

print_info "Step 7/17: Deploying Single RDS PostgreSQL (private subnets, VPN access only)..."

print_info "Fetching DB Secret ARN..."

DB_SECRET_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-db-credentials" \
    --query "Stacks[0].Outputs[?OutputKey=='SecretArn'].OutputValue" \
    --output text \
    --region "$AWS_REGION" 2>/dev/null)

if [ -z "$DB_SECRET_ARN" ] || [ "$DB_SECRET_ARN" == "None" ]; then
    print_error "❌ Could not retrieve DB Secret ARN"
    print_error "   Make sure ${STACK_PREFIX}-db-credentials stack is deployed"
    exit 1
fi

print_info "Fetching DB credentials from Secrets Manager..."

SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "$DB_SECRET_ARN" \
    --query SecretString \
    --output text \
    --region "$AWS_REGION")

DB_USERNAME=$(echo "$SECRET_JSON" | jq -r '.username')
DB_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.password')

if [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ]; then
    print_error "❌ Failed to parse DB credentials from secret"
    exit 1
fi

print_info "DB credentials fetched securely"

deploy_stack "${STACK_PREFIX}-rds" "09-single-rds-postgres.yaml" \
"MasterUsername=${DB_USERNAME} MasterUserPassword=${DB_PASSWORD}"

# print_info "Step 6/15: Deploying Single RDS PostgreSQL..."
# # Check if database credentials are provided via environment variables
# if [ -z "$DB_USERNAME" ]; then
#     DB_USERNAME="${DB_USERNAME:-postgres}"
#     read -p "Enter database master username (default: postgres): " DB_USERNAME_INPUT
#     DB_USERNAME=${DB_USERNAME_INPUT:-$DB_USERNAME}
# fi

# if [ -z "$DB_PASSWORD" ]; then
#     read -sp "Enter database master password (min 8 chars): " DB_PASSWORD
#     echo ""
#     if [ -z "$DB_PASSWORD" ]; then
#         print_error "Database password is required"
#         print_error "   Set DB_PASSWORD environment variable or provide it when prompted"
#         exit 1
#     fi
# fi

# if [ "$ENVIRONMENT" = "dev" ] || [ "$ENVIRONMENT" = "staging" ]; then
#     # Use a POSIX-safe uppercase conversion to support macOS / older bash versions
#     UPPER_ENV=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
#     print_warn "⚠️  ${UPPER_ENV} environment: Aurora cluster will be PUBLICLY ACCESSIBLE"
#     print_warn "   This allows direct database access from the internet for development / staging purposes"
#     print_warn "   Production environments will use private subnets (not publicly accessible)"
# fi

# print_warn "⚠️  For production, consider using AWS Secrets Manager instead of plain text passwords"
# deploy_stack "${STACK_PREFIX}-aurora" "09-aurora-postgres.yaml" "MasterUsername=${DB_USERNAME} MasterUserPassword=${DB_PASSWORD}"

print_info "Step 8/17: Deploying Application Load Balancer (MUST be before ECS)..."
deploy_stack "${STACK_PREFIX}-alb" "06-alb.yaml"

print_info "Step 9/17: Building and pushing Docker image to ECR..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUSH_SCRIPT="${SCRIPT_DIR}/push-docker-image.sh"

if [ -f "$PUSH_SCRIPT" ]; then
    chmod +x "$PUSH_SCRIPT"
    # Export important variables so the child script inherits the chosen environment
    export ENVIRONMENT PROJECT_NAME AWS_REGION DB_USERNAME DB_PASSWORD

    # Temporarily disable set -e to allow push script to fail without stopping deployment
    set +e
    "$PUSH_SCRIPT"
    PUSH_EXIT_CODE=$?
    set -e

    if [ $PUSH_EXIT_CODE -eq 0 ]; then
        print_info "✅ Docker image pushed successfully"
    else
        print_warn "⚠️  Docker image push failed or skipped (exit code: $PUSH_EXIT_CODE)"
        print_warn "   ECS deployment may fail if image doesn't exist in ECR"
        print_warn "   You can push the image manually later with: ./push-docker-image.sh"
    fi
else
    print_warn "⚠️  push-docker-image.sh not found at $PUSH_SCRIPT"
    print_warn "   Skipping Docker image push"
    print_warn "   ECS deployment may fail if image doesn't exist in ECR"
fi

print_info "Step 10/17: Deploying ECS Fargate..."
# Get database credentials for ECS task definition
DB_HOST=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-rds" \
    --query "Stacks[0].Outputs[?OutputKey=='RDSInstanceEndpoint'].OutputValue" \
    --output text 2>/dev/null || echo "")

DB_PORT=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-rds" \
    --query "Stacks[0].Outputs[?OutputKey=='RDSInstancePort'].OutputValue" \
    --output text 2>/dev/null || echo "5432")

DB_NAME=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-rds" \
    --query "Stacks[0].Outputs[?OutputKey=='DatabaseName'].OutputValue" \
    --output text 2>/dev/null || echo "")

ECS_PARAMS=""
if [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ]; then
    ECS_PARAMS="DatabaseHost=${DB_HOST} DatabasePort=${DB_PORT} DatabaseName=${DB_NAME} DatabaseUsername=${DB_USERNAME} DatabasePassword=${DB_PASSWORD}"
    if [ -n "$EMAIL_LOGO_URL" ]; then
        ECS_PARAMS="${ECS_PARAMS} EmailLogoUrl=${EMAIL_LOGO_URL}"
        print_info "Using Email Logo URL for ECS: $EMAIL_LOGO_URL"
    fi
else
    print_warn "⚠️  Could not get database information from RDS stack"
    print_warn "   Deploying ECS with minimal parameters - update manually if needed"
    if [ -n "$EMAIL_LOGO_URL" ]; then
        ECS_PARAMS="EmailLogoUrl=${EMAIL_LOGO_URL}"
    else
        ECS_PARAMS=""
    fi
fi

if [ "$NO_WAIT" = true ]; then
    print_warn "Using --no-wait: ECS stack will deploy in background (no blocking wait)"
    SCRIPT_DIR_CF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    TEMPLATE_FILE="${SCRIPT_DIR_CF}/05-ecs-fargate.yaml"

    if aws cloudformation describe-stacks --stack-name "${STACK_PREFIX}-ecs" --region "$AWS_REGION" &>/dev/null; then
        print_info "Updating existing ECS stack (no wait)..."
        aws cloudformation update-stack \
            --template-body "file://${TEMPLATE_FILE}" \
            --stack-name "${STACK_PREFIX}-ecs" \
            --region "$AWS_REGION" \
            --capabilities CAPABILITY_NAMED_IAM \
            --parameters \
                ParameterKey=ProjectName,ParameterValue="$PROJECT_NAME" \
                ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
                ParameterKey=DatabaseHost,ParameterValue="${DB_HOST:-}" \
                ParameterKey=DatabasePort,ParameterValue="${DB_PORT:-5432}" \
                ParameterKey=DatabaseName,ParameterValue="${DB_NAME:-}" \
                ParameterKey=DatabaseUsername,ParameterValue="${DB_USERNAME:-}" \
                ParameterKey=DatabasePassword,ParameterValue="${DB_PASSWORD:-}" \
            2>/dev/null || true
    else
        print_info "Creating ECS stack (no wait)..."
        aws cloudformation create-stack \
            --template-body "file://${TEMPLATE_FILE}" \
            --stack-name "${STACK_PREFIX}-ecs" \
            --region "$AWS_REGION" \
            --capabilities CAPABILITY_NAMED_IAM \
            --parameters \
                ParameterKey=ProjectName,ParameterValue="$PROJECT_NAME" \
                ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
                ParameterKey=DatabaseHost,ParameterValue="${DB_HOST:-}" \
                ParameterKey=DatabasePort,ParameterValue="${DB_PORT:-5432}" \
                ParameterKey=DatabaseName,ParameterValue="${DB_NAME:-}" \
                ParameterKey=DatabaseUsername,ParameterValue="${DB_USERNAME:-}" \
                ParameterKey=DatabasePassword,ParameterValue="${DB_PASSWORD:-}"
    fi
    print_info "✅ ECS stack deployment submitted (running in background)"
    TARGET_GROUP_ARN=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-alb" \
        --query "Stacks[0].Outputs[?OutputKey=='ECSTargetGroupArn'].OutputValue" \
        --output text 2>/dev/null || echo "")
    print_warn "Step 10 (LoadBalancers) will be skipped - run manually after ECS is ready:"
    if [ -n "$TARGET_GROUP_ARN" ] && [ "$TARGET_GROUP_ARN" != "None" ]; then
        print_info "  aws ecs update-service --cluster ${STACK_PREFIX}-cluster --service ${STACK_PREFIX}-service \\"
        print_info "    --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=${PROJECT_NAME}-${ENVIRONMENT}-container,containerPort=3000 \\"
        print_info "    --region $AWS_REGION"
    else
        print_info "  (Get Target Group ARN from ALB stack outputs first)"
    fi
else
    if [ -n "$ECS_PARAMS" ]; then
        deploy_stack "${STACK_PREFIX}-ecs" "05-ecs-fargate.yaml" "$ECS_PARAMS"
    else
        print_warn "⚠️  Could not get database information from RDS stack"
        print_warn "   Deploying ECS without database credentials - update manually if needed"
        deploy_stack "${STACK_PREFIX}-ecs" "05-ecs-fargate.yaml"
    fi
fi

if [ "$NO_WAIT" = false ]; then
print_info "Step 11/17: Updating ECS Service to add LoadBalancers..."
# Get Target Group ARN from ALB stack (Target Group was moved to ALB stack)
TARGET_GROUP_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-alb" \
    --query "Stacks[0].Outputs[?OutputKey=='ECSTargetGroupArn'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -n "$TARGET_GROUP_ARN" ] && [ "$TARGET_GROUP_ARN" != "None" ]; then
    print_info "Found Target Group ARN: $TARGET_GROUP_ARN"
    print_info "Updating ECS service to connect to ALB..."

    aws ecs update-service \
        --cluster "${STACK_PREFIX}-cluster" \
        --service "${STACK_PREFIX}-service" \
        --load-balancers targetGroupArn="$TARGET_GROUP_ARN",containerName="${PROJECT_NAME}-${ENVIRONMENT}-container",containerPort=3000 \
        --region "$AWS_REGION" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        print_info "✅ ECS service updated with LoadBalancers"
    else
        print_warn "⚠️  Failed to update ECS service with LoadBalancers."
        print_warn "   This may be because the service already has LoadBalancers configured."
        print_warn "   You can verify in the ECS Console or update manually if needed."
    fi
else
    print_warn "⚠️  Could not get Target Group ARN from ALB stack."
    print_warn "   Make sure the ALB stack is deployed and exports ECSTargetGroupArn."
    print_warn "   You can manually connect ECS to ALB by:"
    print_warn "   1. Get Target Group ARN from ALB stack outputs"
    print_warn "   2. Update ECS service with: aws ecs update-service --cluster <cluster> --service <service> --load-balancers targetGroupArn=<arn>,containerName=<name>,containerPort=3000"
fi
fi

print_info "Step 12/17: Deploying CloudWatch Alarms..."
if [ -z "$NON_CRITICAL_ALARM_EMAIL" ]; then
    print_warn "⚠️  ALARM_EMAIL not set — skipping CloudWatch alarms stack"
    print_warn "   Deploy later with:"
    print_warn "     ALARM_EMAIL=ops@example.com ./deploy.sh -e ${ENVIRONMENT}"
    print_warn "   Or manually:"
    print_warn "     aws cloudformation deploy --template-file 12-cloudwatch-alarms.yaml \\"
    print_warn "       --stack-name ${STACK_PREFIX}-alarms --region ${AWS_REGION} \\"
    print_warn "       --parameter-overrides ProjectName=${PROJECT_NAME} Environment=${ENVIRONMENT} \\"
    print_warn "       NonCriticalAlarmEmail=ops@example.com"
else
    # Prefer AllocatedStorage from the RDS stack when available
    RDS_STORAGE_FROM_STACK=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_PREFIX}-rds" \
        --query "Stacks[0].Parameters[?ParameterKey=='AllocatedStorage'].ParameterValue" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null || echo "")
    if [ -n "$RDS_STORAGE_FROM_STACK" ] && [ "$RDS_STORAGE_FROM_STACK" != "None" ]; then
        RDS_ALLOCATED_STORAGE_GB="$RDS_STORAGE_FROM_STACK"
        print_info "Using RDS AllocatedStorage from stack: ${RDS_ALLOCATED_STORAGE_GB} GB"
    fi

    # 15% and 5% of allocated storage in bytes (CloudFormation has no Fn::Multiply)
    RDS_FREE_STORAGE_WARNING_BYTES=$((RDS_ALLOCATED_STORAGE_GB * 161061274))
    RDS_FREE_STORAGE_CRITICAL_BYTES=$((RDS_ALLOCATED_STORAGE_GB * 53687091))

    ALARM_PARAMS="NonCriticalAlarmEmail=${NON_CRITICAL_ALARM_EMAIL}"
    ALARM_PARAMS="${ALARM_PARAMS} AllocatedStorageGB=${RDS_ALLOCATED_STORAGE_GB}"
    ALARM_PARAMS="${ALARM_PARAMS} RdsFreeStorageWarningThresholdBytes=${RDS_FREE_STORAGE_WARNING_BYTES}"
    ALARM_PARAMS="${ALARM_PARAMS} RdsFreeStorageCriticalThresholdBytes=${RDS_FREE_STORAGE_CRITICAL_BYTES}"
    ALARM_PARAMS="${ALARM_PARAMS} DatabaseConnectionThreshold=${DATABASE_CONNECTION_THRESHOLD}"
    ALARM_PARAMS="${ALARM_PARAMS} ECSDesiredTaskCount=${ECS_DESIRED_TASK_COUNT}"
    if [ -n "$CRITICAL_ALARM_EMAIL" ]; then
        ALARM_PARAMS="${ALARM_PARAMS} CriticalAlarmEmail=${CRITICAL_ALARM_EMAIL}"
    fi

    deploy_stack "${STACK_PREFIX}-alarms" "12-cloudwatch-alarms.yaml" "$ALARM_PARAMS"

    print_info "CloudWatch alarms deployed. Confirm SNS email subscriptions in your inbox:"
    print_info "  - Non-critical: ${NON_CRITICAL_ALARM_EMAIL}"
    if [ -n "$CRITICAL_ALARM_EMAIL" ]; then
        print_info "  - Critical: ${CRITICAL_ALARM_EMAIL}"
    else
        print_info "  - Critical: ${NON_CRITICAL_ALARM_EMAIL} (same as non-critical)"
    fi
    print_warn "   Alarms will not send notifications until SNS subscriptions are confirmed."
fi

print_info "Step 12b/17: Deploying Health Check Canary (CloudWatch Synthetics)..."
if [ "$ENABLE_HEALTH_CANARY" = "false" ]; then
    print_warn "⚠️  ENABLE_HEALTH_CANARY=false — skipping health-check canary"
elif [ -z "$NON_CRITICAL_ALARM_EMAIL" ]; then
    print_warn "⚠️  ALARM_EMAIL not set — skipping health-check canary (needs critical SNS topic from alarms stack)"
    print_warn "   Deploy later with:"
    print_warn "     ALARM_EMAIL=ops@example.com ./deploy-health-canary.sh -e ${ENVIRONMENT}"
else
    HEALTH_CANARY_ARGS=(-e "$ENVIRONMENT" --schedule "$SCHEDULE_RATE_MINUTES")
    if [ -n "$HEALTH_CHECK_URL" ]; then
        HEALTH_CANARY_ARGS+=(--url "$HEALTH_CHECK_URL")
    fi
    HEALTH_CHECK_USE_HTTPS="${HEALTH_CHECK_USE_HTTPS}" \
        "${SCRIPT_DIR}/deploy-health-canary.sh" "${HEALTH_CANARY_ARGS[@]}"
fi

print_info "Step 12c/17: Deploying Login Flow Canary (CloudWatch Synthetics)..."
if [ "$ENABLE_LOGIN_CANARY" != "true" ]; then
    print_warn "⚠️  ENABLE_LOGIN_CANARY not true — skipping login-flow canary"
    print_warn "   Deploy later with:"
    print_warn "     ENABLE_LOGIN_CANARY=true CANARY_LOGIN_EMAIL=canary@example.com CANARY_LOGIN_PASSWORD=... \\"
    print_warn "       LOGIN_PAGE_URL=https://${ENVIRONMENT}.bspblueprint.com/login ./deploy-login-canary.sh -e ${ENVIRONMENT}"
elif [ -z "$NON_CRITICAL_ALARM_EMAIL" ]; then
    print_warn "⚠️  ALARM_EMAIL not set — skipping login-flow canary (needs critical SNS topic from alarms stack)"
elif [ -z "$CANARY_LOGIN_EMAIL" ] || [ -z "$CANARY_LOGIN_PASSWORD" ]; then
    print_warn "⚠️  CANARY_LOGIN_EMAIL / CANARY_LOGIN_PASSWORD not set — skipping login-flow canary"
    print_warn "   Use a dedicated SuperAdmin with permanent password and no email MFA challenge."
else
    LOGIN_CANARY_ARGS=(-e "$ENVIRONMENT" --schedule "$SCHEDULE_RATE_MINUTES" \
        --email "$CANARY_LOGIN_EMAIL" --password "$CANARY_LOGIN_PASSWORD")
    if [ -n "$LOGIN_PAGE_URL" ]; then
        LOGIN_CANARY_ARGS+=(--url "$LOGIN_PAGE_URL")
    fi
    DASHBOARD_PATH="${DASHBOARD_PATH}" \
        "${SCRIPT_DIR}/deploy-login-canary.sh" "${LOGIN_CANARY_ARGS[@]}"
fi

print_info "Step 12d/17: Deploying Auth Failure Alarm (log-based metric filter)..."
if [ "$ENABLE_AUTH_FAILURE_ALARMS" = "false" ]; then
    print_warn "⚠️  ENABLE_AUTH_FAILURE_ALARMS=false — skipping failed-login spike alarm"
elif [ -z "$NON_CRITICAL_ALARM_EMAIL" ]; then
    print_warn "⚠️  ALARM_EMAIL not set — skipping auth-failure alarm (needs critical SNS topic from alarms stack)"
    print_warn "   Deploy later with:"
    print_warn "     ALARM_EMAIL=ops@example.com ./deploy-auth-failure-alarms.sh -e ${ENVIRONMENT}"
else
    AUTH_FAILURE_THRESHOLD="${AUTH_FAILURE_THRESHOLD}" \
        "${SCRIPT_DIR}/deploy-auth-failure-alarms.sh" -e "$ENVIRONMENT"
fi

print_info "Step 13/17: Deploying WAF..."
# Get ALB ARN for WAF association
ALB_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-alb" \
    --query "Stacks[0].Outputs[?OutputKey=='ALBArn'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -n "$ALB_ARN" ]; then
    deploy_stack "${STACK_PREFIX}-waf" "07-waf.yaml" "ALBArn=${ALB_ARN}"
else
    deploy_stack "${STACK_PREFIX}-waf" "07-waf.yaml"
fi

# Get WAF ARN for CloudFront association
WAF_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-waf" \
    --query "Stacks[0].Outputs[?OutputKey=='WebACLArn'].OutputValue" \
    --output text 2>/dev/null || echo "")

# Frontend Infrastructure
print_info "Step 14/17: Deploying Frontend S3 Bucket..."
deploy_stack "${STACK_PREFIX}-frontend-s3" "10-frontend-s3.yaml"

print_info "Step 15/17: Deploying Frontend CloudFront..."
# Get frontend bucket name and CloudFront logs bucket
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-frontend-s3" \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
    --output text 2>/dev/null || echo "")

CLOUDFRONT_LOGS_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_PREFIX}-s3" \
    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontLogsBucketName'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -z "$FRONTEND_BUCKET" ]; then
    print_error "Could not get Frontend bucket name. Skipping Frontend CloudFront deployment."
elif [ -z "$CLOUDFRONT_LOGS_BUCKET" ] || [ "$CLOUDFRONT_LOGS_BUCKET" = "None" ]; then
    print_error "Could not get CloudFront logs bucket name. Skipping Frontend CloudFront deployment."
    print_error "Make sure the S3 stack (${STACK_PREFIX}-s3) is deployed and exports CloudFrontLogsBucketName."
else
    print_warn "⚠️  CloudFront deployment typically takes 15-30 minutes"
    print_warn "   This is normal - CloudFront needs to propagate to edge locations globally"
    print_info "   You can monitor progress in the AWS Console or check status with:"
    print_info "   aws cloudformation describe-stacks --stack-name ${STACK_PREFIX}-frontend-cloudfront --region $AWS_REGION --query 'Stacks[0].StackStatus'"
    echo ""

    if [ -n "$WAF_ARN" ]; then
        deploy_stack "${STACK_PREFIX}-frontend-cloudfront" "11-frontend-cloudfront.yaml" \
            "FrontendBucketName=${FRONTEND_BUCKET} CloudFrontLogsBucket=${CLOUDFRONT_LOGS_BUCKET} WebACLArn=${WAF_ARN}"
    else
        deploy_stack "${STACK_PREFIX}-frontend-cloudfront" "11-frontend-cloudfront.yaml" \
            "FrontendBucketName=${FRONTEND_BUCKET} CloudFrontLogsBucket=${CLOUDFRONT_LOGS_BUCKET}"
    fi

    print_info "✅ CloudFront stack deployment initiated"
    print_info "   Distribution is being created and will be available in 15-30 minutes"
    print_info "   You can continue with other tasks while it deploys"
fi

print_info "Step 16/17: Frontend ECS (Optional - deploy manually if needed)..."
print_warn "Frontend ECS is optional. Deploy manually with:"
print_warn "  aws cloudformation deploy --template-file 12-frontend-ecs.yaml --stack-name ${STACK_PREFIX}-frontend-ecs \\"
print_warn "    --parameter-overrides ProjectName=${PROJECT_NAME} Environment=${ENVIRONMENT} \\"
print_warn "    ContainerImage=<ecr-uri> --region ${AWS_REGION}"

print_info "Step 17/17: Route 53 (Optional - requires domain name)..."
print_warn "Route 53 deployment requires a domain name. Deploy manually with:"
print_warn "  aws cloudformation deploy --template-file 09-route53.yaml --stack-name ${STACK_PREFIX}-route53 \\"
print_warn "    --parameter-overrides ProjectName=${PROJECT_NAME} Environment=${ENVIRONMENT} DomainName=yourdomain.com \\"
print_warn "    CloudFrontDistributionDomainName=<cloudfront-domain> --region ${AWS_REGION}"

print_info "Deployment completed!"

print_info ""
print_info "=========================================="
print_info "✅ Deployment completed successfully!"
print_info "=========================================="
print_info ""
print_info "Next steps:"
print_info "1. Download VPN client config and connect before accessing RDS:"
print_info "   cd backend/cloudformation"
print_info "   ./download-vpn-client-config.sh -e ${ENVIRONMENT}"
print_info ""
print_info "2. Configure email logo (optional but recommended):"
print_info "   - Create a PNG version of your logo (e.g., logo-email.png)"
print_info "   - Place it in frontend/public/ and deploy frontend"
print_info "   - Get CloudFront domain: aws cloudformation describe-stacks --stack-name ${STACK_PREFIX}-frontend-cloudfront --query \"Stacks[0].Outputs[?OutputKey=='FrontendCloudFrontDomainName'].OutputValue\" --output text"
print_info "   - Re-run with: EMAIL_LOGO_URL=https://<cloudfront-domain>/logo-email.png ./deploy.sh"
print_info ""
print_info "2. Configure SES for email sending (if not already done):"
print_info "   - Verify your sender email address in SES Console"
print_info "   - If in SES sandbox, verify recipient email addresses too"
print_info "   - To change sender: SES_SENDER_EMAIL=your@email.com ./deploy.sh"
print_info ""
print_info "3. Create SuperAdmin user:"
print_info "   cd backend/cloudformation"
print_info "   ./create-superadmin.sh"
print_info ""
print_info "4. Push your Docker image to ECR:"
print_info "   cd backend/cloudformation"
print_info "   ./push-docker-image.sh"
print_info ""
print_info "5. Force ECS to deploy new image (after pushing):"
print_info "   aws ecs update-service \\"
print_info "     --cluster ${STACK_PREFIX}-cluster \\"
print_info "     --service ${STACK_PREFIX}-service \\"
print_info "     --force-new-deployment \\"
print_info "     --region ${AWS_REGION}"
print_info ""
print_info "6. CloudWatch alarms (if ALARM_EMAIL was set):"
print_info "   - Confirm SNS subscription emails (non-critical and critical topics)"
print_info "   - View alarms: aws cloudwatch describe-alarms --alarm-name-prefix ${STACK_PREFIX} --region ${AWS_REGION}"
print_info "   - Re-deploy alarms only: ALARM_EMAIL=ops@example.com ./deploy.sh -e ${ENVIRONMENT}"
print_info "   - Health canary only: ALARM_EMAIL=ops@example.com ./deploy-health-canary.sh -e ${ENVIRONMENT}"
print_info "   - Auth failure alarm only: ALARM_EMAIL=ops@example.com ./deploy-auth-failure-alarms.sh -e ${ENVIRONMENT}"
print_info "   - Login canary only: ENABLE_LOGIN_CANARY=true CANARY_LOGIN_EMAIL=... CANARY_LOGIN_PASSWORD=... ./deploy-login-canary.sh -e ${ENVIRONMENT}"
print_info ""
print_info "7. Configure Route 53 with your domain name (optional)"
print_info "8. Set up SSL certificates in ACM if using HTTPS (optional)"

