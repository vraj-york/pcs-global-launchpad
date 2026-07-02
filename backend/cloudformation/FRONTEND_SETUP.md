# Frontend Infrastructure Setup Guide

This guide explains how to set up frontend infrastructure with S3, CloudFront, and optionally ECS.

## Architecture Options

### Option 1: Static Frontend (S3 + CloudFront) - Recommended
- **S3**: Stores static files (HTML, CSS, JS)
- **CloudFront**: CDN for fast global delivery
- **Best for**: React, Vue, Angular, or any static site

### Option 2: Dynamic Frontend (ECS + CloudFront)
- **ECS**: Runs frontend application in containers
- **CloudFront**: CDN in front of ECS
- **Best for**: Server-side rendered apps (Next.js SSR, etc.)

## Deployment Steps

### Step 1: Deploy Frontend S3 Bucket

```bash
cd backend/cloudformation
aws cloudformation deploy \
  --template-file 10-frontend-s3.yaml \
  --stack-name bsp-blueprint-dev-frontend-s3 \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
  --region us-east-1
```

### Step 2: Deploy Frontend CloudFront

```bash
# Get frontend bucket name
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-frontend-s3 \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text \
  --region us-east-1)

# Get CloudFront logs bucket
CLOUDFRONT_LOGS=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-s3 \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontLogsBucketName'].OutputValue" \
  --output text \
  --region us-east-1)

# Deploy CloudFront
aws cloudformation deploy \
  --template-file 11-frontend-cloudfront.yaml \
  --stack-name bsp-blueprint-dev-frontend-cloudfront \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
    FrontendBucketName=$FRONTEND_BUCKET \
    CloudFrontLogsBucket=$CLOUDFRONT_LOGS \
  --region us-east-1
```

### Step 3: Build and Deploy React Frontend

**Option A: Use the deployment script (Recommended)**

```bash
cd backend/cloudformation
./deploy-frontend.sh
```

This script will:
1. Install dependencies (pnpm or npm)
2. Build React app (`pnpm run build` or `npm run build`)
3. Upload to S3
4. Invalidate CloudFront cache

**Option B: Manual deployment**

```bash
# Build React app
cd frontend
pnpm install  # or npm install
pnpm run build  # or npm run build

# Get bucket name
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-frontend-s3 \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" \
  --output text \
  --region us-east-1)

# Upload static assets with long cache
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --delete \
  --region us-east-1 \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.json"

# Upload HTML files with no-cache
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --delete \
  --region us-east-1 \
  --cache-control "no-cache, no-store, must-revalidate" \
  --exclude "*" \
  --include "*.html" \
  --include "*.json"

# Invalidate CloudFront cache
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-frontend-cloudfront \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendCloudFrontDistributionId'].OutputValue" \
  --output text \
  --region us-east-1)

aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*" \
  --region us-east-1
```

### Step 4: (Optional) Deploy Frontend ECS

Only if you need server-side rendering or dynamic frontend:

```bash
# First, create ECR repository for frontend
aws cloudformation deploy \
  --template-file 03-ecr-repository.yaml \
  --stack-name bsp-blueprint-dev-frontend-ecr \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
  --region us-east-1

# Get ECR URI
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-frontend-ecr \
  --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryUri'].OutputValue" \
  --output text \
  --region us-east-1)

# Build and push frontend Docker image
cd frontend
docker build -t frontend:latest .
docker tag frontend:latest $ECR_URI:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI
docker push $ECR_URI:latest

# Deploy ECS
aws cloudformation deploy \
  --template-file 12-frontend-ecs.yaml \
  --stack-name bsp-blueprint-dev-frontend-ecs \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
    ContainerImage=$ECR_URI:latest \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## Using the Deployment Script

The main `deploy.sh` script now includes frontend infrastructure:

```bash
cd backend/cloudformation
./deploy.sh
```

This will deploy:
- Backend infrastructure (VPC, S3, ECR, Cognito, ECS, ALB, WAF, CloudFront)
- Frontend S3 bucket
- Frontend CloudFront distribution

## Frontend Files Upload

After deploying infrastructure, build and upload your React app:

**Using the script (Recommended):**
```bash
cd backend/cloudformation
./deploy-frontend.sh
```

**Manual steps:**
```bash
# Build React app (Vite outputs to 'dist' folder)
cd frontend
pnpm install  # or npm install
pnpm run build  # or npm run build

# Deploy using the script
cd ../backend/cloudformation
./deploy-frontend.sh
```

## CloudFront URL

Get your frontend URL:

```bash
aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-frontend-cloudfront \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendCloudFrontURL'].OutputValue" \
  --output text \
  --region us-east-1
```

## Architecture

```
User Request
    ↓
CloudFront (CDN)
    ↓
    ├─→ S3 (Static Files) - Default
    └─→ ALB → ECS (Dynamic Content) - Optional
```

## Configuration

### S3 Bucket
- **Name**: `bsp-blueprint-dev-frontend`
- **Public Access**: Enabled (for CloudFront)
- **Website Hosting**: Enabled
- **Index Document**: `index.html`
- **Error Document**: `index.html` (for SPA routing)

### CloudFront
- **Default Origin**: S3 bucket
- **Cache Policy**: Optimized for static content
- **Custom Error Pages**: 403/404 → `/index.html` (for SPA)
- **Compression**: Enabled
- **Security Headers**: Managed policy

### ECS (Optional)
- **Cluster**: Separate from backend
- **Service**: Frontend service
- **Port**: 80 (default, configurable)
- **Health Check**: `/health` endpoint

## Next Steps

1. ✅ Deploy frontend infrastructure
2. ✅ Build your frontend application
3. ✅ Upload files to S3
4. ✅ Access via CloudFront URL
5. ✅ (Optional) Set up custom domain in Route 53

## Troubleshooting

### CloudFront shows 403 Forbidden
- Check S3 bucket policy allows CloudFront access
- Verify bucket is public or has correct OAC policy

### Files not updating in CloudFront
- CloudFront caches files. Invalidate cache:
  ```bash
  DIST_ID=$(aws cloudformation describe-stacks \
    --stack-name bsp-blueprint-dev-frontend-cloudfront \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendCloudFrontDistributionId'].OutputValue" \
    --output text)

  aws cloudfront create-invalidation \
    --distribution-id $DIST_ID \
    --paths "/*" \
    --region us-east-1
  ```

### SPA routing not working
- CloudFront is configured to return `index.html` for 404 errors
- Verify your SPA router handles client-side routing

