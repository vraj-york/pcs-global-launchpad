#!/bin/bash

# Script to deploy only frontend infrastructure (S3 + CloudFront)
# Usage: ./deploy-frontend-infra.sh

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

print_info "Deploying Frontend Infrastructure"
print_info "=================================="
echo ""

# Step 1: Deploy S3 bucket
print_info "Step 1: Deploying Frontend S3 Bucket..."
aws cloudformation deploy \
  --template-file 10-frontend-s3.yaml \
  --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-frontend-s3 \
  --region $AWS_REGION \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT

if [ $? -eq 0 ]; then
    print_info "✅ Frontend S3 bucket deployed"
else
    print_error "Failed to deploy S3 bucket"
    exit 1
fi

echo ""

# Step 2: Get S3 bucket name and CloudFront logs bucket
print_info "Step 2: Getting bucket names..."
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-frontend-s3 \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text \
  --region $AWS_REGION)

# Get CloudFront logs bucket from backend S3 stack
CLOUDFRONT_LOGS=$(aws cloudformation describe-stacks \
  --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-s3 \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontLogsBucketName'].OutputValue" \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$FRONTEND_BUCKET" ] || [ "$FRONTEND_BUCKET" = "None" ]; then
    print_error "Could not get frontend bucket name"
    exit 1
fi

if [ -z "$CLOUDFRONT_LOGS" ] || [ "$CLOUDFRONT_LOGS" = "None" ]; then
    print_warn "CloudFront logs bucket not found. Using frontend bucket for logs."
    CLOUDFRONT_LOGS=$FRONTEND_BUCKET
fi

print_info "Frontend Bucket: $FRONTEND_BUCKET"
print_info "CloudFront Logs Bucket: $CLOUDFRONT_LOGS"
echo ""

# Step 3: Deploy CloudFront
print_info "Step 3: Deploying Frontend CloudFront Distribution..."
aws cloudformation deploy \
  --template-file 11-frontend-cloudfront.yaml \
  --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-frontend-cloudfront \
  --region $AWS_REGION \
  --parameter-overrides \
    ProjectName=$PROJECT_NAME \
    Environment=$ENVIRONMENT \
    FrontendBucketName=$FRONTEND_BUCKET \
    CloudFrontLogsBucket=$CLOUDFRONT_LOGS

if [ $? -eq 0 ]; then
    print_info "✅ Frontend CloudFront distribution deployed"
else
    print_error "Failed to deploy CloudFront"
    exit 1
fi

echo ""

# Step 4: Get CloudFront URL
print_info "Step 4: Getting CloudFront URL..."
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-frontend-cloudfront \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendCloudFrontURL'].OutputValue" \
  --output text \
  --region $AWS_REGION)

echo ""
print_info "=========================================="
print_info "✅ Frontend Infrastructure Deployed!"
print_info "=========================================="
print_info "S3 Bucket: $FRONTEND_BUCKET"
print_info "CloudFront URL: $CLOUDFRONT_URL"
echo ""
print_info "Next step: Deploy your React app"
print_info "  ./deploy-frontend.sh"

