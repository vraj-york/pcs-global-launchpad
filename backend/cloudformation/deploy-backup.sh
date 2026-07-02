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
EMAIL_LOGO_URL="${EMAIL_LOGO_URL:-}"

# For dev environment provide a default logo so the custom email sender and password-reset have a visible logo
if [ "$ENVIRONMENT" = "dev" ] && [ -z "$EMAIL_LOGO_URL" ]; then
    EMAIL_LOGO_URL="http://d2a65w5pqq5lxj.cloudfront.net/BSPDark.png"
    print_info "Using default dev EMAIL_LOGO_URL: $EMAIL_LOGO_URL"
fi

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
print_info "Step 1/15: Deploying VPC and Networking..."
deploy_stack "${STACK_PREFIX}-vpc" "01-vpc-network.yaml"

print_info "Step 2/15: Deploying S3 Buckets..."
deploy_stack "${STACK_PREFIX}-s3" "02-s3-buckets.yaml"

print_info "Step 3/15: Deploying ECR Repository..."
deploy_stack "${STACK_PREFIX}-ecr" "03-ecr-repository.yaml"

print_info "Step 4/15: Deploying Cognito User Pool..."
DOMAIN_PREFIX="${PROJECT_NAME}-${ENVIRONMENT}"
deploy_stack "${STACK_PREFIX}-cognito" "04-cognito.yaml" "DomainPrefix=${DOMAIN_PREFIX}"

print_info "Step 5/15: Deploying Cognito Custom Email Sender Lambda..."
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
        LAMBDA_CONFIG="{\"CustomEmailSender\":{\"LambdaVersion\":\"V1_0\",\"LambdaArn\":\"$LAMBDA_ARN\"},\"KMSKeyID\":\"$KMS_KEY_ARN\"}"
        
        set +e
        aws cognito-idp update-user-pool \
            --user-pool-id "$USER_POOL_ID" \
            --lambda-config "$LAMBDA_CONFIG" \
            --region "$AWS_REGION" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            print_info "✅ CustomEmailSender attached to Cognito"
        else
            print_warn "⚠️  Failed to attach CustomEmailSender"
        fi
        set -e
    fi
else
    print_warn "⚠️  Could not get User Pool ID. Skipping Lambda deployment."
fi

print_info "Step 6/15: Deploying Single RDS PostgreSQL..."
# Check if database credentials are provided via environment variables
if [ -z "$DB_USERNAME" ]; then
    DB_USERNAME="${DB_USERNAME:-postgres}"
    read -p "Enter database master username (default: postgres): " DB_USERNAME_INPUT
    DB_USERNAME=${DB_USERNAME_INPUT:-$DB_USERNAME}
fi

if [ -z "$DB_PASSWORD" ]; then
    read -sp "Enter database master password (min 8 chars): " DB_PASSWORD
    echo ""
    if [ -z "$DB_PASSWORD" ]; then
        print_error "Database password is required"
        print_error "   Set DB_PASSWORD environment variable or provide it when prompted"
        exit 1
    fi
fi

if [ "$ENVIRONMENT" = "dev" ] || [ "$ENVIRONMENT" = "staging" ]; then
    # Use a POSIX-safe uppercase conversion to support macOS / older bash versions
    UPPER_ENV=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
    print_warn "⚠️  ${UPPER_ENV} environment: RDS instance will be PUBLICLY ACCESSIBLE"
    print_warn "   This allows direct database access from the internet for development / staging purposes"
    print_warn "   Production environments will use private subnets (not publicly accessible)"
fi

print_warn "⚠️  For production, consider using AWS Secrets Manager instead of plain text passwords"
deploy_stack "${STACK_PREFIX}-rds" "09-single-rds-postgres.yaml" "MasterUsername=${DB_USERNAME} MasterUserPassword=${DB_PASSWORD}"

print_info "Step 7/15: Deploying Application Load Balancer (MUST be before ECS)..."
deploy_stack "${STACK_PREFIX}-alb" "06-alb.yaml"

print_info "Step 8/15: Building and pushing Docker image to ECR..."
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

print_info "Step 9/15: Deploying ECS Fargate..."
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
print_info "Step 10/15: Updating ECS Service to add LoadBalancers..."
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

print_info "Step 11/15: Deploying WAF..."
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
print_info "Step 12/15: Deploying Frontend S3 Bucket..."
deploy_stack "${STACK_PREFIX}-frontend-s3" "10-frontend-s3.yaml"

print_info "Step 13/15: Deploying Frontend CloudFront..."
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

print_info "Step 14/15: Frontend ECS (Optional - deploy manually if needed)..."
print_warn "Frontend ECS is optional. Deploy manually with:"
print_warn "  aws cloudformation deploy --template-file 12-frontend-ecs.yaml --stack-name ${STACK_PREFIX}-frontend-ecs \\"
print_warn "    --parameter-overrides ProjectName=${PROJECT_NAME} Environment=${ENVIRONMENT} \\"
print_warn "    ContainerImage=<ecr-uri> --region ${AWS_REGION}"

print_info "Step 15/15: Route 53 (Optional - requires domain name)..."
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
print_info "1. Configure email logo (optional but recommended):"
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
print_info "6. Configure Route 53 with your domain name (optional)"
print_info "7. Set up SSL certificates in ACM if using HTTPS (optional)"

