#!/bin/bash

# Script to update IAM user policy for Bitbucket CI/CD to access frontend S3 bucket
# Usage: ./update-bitbucket-iam.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
IAM_USER_NAME="${IAM_USER_NAME:-bitbucket-cicd-user}"

print_info "Updating IAM User Policy for Bitbucket CI/CD"
print_info "============================================="
echo ""

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ -z "$AWS_ACCOUNT_ID" ]; then
    print_error "Could not get AWS Account ID. Make sure AWS credentials are configured."
    exit 1
fi

print_info "AWS Account ID: $AWS_ACCOUNT_ID"
echo ""

# Get frontend bucket name
print_info "Getting frontend S3 bucket name..."
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-frontend-s3 \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$FRONTEND_BUCKET" ] || [ "$FRONTEND_BUCKET" = "None" ]; then
    print_error "Could not find frontend S3 bucket. Make sure the frontend-s3 stack is deployed."
    exit 1
fi

print_info "Frontend Bucket: $FRONTEND_BUCKET"
echo ""

# Get ECR repository name (optional)
print_info "Getting ECR repository name..."
ECR_REPO=$(aws cloudformation describe-stacks \
  --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-ecr \
  --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryName'].OutputValue" \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$ECR_REPO" ] || [ "$ECR_REPO" = "None" ]; then
    print_warn "Could not find ECR repository. ECR permissions will not be included."
    ECR_REPO=""
fi

echo ""

# Create IAM policy document using jq or direct JSON
print_info "Creating IAM policy document..."

# Create policy file
POLICY_FILE=$(mktemp)

if command -v jq &> /dev/null; then
    # Use jq to create proper JSON
    cat > $POLICY_FILE <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::${FRONTEND_BUCKET}",
        "arn:aws:s3:::${PROJECT_NAME}-*-frontend*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::${FRONTEND_BUCKET}/*",
        "arn:aws:s3:::${PROJECT_NAME}-*-frontend*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:ListStackResources",
        "cloudformation:DescribeStackResources"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "ecs:RunTask",
        "ecs:StopTask"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PROJECT_NAME}-*-ecs-task-role",
        "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PROJECT_NAME}-*-ecs-task-execution-role"
      ],
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    }
EOF

    # Add ECR permissions if repository found
    if [ -n "$ECR_REPO" ]; then
        cat >> $POLICY_FILE <<EOF
    ,
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": [
        "arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/${ECR_REPO}",
        "arn:aws:ecr:${AWS_REGION}:${AWS_ACCOUNT_ID}:repository/${PROJECT_NAME}-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    }
EOF
    fi

    # Add PassRole permission for ECS roles
    cat >> $POLICY_FILE <<EOF
    ,
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PROJECT_NAME}-*-ecs-task-role",
        "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PROJECT_NAME}-*-ecs-task-execution-role"
      ],
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    }
EOF

    echo "  ]" >> $POLICY_FILE
    echo "}" >> $POLICY_FILE

    # Validate JSON with jq
    jq . $POLICY_FILE > /dev/null
    if [ $? -ne 0 ]; then
        print_error "Invalid JSON created"
        cat $POLICY_FILE
        rm -f $POLICY_FILE
        exit 1
    fi
else
    # Create JSON without jq (simpler, no ECR)
    cat > $POLICY_FILE <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::${FRONTEND_BUCKET}",
        "arn:aws:s3:::${PROJECT_NAME}-*-frontend*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::${FRONTEND_BUCKET}/*",
        "arn:aws:s3:::${PROJECT_NAME}-*-frontend*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:ListStackResources",
        "cloudformation:DescribeStackResources"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "ecs:RunTask",
        "ecs:StopTask"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PROJECT_NAME}-*-ecs-task-role",
        "arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PROJECT_NAME}-*-ecs-task-execution-role"
      ],
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    }
  ]
}
EOF
fi

print_info "Policy document:"
cat $POLICY_FILE
echo ""

