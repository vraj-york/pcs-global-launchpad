#!/bin/bash

# Script to build React app and deploy to S3 + CloudFront
# Usage: ./deploy-frontend.sh

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

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

print_info "Building and Deploying React Frontend"
print_info "======================================"
echo ""

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

# Check if package.json exists
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    print_error "package.json not found in frontend directory"
    exit 1
fi

print_info "Frontend directory: $FRONTEND_DIR"
echo ""

# Load environment variables from .env file if it exists
if [ -f "$FRONTEND_DIR/.env" ]; then
    print_info "Loading environment variables from .env file..."
    # Export variables from .env file (handles VITE_ prefixed variables)
    set -a
    source "$FRONTEND_DIR/.env"
    set +a
    print_info "✅ Loaded .env file"
fi

# Vite environment variables (can be set as environment variables, .env file, or auto-fetched from Cognito stack)
VITE_AWS_USER_POOL_ID="${VITE_AWS_USER_POOL_ID:-}"
VITE_AWS_USER_POOL_CLIENT_ID="${VITE_AWS_USER_POOL_CLIENT_ID:-}"
VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER="${VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER:-}"

# Auto-fetch Cognito IDs from CloudFormation if not set
if [ -z "$VITE_AWS_USER_POOL_ID" ] || [ -z "$VITE_AWS_USER_POOL_CLIENT_ID" ]; then
    print_info "Fetching Cognito User Pool IDs from CloudFormation..."
    COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-cognito \
        --region $AWS_REGION \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
        --output text 2>/dev/null || echo "")
    COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks \
        --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-cognito \
        --region $AWS_REGION \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
        --output text 2>/dev/null || echo "")
    COGNITO_CLIENT_REMEMBER_ID=$(aws cloudformation describe-stacks \
        --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-cognito \
        --region $AWS_REGION \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientRememberMeId'].OutputValue" \
        --output text 2>/dev/null || echo "")

    [ -n "$COGNITO_USER_POOL_ID" ] && VITE_AWS_USER_POOL_ID="$COGNITO_USER_POOL_ID"
    [ -n "$COGNITO_CLIENT_ID" ] && VITE_AWS_USER_POOL_CLIENT_ID="$COGNITO_CLIENT_ID"
    [ -n "$COGNITO_CLIENT_REMEMBER_ID" ] && VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER="$COGNITO_CLIENT_REMEMBER_ID"
fi

# Check if Vite environment variables are set
if [ -z "$VITE_AWS_USER_POOL_ID" ]; then
    print_error "VITE_AWS_USER_POOL_ID is not set."
    print_error "Please set it in one of the following ways:"
    print_error "  1. Create a .env file in frontend/ with: VITE_AWS_USER_POOL_ID=your-pool-id"
    print_error "  2. Set as environment variable: export VITE_AWS_USER_POOL_ID=your-pool-id"
    print_error "  3. Ensure Cognito stack is deployed: ${PROJECT_NAME}-${ENVIRONMENT}-cognito"
    exit 1
fi

if [ -z "$VITE_AWS_USER_POOL_CLIENT_ID" ]; then
    print_error "VITE_AWS_USER_POOL_CLIENT_ID is not set."
    print_error "Please set it in one of the following ways:"
    print_error "  1. Create a .env file in frontend/ with: VITE_AWS_USER_POOL_CLIENT_ID=your-client-id"
    print_error "  2. Set as environment variable: export VITE_AWS_USER_POOL_CLIENT_ID=your-client-id"
    print_error "  3. Ensure Cognito stack is deployed: ${PROJECT_NAME}-${ENVIRONMENT}-cognito"
    exit 1
fi

print_info "✅ Vite Environment Variables:"
print_info "  VITE_AWS_USER_POOL_ID=$VITE_AWS_USER_POOL_ID"
print_info "  VITE_AWS_USER_POOL_CLIENT_ID=$VITE_AWS_USER_POOL_CLIENT_ID"
print_info "  VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER=$VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER"
echo ""

# Export for build process
export VITE_AWS_USER_POOL_ID
export VITE_AWS_USER_POOL_CLIENT_ID

# Step 1: Install dependencies (if needed)
print_info "Step 1: Checking dependencies..."
cd "$FRONTEND_DIR"

# Check if pnpm-lock.yaml exists (indicates pnpm project)
if [ -f "pnpm-lock.yaml" ]; then
    print_info "Detected pnpm project"
    if ! command -v pnpm &> /dev/null; then
        print_info "Installing pnpm..."
        npm install -g pnpm
    fi

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies with pnpm..."
        pnpm install
    else
        print_info "✅ Dependencies already installed"
    fi

    # Build with pnpm
    print_info "Step 2: Building React application with pnpm..."
    pnpm run build
elif [ -f "package-lock.json" ] || [ -f "yarn.lock" ]; then
    print_info "Detected npm/yarn project"
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies with npm..."
        npm install
    else
        print_info "✅ Dependencies already installed"
    fi

    # Build with npm
    print_info "Step 2: Building React application with npm..."
    npm run build
else
    print_error "No lock file found. Please run 'pnpm install' or 'npm install' first."
    exit 1
fi

if [ $? -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

# Check if build output exists (Vite uses 'dist', Create React App uses 'build')
BUILD_DIR=""
if [ -d "dist" ]; then
    BUILD_DIR="dist"
    print_info "Found build output in 'dist' directory (Vite)"
elif [ -d "build" ]; then
    BUILD_DIR="build"
    print_info "Found build output in 'build' directory (Create React App)"
else
    print_error "Build output not found. Expected 'dist' or 'build' directory."
    print_error "Build may have failed. Check the build output above."
    exit 1
fi

print_info "✅ Build completed. Output directory: $BUILD_DIR"
echo ""

# Step 3: Get S3 bucket name
print_info "Step 3: Getting S3 bucket name from CloudFormation..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-frontend-s3 \
    --region $AWS_REGION \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -z "$BUCKET_NAME" ] || [ "$BUCKET_NAME" = "None" ]; then
    print_error "Could not find frontend S3 bucket. Make sure the frontend-s3 stack is deployed:"
    print_error "  aws cloudformation describe-stacks --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-frontend-s3 --region $AWS_REGION"
    exit 1
fi

print_info "✅ S3 Bucket: $BUCKET_NAME"
echo ""

# Step 4: Upload to S3
# Note: We do NOT use --delete so that user-uploaded content (e.g. corporation-brand-logos/)
# in the same bucket is never removed by frontend deploys.
print_info "Step 4: Uploading files to S3..."
aws s3 sync "$BUILD_DIR/" "s3://$BUCKET_NAME/" \
    --region $AWS_REGION \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "*.json"

# Upload HTML files with no-cache
aws s3 sync "$BUILD_DIR/" "s3://$BUCKET_NAME/" \
    --region $AWS_REGION \
    --cache-control "no-cache, no-store, must-revalidate" \
    --exclude "*" \
    --include "*.html" \
    --include "*.json"

if [ $? -eq 0 ]; then
    print_info "✅ Files uploaded to S3"
else
    print_error "Failed to upload files to S3"
    exit 1
fi

echo ""

# Step 5: Invalidate CloudFront cache
print_info "Step 5: Invalidating CloudFront cache..."
DIST_ID=$(aws cloudformation describe-stacks \
    --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-frontend-cloudfront \
    --region $AWS_REGION \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendCloudFrontDistributionId'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -n "$DIST_ID" ] && [ "$DIST_ID" != "None" ]; then
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id $DIST_ID \
        --paths "/*" \
        --region $AWS_REGION \
        --query 'Invalidation.Id' \
        --output text 2>/dev/null || echo "")

    if [ -n "$INVALIDATION_ID" ]; then
        print_info "✅ CloudFront cache invalidation created: $INVALIDATION_ID"
        print_info "Cache invalidation takes 2-5 minutes to complete"
    else
        print_warn "⚠️  Could not create CloudFront invalidation"
    fi
else
    print_warn "⚠️  CloudFront distribution not found. Skipping cache invalidation."
fi

echo ""

# Step 6: Get CloudFront URL
print_info "Step 6: Getting CloudFront URL..."
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-frontend-cloudfront \
    --region $AWS_REGION \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendCloudFrontURL'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "None" ]; then
    print_info "✅ Frontend URL: $CLOUDFRONT_URL"
else
    print_warn "⚠️  CloudFront URL not found. Frontend may not be accessible yet."
fi

echo ""
print_info "=========================================="
print_info "✅ Frontend Deployment Complete!"
print_info "=========================================="
print_info "S3 Bucket: $BUCKET_NAME"
if [ -n "$CLOUDFRONT_URL" ] && [ "$CLOUDFRONT_URL" != "None" ]; then
    print_info "CloudFront URL: $CLOUDFRONT_URL"
fi
echo ""
print_info "Your React app is now live!"
print_info "Note: CloudFront cache invalidation may take a few minutes."

