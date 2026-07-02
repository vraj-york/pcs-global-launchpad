# Bitbucket CI/CD Pipeline Setup Guide

This guide provides step-by-step instructions to set up a CI/CD pipeline in Bitbucket that automatically builds and pushes Docker images to AWS ECR, and optionally deploys to ECS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create AWS IAM User for CI/CD](#step-1-create-aws-iam-user-for-cicd)
3. [Step 2: Configure Bitbucket Repository Variables](#step-2-configure-bitbucket-repository-variables)
4. [Step 3: Enable Bitbucket Pipelines](#step-3-enable-bitbucket-pipelines)
5. [Step 4: Verify Pipeline File](#step-4-verify-pipeline-file)
6. [Step 5: Test the Pipeline](#step-5-test-the-pipeline)
7. [Pipeline Behavior](#pipeline-behavior)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

Before setting up the pipeline, ensure you have:

- ✅ Bitbucket repository with your code
- ✅ AWS account with CloudFormation stacks deployed (especially ECR stack)
- ✅ AWS CLI installed locally (for testing)
- ✅ Docker Desktop running (for local testing)
- ✅ Access to Bitbucket repository settings

---

## Step 1: Create AWS IAM User for CI/CD

The pipeline needs AWS credentials to push images to ECR and update ECS services.

### 1.1 Create IAM User

1. Go to **AWS Console** → **IAM** → **Users**
2. Click **Create user**
3. Enter username: `bitbucket-cicd-user`
4. Click **Next**

### 1.2 Attach Policies

Attach the following policies:

1. **AmazonEC2ContainerRegistryPowerUser** (for ECR push/pull)
2. **AmazonECS_FullAccess** (for ECS service updates)
3. **CloudFormation ReadOnly** (to read stack outputs)

**Option A: Use AWS Managed Policies (Easier)**

1. Click **Attach policies directly**
2. Search and select:
   - `AmazonEC2ContainerRegistryPowerUser`
   - `AmazonECS_FullAccess`
   - `AWSCloudFormationReadOnlyAccess`
3. Click **Next** → **Create user**

**Option B: Create Custom Policy (More Secure)**

Create a custom policy with minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
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
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:RunTask",
        "ecs:StopTask"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:ListStackResources"
      ],
      "Resource": "*"
    }
  ]
}
```

### 1.3 Generate Access Keys

1. Click on the created user: `bitbucket-cicd-user`
2. Go to **Security credentials** tab
3. Scroll to **Access keys** section
4. Click **Create access key**
5. Select **Application running outside AWS**
6. Click **Next** → **Create access key**
7. **IMPORTANT**: Copy both:
   - **Access key ID**
   - **Secret access key** (shown only once!)

Save these credentials securely. You'll need them in the next step.

---

## Step 2: Configure Bitbucket Repository Variables

Repository variables store sensitive credentials securely.

### 2.1 Navigate to Repository Settings

1. Go to your Bitbucket repository
2. Click **Repository settings** (gear icon in left sidebar)
3. Click **Pipelines** → **Repository variables**

### 2.2 Add Required Variables

Click **Add variable** and create the following:

| Variable Name | Value | Secured? | Description |
|--------------|-------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Your IAM user access key ID | ✅ Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user secret key | ✅ Yes | AWS secret key |
| `AWS_REGION` | `us-east-1` | ❌ No | AWS region (optional, defaults to us-east-1) |
| `PROJECT_NAME` | `bsp-blueprint` | ❌ No | Project name (optional, defaults to bsp-blueprint) |
| `ENVIRONMENT` | `dev` | ❌ No | Environment name (optional, defaults to dev) |

**Steps to add each variable:**

1. Click **Add variable**
2. Enter **Name**: `AWS_ACCESS_KEY_ID`
3. Enter **Value**: Your access key ID
4. ✅ Check **Secured** (hides value in logs)
5. Click **Add**

Repeat for all variables.

### 2.3 Verify Variables

You should see all variables listed. Secured variables will show `***` instead of the actual value.

---

## Step 3: Enable Bitbucket Pipelines

Enable Pipelines for your repository.

### 3.1 Enable Pipelines Feature

1. In **Repository settings** → **Pipelines** → **Settings**
2. Under **Pipelines**, ensure **Enable Pipelines** is **ON**
3. If it's off, toggle it **ON**

### 3.2 Verify Pipeline File

The `bitbucket-pipelines.yml` file should be in your repository root:

```
bsp-blueprint/
├── bitbucket-pipelines.yml  ← Should be here
├── backend/
│   ├── cloudformation/
│   ├── src/
│   └── ...
└── README.md
```

If the file doesn't exist, it should have been created. Verify it's committed to your repository.

---

## Step 4: Verify Pipeline File

The pipeline file is already created at the repository root. Verify it exists:

```bash
# From repository root
ls -la bitbucket-pipelines.yml
```

The file should contain:
- Docker build and push steps
- ECS deployment steps
- Branch-specific configurations

---

## Step 5: Test the Pipeline

### 5.1 Make a Test Commit

Make a small change to trigger the pipeline:

```bash
# From repository root
echo "# CI/CD Pipeline Test" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

### 5.2 Monitor Pipeline Execution

1. Go to your Bitbucket repository
2. Click **Pipelines** in the left sidebar
3. You should see a new pipeline run starting
4. Click on the pipeline to see detailed logs

### 5.3 Expected Pipeline Steps

The pipeline should:

1. ✅ **Build and Push Docker Image**
   - Install AWS CLI
   - Get ECR repository URI from CloudFormation
   - Login to ECR
   - Build Docker image for `linux/amd64`
   - Tag image with `latest` and commit hash
   - Push images to ECR

2. ✅ **Deploy to ECS** (only on `main`/`master` branch)
   - Update ECS service to force new deployment

### 5.4 Verify Success

**Check ECR:**
```bash
aws ecr describe-images \
  --repository-name bsp-blueprint-dev \
  --region us-east-1
```

You should see the newly pushed image with tags `latest` and the commit hash.

**Check ECS (if deployed):**
```bash
aws ecs describe-services \
  --cluster bsp-blueprint-dev-cluster \
  --services bsp-blueprint-dev-service \
  --region us-east-1 \
  --query 'services[0].deployments'
```

You should see a new deployment in progress.

---

## Pipeline Behavior

### Branch-Specific Behavior

| Branch Type | Build Image | Push to ECR | Deploy to ECS |
|------------|-------------|-------------|---------------|
| `main`/`master` | ✅ | ✅ | ✅ Auto |
| `develop` | ✅ | ✅ | ❌ Manual |
| Other branches | ✅ | ✅ | ❌ Manual |
| Pull Requests | ✅ Build only | ❌ | ❌ |

### Pipeline Triggers

- **Automatic**: Every push to any branch
- **Pull Requests**: Builds image for validation (doesn't push)
- **Manual**: Custom pipelines can be triggered manually

### Custom Pipeline: Deploy to Production

To deploy to production:

1. Go to **Pipelines** → **Run pipeline**
2. Select **Custom** → **deploy-production**
3. Click **Run**

This will build, push, and deploy to the `prod` environment.

---

## Troubleshooting

### Error: "Could not find ECR repository"

**Problem:** Pipeline can't find the ECR CloudFormation stack.

**Solution:**
1. Verify ECR stack is deployed:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name bsp-blueprint-dev-ecr \
     --region us-east-1
   ```
2. Check stack name matches `PROJECT_NAME-ENVIRONMENT-ecr`
3. Verify AWS region is correct in repository variables

### Error: "Access Denied" when pushing to ECR

**Problem:** IAM user doesn't have ECR permissions.

**Solution:**
1. Verify IAM user has `AmazonEC2ContainerRegistryPowerUser` policy
2. Check access keys are correct in Bitbucket variables
3. Test credentials locally:
   ```bash
   export AWS_ACCESS_KEY_ID=your-key
   export AWS_SECRET_ACCESS_KEY=your-secret
   aws ecr get-login-password --region us-east-1
   ```

### Error: "Dockerfile not found"

**Problem:** Pipeline can't find Dockerfile in `backend/` directory.

**Solution:**
1. Verify Dockerfile exists: `backend/Dockerfile`
2. Check file is committed to repository
3. Verify pipeline file uses correct path: `cd backend`

### Error: "ECS service not found"

**Problem:** Pipeline can't find ECS service to update.

**Solution:**
1. Verify ECS stack is deployed:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name bsp-blueprint-dev-ecs \
     --region us-east-1
   ```
2. Check cluster and service names match:
   - Cluster: `bsp-blueprint-dev-cluster`
   - Service: `bsp-blueprint-dev-service`
3. Update pipeline file if names differ

### Pipeline Fails Silently

**Problem:** Pipeline shows as failed but no clear error.

**Solution:**
1. Click on the failed step to see detailed logs
2. Check for hidden errors in collapsed sections
3. Verify all repository variables are set correctly
4. Check AWS credentials are valid:
   ```bash
   # Test locally with same credentials
   export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
   export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
   aws sts get-caller-identity
   ```

### Docker Build Fails

**Problem:** Docker build step fails.

**Solution:**
1. Test build locally:
   ```bash
   cd backend
   docker build --platform linux/amd64 -t test .
   ```
2. Check Dockerfile syntax
3. Verify `package-lock.json` exists
4. Check build logs for specific npm/Node errors

---

## Advanced Configuration

### Environment-Specific Pipelines

To deploy to different environments, modify the pipeline:

```yaml
branches:
  main:
    - step:
        name: Build and Push (Production)
        script:
          - export ENVIRONMENT=prod
          # ... build steps
```

### Parallel Builds

Build multiple services in parallel:

```yaml
definitions:
  steps:
    - parallel:
        - step: &build-backend
            name: Build Backend
            # ... backend build
        - step: &build-frontend
            name: Build Frontend
            # ... frontend build
```

### Notifications

Add Slack/email notifications on pipeline completion:

```yaml
options:
  notifications:
    - recipient:
        type: EMAIL
        email: your-email@example.com
      events:
        - pipeline:success
        - pipeline:failed
```

### Caching

The pipeline already includes Docker layer caching. To cache npm dependencies:

```yaml
caches:
  - node
script:
  - cd backend
  - npm ci
```

---

## Next Steps

1. ✅ Pipeline is set up and working
2. ✅ Images are automatically pushed on every commit
3. ✅ Main branch auto-deploys to ECS

**Optional Enhancements:**

- Add automated tests before building
- Add security scanning (Snyk, Trivy)
- Add deployment approval gates for production
- Set up notifications (Slack, email)
- Add rollback capabilities

---

## Summary

Your Bitbucket CI/CD pipeline is now configured to:

- ✅ Automatically build Docker images on every push
- ✅ Push images to AWS ECR
- ✅ Auto-deploy to ECS on `main`/`master` branch
- ✅ Validate PRs with Docker builds
- ✅ Support manual production deployments

The pipeline runs automatically on every push. Monitor it in **Bitbucket** → **Pipelines**.

