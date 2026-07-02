# Staging Environment Deployment Guide

## Overview
This guide covers deploying the Bispy Bot infrastructure to the **staging** environment.

---

## Prerequisites

### 1. AWS Credentials
```bash
# Ensure you have AWS credentials configured
aws configure
# Or verify existing credentials
aws sts get-caller-identity
```

### 2. Environment Variables
```bash
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=us-east-1  # or your preferred region
```

### 3. Install Dependencies
```bash
cd chatbot/infrastructure
pip install -r requirements.txt
```

---

## Configuration Review

### Check Your `stage.yaml`
Review `infrastructure/environments/stage.yaml` to ensure it has the correct values:

```yaml
env:
  name: stage  # ✅ Must be "stage"

network:
  vpc_id: vpc-0340bd87b850e525e  # ✅ Your staging VPC
  private_app_subnet_ids:        # ✅ Your staging subnets
    - subnet-05b3c84c73a943f00
    - subnet-0c8776ec01ab19be2

lambda:
  chat:
    memory: 2048     # Consider increasing for staging
    timeout: 29
  ingestion:
    memory: 3008
    timeout: 900

bedrock_prompt_id: "58222GC8XN"  # Update if different for staging
bedrock_prompt_version: "1"

rds:
  instance_class: db.t3.micro      # Consider db.t3.small for staging
  allocated_storage: 20
  multi_az: false                  # Consider true for staging
  deletion_protection: false       # Consider true for staging
  removal_policy: destroy          # Consider retain for staging
```

### Key Differences: Dev vs Staging vs Prod

| Setting | Dev | Staging | Production |
|---------|-----|---------|------------|
| `env.name` | `dev` | `stage` | `prod` |
| `rds.instance_class` | `db.t3.micro` | `db.t3.small` | `db.t3.medium+` |
| `rds.multi_az` | `false` | `false` or `true` | `true` |
| `rds.deletion_protection` | `false` | `true` | `true` |
| `rds.removal_policy` | `destroy` | `retain` | `retain` |
| `lambda.chat.memory` | `2048` | `2048-3008` | `3008+` |
| `s3.versioned` | `false` | `true` | `true` |

---

## Deployment Steps

### Step 1: Synthesize CloudFormation Templates

```bash
cd chatbot/infrastructure

# Synthesize for staging
cdk synth --context env=stage
```

**Expected output:**
```
Synthesized stacks for environment: stage
Account: 123456789012 and Region: us-east-1
VPC: vpc-0340bd87b850e525e
Subnets: 2
...
```

### Step 2: Bootstrap CDK (First Time Only)

```bash
# Only needed once per account/region
cdk bootstrap --context env=stage
```

### Step 3: Preview Changes

```bash
# See what will be created/changed
cdk diff --context env=stage
```

### Step 4: Deploy All Stacks

```bash
# Deploy all stacks at once
cdk deploy --all --context env=stage --require-approval never

# Or deploy specific stacks
cdk deploy ChatbotNetworkStack-stage --context env=stage
cdk deploy ChatbotIAMStack-stage --context env=stage
# ... etc
```

**Expected stack names:**
- `ChatbotNetworkStack-stage`
- `ChatbotIAMStack-stage`
- `ChatbotEndpointsStack-stage`
- `ChatbotS3Stack-stage`
- `ChatbotRDSStack-stage`
- `ChatbotDBInitStack-stage`
- `ChatbotIngestStack-stage`
- `ChatbotRuntimeStack-stage`
- `ChatbotApiStack-stage`

### Step 5: Initialize Database

After RDS and DBInit stacks are deployed:

```bash
# Get the Lambda function name
aws lambda list-functions --query "Functions[?contains(FunctionName, 'DBInit')].FunctionName" --output text

# Invoke it
aws lambda invoke \
  --function-name <db-init-lambda-name> \
  --payload '{}' \
  response.json

# Check result
cat response.json
```

---

## Verification

### 1. Check Stack Status

```bash
# List all staging stacks
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?contains(StackName, 'stage')].{Name:StackName,Status:StackStatus}" \
  --output table
```

### 2. Test API Endpoint

```bash
# Get API URL from outputs
aws cloudformation describe-stacks \
  --stack-name ChatbotApiStack-stage \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text

# Test health endpoint
curl https://<api-url>/v1/health

# Test chat endpoint
curl -X POST https://<api-url>/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from staging!", "chat_mode": "quick"}'
```

### 3. Check Prompt Status