# Use a customer-managed policy (to avoid the 2KB inline policy limit)
POLICY_NAME="${PROJECT_NAME}-bitbucket-frontend-policy"

# If an inline policy with the same name exists on the user, remove it first
INLINE_EXISTS=$(aws iam list-user-policies --user-name $IAM_USER_NAME --query "PolicyNames[?@=='${POLICY_NAME}']" --output text 2>/dev/null || echo "")
if [ -n "$INLINE_EXISTS" ] && [ "$INLINE_EXISTS" != "None" ]; then
  print_info "Found existing inline policy on user; deleting to switch to managed policy..."
  aws iam delete-user-policy --user-name $IAM_USER_NAME --policy-name $POLICY_NAME || true
fi

# Check for an existing customer-managed policy
MANAGED_POLICY_ARN=$(aws iam list-policies --scope Local --query "Policies[?PolicyName=='${POLICY_NAME}'].Arn" --output text 2>/dev/null || echo "")
if [ -n "$MANAGED_POLICY_ARN" ] && [ "$MANAGED_POLICY_ARN" != "None" ]; then
  print_info "Managed policy exists: $MANAGED_POLICY_ARN — updating by creating a new policy version..."
  # Try to create a new policy version and set it as default. If there are already 5 versions,
  # delete a non-default version and retry.
  if ! aws iam create-policy-version --policy-arn $MANAGED_POLICY_ARN --policy-document file://$POLICY_FILE --set-as-default 2>/dev/null; then
    print_warn "Policy version limit reached; pruning an old non-default version and retrying..."
    NON_DEFAULT_VERSIONS=$(aws iam list-policy-versions --policy-arn $MANAGED_POLICY_ARN --query "Versions[?IsDefaultVersion==\`false\`].VersionId" --output text)
    for v in $NON_DEFAULT_VERSIONS; do
      aws iam delete-policy-version --policy-arn $MANAGED_POLICY_ARN --version-id $v || true
      break
    done
    aws iam create-policy-version --policy-arn $MANAGED_POLICY_ARN --policy-document file://$POLICY_FILE --set-as-default
  fi
  print_info "✅ Managed policy updated: $MANAGED_POLICY_ARN"
else
  print_info "Creating new managed policy: $POLICY_NAME"
  MANAGED_POLICY_ARN=$(aws iam create-policy --policy-name $POLICY_NAME --policy-document file://$POLICY_FILE --description "Managed policy for ${PROJECT_NAME} CI/CD (environment-agnostic)" --query 'Policy.Arn' --output text)
  print_info "✅ Managed policy created: $MANAGED_POLICY_ARN"
fi

# Attach the managed policy to the user (idempotent)
print_info "Attaching managed policy to user $IAM_USER_NAME"
aws iam attach-user-policy --user-name $IAM_USER_NAME --policy-arn $MANAGED_POLICY_ARN || true
print_info "✅ Policy attached to user: $IAM_USER_NAME -> $MANAGED_POLICY_ARN"

# Clean up
rm -f $POLICY_FILE

echo ""
print_info "=========================================="
print_info "✅ IAM Policy Updated!"
print_info "=========================================="
print_info "User: $IAM_USER_NAME"
print_info "Policy: $POLICY_NAME"
print_info "Permissions:"
print_info "  - S3: ListBucket, GetObject, PutObject, DeleteObject on $FRONTEND_BUCKET"
print_info "  - CloudFront: CreateInvalidation"
print_info "  - CloudFormation: DescribeStacks, ListStackResources, DescribeStackResources"
print_info "  - ECS: DescribeServices, DescribeTasks, DescribeTaskDefinition, RegisterTaskDefinition, UpdateService, RunTask, StopTask"
print_info "  - IAM: PassRole for ECS task and execution roles (${PROJECT_NAME}-*-ecs-task-role, ${PROJECT_NAME}-*-ecs-task-execution-role)"
if [ -n "$ECR_REPO" ]; then
    print_info "  - ECR: Push/Pull images on $ECR_REPO"
fi
echo ""
print_info "The Bitbucket pipeline should now have access to upload files to S3."
