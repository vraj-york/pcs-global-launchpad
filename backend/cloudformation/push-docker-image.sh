#!/bin/bash

# Script to build and push Docker image to ECR
# Usage: ./push-docker-image.sh

set -e

# Configuration
PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
# Allow specifying environment via CLI: -e|--env or as first positional argument
# Example: ./push-docker-image.sh -e staging  OR  ./push-docker-image.sh staging
ENVIRONMENT="${ENVIRONMENT:-dev}"
REGION="${AWS_REGION:-us-east-1}"

# Parse CLI arguments (CLI overrides environment variable)
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [-e|--env <dev|staging|prod>]"
            exit 0
            ;;
        -*|--*)
            echo "Unknown option: $1"
            exit 1
            ;;
        *)
            # positional argument as environment
            ENVIRONMENT="$1"
            shift
            ;;
    esac
done

# Export environment so child processes (if any) inherit it
export ENVIRONMENT

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info "Using environment: $ENVIRONMENT"

# Get ECR repository URI
print_info "Getting ECR repository URI from CloudFormation..."
ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-ecr \
    --region $REGION \
    --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryUri'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [ -z "$ECR_URI" ]; then
    print_error "Could not find ECR repository. Make sure the ECR stack is deployed:"
    print_error "  aws cloudformation describe-stacks --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-ecr --region $REGION"
    exit 1
fi

print_info "ECR Repository URI: $ECR_URI"
echo ""

# Get script directory and navigate to backend
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

print_info "Changing to backend directory: $BACKEND_DIR"
cd "$BACKEND_DIR"

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
    print_warn "Dockerfile not found in current directory"
    print_warn "Creating a basic Dockerfile for NestJS application..."

    cat > Dockerfile << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main.js"]
EOF
    print_info "Dockerfile created. Please review and customize if needed."
    echo ""
fi

# Login to ECR
print_info "Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI

if [ $? -ne 0 ]; then
    print_error "Failed to login to ECR"
    exit 1
fi

print_info "✅ Successfully logged in to ECR"
echo ""

# Build Docker image
print_info "Building Docker image for linux/amd64 platform (required for ECS Fargate)..."
print_info "Image tag: $ECR_URI:latest"
print_info "Build context: $(pwd)"
echo ""

# Verify package-lock.json exists
if [ ! -f "package-lock.json" ]; then
    print_error "package-lock.json not found in $(pwd)"
    print_error "Please run 'npm install' in the backend directory first"
    exit 1
fi

# Build for linux/amd64 platform (required for ECS Fargate)
docker build --platform linux/amd64 -t bsp-blueprint:latest .

if [ $? -ne 0 ]; then
    print_error "Docker build failed"
    exit 1
fi

print_info "✅ Docker image built successfully"
echo ""

# Tag image
print_info "Tagging image for ECR..."
docker tag bsp-blueprint:latest $ECR_URI:latest

print_info "✅ Image tagged successfully"
echo ""

# Push image
print_info "Pushing image to ECR..."
docker push $ECR_URI:latest

if [ $? -eq 0 ]; then
    print_info "✅ Image pushed successfully to ECR!"
    echo ""
    print_info "=========================================="
    print_info "Image Details:"
    print_info "=========================================="
    print_info "Repository: $ECR_URI"
    print_info "Tag: latest"
    print_info "Full URI: $ECR_URI:latest"
    echo ""
    print_warn "Next step: Update ECS service to use this image"
    print_warn "The ECS task definition should reference: $ECR_URI:latest"
    echo ""
    print_info "To force ECS to pull the new image, run:"
    print_info "  aws ecs update-service \\"
    print_info "    --cluster ${PROJECT_NAME}-${ENVIRONMENT}-cluster \\"
    print_info "    --service ${PROJECT_NAME}-${ENVIRONMENT}-service \\"
    print_info "    --force-new-deployment \\"
    print_info "    --region $REGION"
else
    print_error "Failed to push image to ECR"
    exit 1
fi