```bash
curl https://<api-url>/v1/admin/prompt-status
```

### 4. Verify CloudWatch Logs

```bash
# List log groups
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/ChatbotRuntimeStack-stage" \
  --query "logGroups[].logGroupName"

# Tail logs
aws logs tail /aws/lambda/ChatbotRuntimeStack-stage-ChatbotRuntimeLambda --follow
```

---

## Updating Staging

### Update Lambda Code

```bash
cd chatbot/infrastructure
cdk deploy ChatbotRuntimeStack-stage --context env=stage
```

### Update Configuration

```bash
# Edit stage.yaml
vim environments/stage.yaml

# Deploy changes
cdk deploy --all --context env=stage
```

### Update Prompt

```bash
# Update prompt in Bedrock Prompt Management, then refresh
curl -X POST https://<api-url>/v1/admin/refresh-prompt
```

---

## Rollback

### Rollback Specific Stack

```bash
# List available versions
aws cloudformation list-stack-resources \
  --stack-name ChatbotRuntimeStack-stage

# Rollback to previous version
aws cloudformation cancel-update-stack \
  --stack-name ChatbotRuntimeStack-stage
```

### Delete Staging Environment

```bash
# ⚠️ WARNING: This deletes all staging resources!
cdk destroy --all --context env=stage
```

---

## Troubleshooting

### Stack Deployment Failed

```bash
# Check stack events
aws cloudformation describe-stack-events \
  --stack-name <stack-name> \
  --max-items 20

# Get error details
aws cloudformation describe-stack-resources \
  --stack-name <stack-name>
```

### Lambda Errors

```bash
# Check Lambda logs
aws logs tail /aws/lambda/ChatbotRuntimeStack-stage-ChatbotRuntimeLambda --follow

# Check Lambda configuration
aws lambda get-function --function-name <lambda-name>
```

### Database Connection Issues

```bash
# Test from Lambda
aws lambda invoke \
  --function-name <db-init-lambda> \
  --payload '{}' \
  response.json && cat response.json
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Staging
on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Install CDK
        run: npm install -g aws-cdk
      
      - name: Install Python dependencies
        run: cd chatbot/infrastructure && pip install -r requirements.txt
      
      - name: Deploy to Staging
        run: cd chatbot/infrastructure && cdk deploy --all --context env=stage --require-approval never
```

---

## Environment Comparison

### List All Environments

```bash
# Dev stacks
aws cloudformation list-stacks --query "StackSummaries[?contains(StackName, 'dev')]"

# Staging stacks
aws cloudformation list-stacks --query "StackSummaries[?contains(StackName, 'stage')]"

# Prod stacks
aws cloudformation list-stacks --query "StackSummaries[?contains(StackName, 'prod')]"
```

### Compare Configurations

```bash
cd chatbot/infrastructure/environments

# Compare dev and staging
diff dev.yaml stage.yaml

# Compare staging and prod
diff stage.yaml prod.yaml
```

---

## Best Practices

### 1. Always Test in Staging First
- Deploy changes to staging before production
- Run integration tests
- Verify all endpoints work

### 2. Use Separate AWS Accounts (Recommended)
- Dev: AWS Account A
- Staging: AWS Account B
- Prod: AWS Account C

### 3. Tag Resources Properly
All resources are auto-tagged with:
- `Environment: stage`
- `Project: BispyBot`
- `ManagedBy: CDK`

### 4. Monitor Costs
```bash
# Check staging costs
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://filter.json

# filter.json:
# {
#   "Tags": {
#     "Key": "Environment",
#     "Values": ["stage"]
#   }
# }
```

### 5. Backup Strategy
- Enable RDS automated backups (set `backup_retention_period`)
- Enable S3 versioning for documents
- Export CloudFormation templates regularly

---

## Quick Reference

```bash
# Deploy to staging
cd chatbot/infrastructure
cdk deploy --all --context env=stage

# Update Lambda only
cdk deploy ChatbotRuntimeStack-stage --context env=stage

# Tail logs
aws logs tail /aws/lambda/ChatbotRuntimeStack-stage-ChatbotRuntimeLambda --follow

# Get API URL
aws cloudformation describe-stacks \
  --stack-name ChatbotApiStack-stage \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text

# Destroy staging
cdk destroy --all --context env=stage
```

---

## Support

For issues or questions:
1. Check CloudWatch Logs
2. Review CloudFormation events
3. Verify `stage.yaml` configuration
4. Check AWS service quotas
