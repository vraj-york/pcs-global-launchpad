# Step-by-Step Deployment Instructions

## Quick Reference - Deployment Order

**Critical:** Deploy stacks in this exact order:

1. ✅ VPC & Networking
2. ✅ S3 Buckets
3. ✅ ECR Repository
4. ✅ Cognito
5. ✅ **Single RDS PostgreSQL** (MUST be before ECS)
6. ✅ **ALB (MUST be before ECS)**
7. ✅ ECS Fargate
8. ✅ Update ECS to add LoadBalancers (after ALB is ready)
9. ✅ WAF
10. ✅ CloudFront
11. ✅ Route 53 (optional)

**Key Points:**
- ALB must be deployed **before** ECS
- ECS is initially deployed without LoadBalancers
- After ALB is ready, update ECS to connect to the load balancer
- See step 2.6.5 for updating ECS with LoadBalancers

---

## Step 1: Configure AWS Credentials

```bash
aws configure
```

Enter:
- AWS Access Key ID: [Your access key]
- AWS Secret Access Key: [Your secret key]
- Default region: us-east-1 (or your preferred region)
- Default output format: json

## Step 2: Deploy Stacks in Order

**⚠️ IMPORTANT: Deployment Order Matters!**

The stacks must be deployed in this exact order due to dependencies:
1. VPC (foundation)
2. S3, ECR, Cognito (independent)
3. **Single RDS PostgreSQL (must be before ECS)**
4. **ALB (must be before ECS)**
5. ECS (depends on ALB listener and RDS)
6. WAF, CloudFront, Route 53 (depend on ALB)

**Key Dependency:** ECS service requires the ALB listener to exist before it can use the target group. Always deploy ALB before ECS, or deploy ECS without LoadBalancers first and add them after ALB is ready.

Run these commands one by one in your terminal:

### 2.1 Deploy VPC and Networking
```bash
cd backend/cloudformation

aws cloudformation deploy \
  --template-file 01-vpc-network.yaml \
  --stack-name bsp-blueprint-dev-vpc \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

**Wait for this to complete** (takes 5-10 minutes)

### 2.2 Deploy S3 Buckets
```bash
aws cloudformation deploy \
  --template-file 02-s3-buckets.yaml \
  --stack-name bsp-blueprint-dev-s3 \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev \
  --region us-east-1
```

### 2.3 Deploy ECR Repository
```bash
aws cloudformation deploy \
  --template-file 03-ecr-repository.yaml \
  --stack-name bsp-blueprint-dev-ecr \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev \
  --region us-east-1
```

### 2.4 Deploy Cognito User Pool

This setup creates:
- ✅ Cognito User Pool with **SuperAdmin** group
- ✅ **2FA enabled** (Email OTP for authentication)
- ✅ **No self-signup** (admin creates users only)

#### 2.4.1 Deploy Cognito User Pool
```bash
aws cloudformation deploy \
  --template-file 04-cognito.yaml \
  --stack-name bsp-blueprint-dev-cognito \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev DomainPrefix=bsp-blueprint-dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

#### 2.4.2 Deploy Lambda Function for Email OTP

**Important:** Update the Lambda function code to use a verified SES email address.

```bash
# First, get the User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-cognito \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text \
  --region us-east-1)

# Deploy Lambda
aws cloudformation deploy \
  --template-file 04-cognito-lambda.yaml \
  --stack-name bsp-blueprint-dev-cognito-lambda \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev UserPoolId=$USER_POOL_ID \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

#### 2.4.3 Update Cognito User Pool with Lambda Triggers

After Lambda is deployed, update the Cognito stack to attach Lambda triggers:

```bash
# Get Lambda ARN
LAMBDA_ARN=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-cognito-lambda \
  --query "Stacks[0].Outputs[?OutputKey=='LambdaFunctionArn'].OutputValue" \
  --output text \
  --region us-east-1)

# Update Cognito User Pool with Lambda triggers
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --lambda-config \
    DefineAuthChallenge=$LAMBDA_ARN \
    CreateAuthChallenge=$LAMBDA_ARN \
    VerifyAuthChallengeResponse=$LAMBDA_ARN \
  --region us-east-1
```

#### 2.4.4 Configure SES for Email Sending

**Before emails will work, you need to:**

1. **Verify your email domain in SES** (or use a single verified email):
   ```bash
   # Verify an email address
   aws ses verify-email-identity --email-address noreply@yourdomain.com --region us-east-1
   ```

2. **Update Lambda function** to use your verified email:
   - Go to Lambda Console → `bsp-blueprint-dev-cognito-email-otp`
   - Update line with `Source='noreply@yourdomain.com'` to your verified email
   - Save and deploy

3. **If in SES Sandbox** (new accounts):
   - You can only send to verified email addresses
   - Request production access in SES Console to send to any email

#### 2.4.5 Create SuperAdmin User

Since self-signup is disabled, create users via AWS CLI or Console:

**Option 1: Using AWS CLI**
```bash
# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-cognito \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text \
  --region us-east-1)

# Create SuperAdmin user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --message-action SUPPRESS \
  --region us-east-1

# Set permanent password (user will be forced to change on first login)
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin@example.com \
  --password YourSecurePassword123! \
  --permanent \
  --region us-east-1

# Add user to SuperAdmin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id $USER_POOL_ID \
  --username admin@example.com \
  --group-name SuperAdmin \
  --region us-east-1
```

**Option 2: Using AWS Console**
1. Go to **Cognito** → **User Pools** → Your pool
2. Click **Users** → **Create user**
3. Enter email, set temporary password
4. Go to **Groups** → **SuperAdmin** → **Add users to group**

**Or use the provided script:**
```bash
cd backend/cloudformation
./create-superadmin.sh
```

#### 2.4.6 Login Flow

1. **User enters email and password**
2. **Cognito verifies password**
3. **Lambda sends 6-digit OTP to user's email**
4. **User enters OTP**
5. **Lambda verifies OTP**
6. **User receives authentication tokens**

#### 2.4.7 Testing the Login

**Using AWS CLI (for testing):**
```bash
# Get Client ID
CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-cognito \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text \
  --region us-east-1)

# Initiate authentication
aws cognito-idp initiate-auth \
  --client-id $CLIENT_ID \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=admin@example.com,PASSWORD=YourSecurePassword123! \
  --region us-east-1

# Response will include a challenge (CUSTOM_CHALLENGE)
# Respond with OTP
aws cognito-idp respond-to-auth-challenge \
  --client-id $CLIENT_ID \
  --challenge-name CUSTOM_CHALLENGE \
  --challenge-responses USERNAME=admin@example.com,ANSWER=123456 \
  --session <SESSION_FROM_PREVIOUS_RESPONSE> \
  --region us-east-1
```

#### Optional: Remember-me (long refresh token) client

This template supports an optional second App Client configured with a longer refresh token lifetime for "remember me" behaviour. After deploying the Cognito stack you can fetch both client IDs and create a frontend `.env` that includes the remember-me client:

```bash
# Get both client IDs (regular and remember-me)
CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-cognito \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text \
  --region us-east-1)

CLIENT_REMEMBER_ID=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-cognito \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientRememberMeId'].OutputValue" \
  --output text \
  --region us-east-1)

echo "Client ID: $CLIENT_ID"
echo "Remember-me Client ID: $CLIENT_REMEMBER_ID"

# Create frontend .env with both values (if available)
cat > frontend/.env <<EOF
VITE_AWS_USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-cognito \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text --region us-east-1)
VITE_AWS_USER_POOL_CLIENT_ID=$CLIENT_ID
EOF

if [ -n "$CLIENT_REMEMBER_ID" ] && [ "$CLIENT_REMEMBER_ID" != "None" ]; then
  echo "VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER=$CLIENT_REMEMBER_ID" >> frontend/.env
fi

echo "Created frontend/.env with Cognito client IDs"
```

**Using Your Application:**
Use AWS Amplify, AWS SDK, or Cognito JavaScript SDK in your frontend.

#### 2.4.8 Cognito Troubleshooting

**Emails not sending?**
- Check SES email verification status
- Check Lambda CloudWatch logs: `/aws/lambda/bsp-blueprint-dev-cognito-email-otp`
- Verify SES is out of sandbox mode (or recipient is verified)

**OTP not working?**
- Check Lambda logs for errors
- Verify Lambda has permissions to Cognito and SES
- Check that Lambda triggers are attached to User Pool

**User can't login?**
- Verify user is in SuperAdmin group
- Check user status: `aws cognito-idp admin-get-user --user-pool-id <POOL_ID> --username <EMAIL>`
- Verify MFA is enabled: `aws cognito-idp describe-user-pool --user-pool-id <POOL_ID>`

**Security Best Practices:**
1. ✅ MFA is required (enforced)
2. ✅ Strong password policy (8+ chars, uppercase, lowercase, numbers, symbols)
3. ✅ No self-signup (admin-controlled)
4. ✅ Email verification required
5. ✅ OTP expires after 10 minutes
6. ⚠️ Consider adding rate limiting for OTP requests
7. ⚠️ Consider adding IP whitelisting for SuperAdmin group

### 2.4.5 Deploy AWS Client VPN (Deploy BEFORE RDS)

RDS is **not publicly accessible**. Developers connect through AWS Client VPN to reach the database from a local machine.

#### 2.4.5.1 Generate and import VPN certificates

```bash
cd backend/cloudformation
chmod +x setup-vpn-certs.sh download-vpn-client-config.sh
./setup-vpn-certs.sh -e dev
```

Save the printed ARNs as environment variables:

```bash
export VPN_SERVER_CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/..."
export VPN_CLIENT_CA_CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/..."
```

#### 2.4.5.2 Deploy Client VPN stack

```bash
aws cloudformation deploy \
  --template-file 09b-client-vpn.yaml \
  --stack-name bsp-blueprint-dev-client-vpn \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
    ServerCertificateArn=$VPN_SERVER_CERT_ARN \
    ClientRootCertificateChainArn=$VPN_CLIENT_CA_CERT_ARN \
  --region us-east-1
```

**Wait for this to complete** (takes 5-10 minutes)

#### 2.4.5.3 Download VPN client configuration

After the VPN stack is deployed:

```bash
./download-vpn-client-config.sh -e dev -o bsp-blueprint-dev-client.ovpn
```

Import `bsp-blueprint-dev-client.ovpn` into **AWS VPN Client** (recommended) or connect with OpenVPN.

**Important:** Keep `client.key` private. Do not commit certificate files to git.

### 2.5 Deploy Single RDS PostgreSQL (Deploy BEFORE ECS)

**Important:** RDS must be deployed before ECS because the ECS service needs database connection information.

#### 2.5.1 Deploy RDS Instance

```bash
aws cloudformation deploy \
  --template-file 09-single-rds-postgres.yaml \
  --stack-name bsp-blueprint-dev-rds \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
    MasterUsername=postgres \
    MasterUserPassword=YourSecurePassword123! \
    DatabaseName=bspdb \
    DBInstanceClass=db.t4g.medium \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

**Wait for this to complete** (takes 10-15 minutes)

**Security Note:** For production environments, consider using AWS Secrets Manager instead of passing passwords directly as parameters.

#### 2.5.2 Get Database Connection Information

After deployment, get the database endpoint:

```bash
# Get RDS instance endpoint
DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-rds \
  --query "Stacks[0].Outputs[?OutputKey=='RDSInstanceEndpoint'].OutputValue" \
  --output text \
  --region us-east-1)

echo "Database Endpoint: $DB_ENDPOINT"

# Get database port
DB_PORT=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-rds \
  --query "Stacks[0].Outputs[?OutputKey=='RDSInstancePort'].OutputValue" \
  --output text \
  --region us-east-1)

echo "Database Port: $DB_PORT"

# Get database name
DB_NAME=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-rds \
  --query "Stacks[0].Outputs[?OutputKey=='DatabaseName'].OutputValue" \
  --output text \
  --region us-east-1)

echo "Database Name: $DB_NAME"
```

#### 2.5.3 RDS Configuration Options

**Instance Classes:**
- `db.t4g.medium` - 2 vCPU, 4 GB RAM (default, good for dev)
- `db.t4g.large` - 2 vCPU, 8 GB RAM
- `db.r6g.large` - 2 vCPU, 16 GB RAM (better for production)

**Engine Versions:**
- `15.4` - PostgreSQL 15.4 (default)
- `16.4` - PostgreSQL 16.4
- `14.10` - PostgreSQL 14.10

**Storage:**
- `AllocatedStorage`: 20 GB (default, min 20 for gp3)
- `MaxAllocatedStorage`: 100 GB for autoscaling (default)

**Backup Settings:**
- `BackupRetentionPeriod`: 7 days (default)
- `PreferredBackupWindow`: 03:00-04:00 UTC (default)

**Security:**
- Encryption at rest is enabled by default
- Deletion protection is automatically enabled for production environments
- Database is deployed in **private subnets** for all environments
- RDS is **not publicly accessible**
- Security group allows PostgreSQL access from ECS tasks and AWS Client VPN clients only

#### 2.5.4 Connect to RDS (via VPN)

To connect to RDS from your local machine:

1. Connect to AWS Client VPN (see section 2.4.5)
2. Use your database client with the private RDS endpoint

**Do not** open port 5432 to the public internet.

**Connection string format:**
```
postgresql://username:password@host:port/database
```

Example:
```
postgresql://postgres:YourSecurePassword123!@bsp-blueprint-dev-rds.xxxxx.us-east-1.rds.amazonaws.com:5432/bspdb
```

### 2.6 Deploy Application Load Balancer (Deploy BEFORE ECS)
```bash
aws cloudformation deploy \
  --template-file 06-alb.yaml \
  --stack-name bsp-blueprint-dev-alb \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev \
  --region us-east-1
```

**Wait for this to complete** (takes 2-3 minutes)

**Important:** ALB must be deployed before ECS because the ECS service needs the ALB listener to be created first.

### 2.7 Deploy ECS Fargate

**Important:** ECS needs database connection information from the RDS stack. The deployment script automatically imports these values, but if deploying manually, you need to provide them.

#### Option 1: Automatic (using stack outputs)

```bash
# Get database information from RDS stack
DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-rds \
  --query "Stacks[0].Outputs[?OutputKey=='RDSInstanceEndpoint'].OutputValue" \
  --output text \
  --region us-east-1)

DB_PORT=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-rds \
  --query "Stacks[0].Outputs[?OutputKey=='RDSInstancePort'].OutputValue" \
  --output text \
  --region us-east-1)

DB_NAME=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-rds \
  --query "Stacks[0].Outputs[?OutputKey=='DatabaseName'].OutputValue" \
  --output text \
  --region us-east-1)

# Deploy ECS with database connection info
aws cloudformation deploy \
  --template-file 05-ecs-fargate.yaml \
  --stack-name bsp-blueprint-dev-ecs \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
    DatabaseHost=$DB_ENDPOINT \
    DatabasePort=$DB_PORT \
    DatabaseName=$DB_NAME \
    DatabaseUsername=postgres \
    DatabasePassword=YourSecurePassword123! \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

#### Option 2: Manual (values will be auto-imported from RDS stack)

If you don't provide database parameters, the template will automatically import them from the RDS stack outputs:

```bash
aws cloudformation deploy \
  --template-file 05-ecs-fargate.yaml \
  --stack-name bsp-blueprint-dev-ecs \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
    DatabaseUsername=postgres \
    DatabasePassword=YourSecurePassword123! \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

**Wait for this to complete** (takes 3-5 minutes)

**Note:** The ECS service is initially deployed without LoadBalancers. After ALB is deployed, update the ECS stack to add the load balancer (see step 2.7.5).

### 2.7.5 Update ECS Service to Add Load Balancer (After ALB is deployed)

**Important:** This step connects the ECS service to the ALB. The target group must be associated with an ALB listener before the ECS service can use it.

1. **Uncomment the LoadBalancers section in `05-ecs-fargate.yaml`** (around lines 187-190):
   ```yaml
   LoadBalancers:
     - ContainerName: !Sub '${ProjectName}-${Environment}-container'
       ContainerPort: !Ref ContainerPort
       TargetGroupArn: !Ref ECSTargetGroup
   ```

2. **Update the ECS stack:**
   ```bash
   aws cloudformation update-stack \
     --stack-name bsp-blueprint-dev-ecs \
     --template-body file://05-ecs-fargate.yaml \
     --parameters \
       ParameterKey=ProjectName,ParameterValue=bsp-blueprint \
       ParameterKey=Environment,ParameterValue=dev \
     --capabilities CAPABILITY_NAMED_IAM \
     --region us-east-1
   ```

**Alternative:** If you prefer to deploy ECS first without a load balancer, you can skip this step initially and add the load balancer later when needed.

### 2.8 Deploy WAF
```bash
# First get the ALB ARN
ALB_ARN=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-alb \
  --query "Stacks[0].Outputs[?OutputKey=='ALBArn'].OutputValue" \
  --output text \
  --region us-east-1)

aws cloudformation deploy \
  --template-file 07-waf.yaml \
  --stack-name bsp-blueprint-dev-waf \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev ALBArn=$ALB_ARN \
  --region us-east-1
```

### 2.9 Deploy CloudFront
```bash
# Get required values
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-alb \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" \
  --output text \
  --region us-east-1)

CLOUDFRONT_LOGS=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-s3 \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontLogsBucketName'].OutputValue" \
  --output text \
  --region us-east-1)

WAF_ARN=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-waf \
  --query "Stacks[0].Outputs[?OutputKey=='WebACLArn'].OutputValue" \
  --output text \
  --region us-east-1)

aws cloudformation deploy \
  --template-file 08-cloudfront.yaml \
  --stack-name bsp-blueprint-dev-cloudfront \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
    ALBDNSName=$ALB_DNS \
    CloudFrontLogsBucket=$CLOUDFRONT_LOGS \
    WebACLArn=$WAF_ARN \
  --region us-east-1
```

### 2.10 Deploy Route 53 (Optional - only if you have a domain)
```bash
# Replace 'yourdomain.com' with your actual domain
aws cloudformation deploy \
  --template-file 09-route53.yaml \
  --stack-name bsp-blueprint-dev-route53 \
  --parameter-overrides \
    ProjectName=bsp-blueprint \
    Environment=dev \
    DomainName=yourdomain.com \
    CloudFrontDistributionDomainName=<get-from-cloudfront-output> \
  --region us-east-1
```

## Step 3: Build and Push Docker Image

### 3.1 Get ECR Repository URI
```bash
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-ecr \
  --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryUri'].OutputValue" \
  --output text \
  --region us-east-1)

echo $ECR_URI
```

### 3.2 Login to ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI
```

### 3.3 Build Docker Image
```bash
cd ../..  # Go to project root
docker build -t bsp-blueprint:latest -f Dockerfile .
```

**Note:** If you don't have a Dockerfile yet, create one in the backend folder.

### 3.4 Tag and Push Image
```bash
docker tag bsp-blueprint:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

## Step 4: Update ECS Service with Image

### 4.1 Update Task Definition
```bash
# Get the task definition
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition bsp-blueprint-dev-task \
  --region us-east-1)

# Update with new image
aws ecs update-service \
  --cluster bsp-blueprint-dev-cluster \
  --service bsp-blueprint-dev-service \
  --force-new-deployment \
  --region us-east-1
```

## Step 5: Get Your Application URL

### 5.1 Get ALB DNS Name
```bash
aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-alb \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" \
  --output text \
  --region us-east-1
```

Your application will be available at: `http://<ALB-DNS-NAME>`

### 5.2 Get CloudFront URL (if deployed)
```bash
aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-cloudfront \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionDomainName'].OutputValue" \
  --output text \
  --region us-east-1
```

## Step 6: Verify Deployment

### Check ECS Service Status
```bash
aws ecs describe-services \
  --cluster bsp-blueprint-dev-cluster \
  --services bsp-blueprint-dev-service \
  --region us-east-1 \
  --query "services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}"
```

### Check ALB Target Health
```bash
TG_ARN=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-ecs \
  --query "Stacks[0].Outputs[?OutputKey=='ECSTargetGroupArn'].OutputValue" \
  --output text \
  --region us-east-1)

aws elbv2 describe-target-health --target-group-arn $TG_ARN --region us-east-1
```

## Troubleshooting

### If a stack fails:
1. Check the error in AWS Console → CloudFormation → Events
2. Common issues:
   - Resource limits (increase limits in AWS Console)
   - IAM permissions (ensure your user has admin or required permissions)
   - Region availability (some resources may not be available in all regions)
   - **Deployment order** - ensure stacks are deployed in the correct order

### ECS/ALB Target Group Error
**Error:** "The target group does not have an associated load balancer"

**Cause:** ECS service is trying to use a target group that hasn't been associated with an ALB listener yet.

**Solution:**
1. **Option 1 (Recommended):** Deploy ALB stack BEFORE ECS stack
   ```bash
   # Deploy ALB first
   aws cloudformation deploy --template-file 06-alb.yaml --stack-name bsp-blueprint-dev-alb ...

   # Then deploy ECS
   aws cloudformation deploy --template-file 05-ecs-fargate.yaml --stack-name bsp-blueprint-dev-ecs ...
   ```

2. **Option 2:** Deploy ECS without LoadBalancers, then:
   - Deploy ALB stack
   - Uncomment LoadBalancers section in `05-ecs-fargate.yaml` (lines 187-190)
   - Update ECS stack: `aws cloudformation update-stack --stack-name bsp-blueprint-dev-ecs --template-body file://05-ecs-fargate.yaml ...`

### If ECS tasks won't start:
1. Check CloudWatch Logs: `/ecs/bsp-blueprint-dev`
2. Verify the Docker image exists in ECR
3. Check security group rules
4. Verify task definition has correct image URI
5. Ensure target group is associated with ALB listener (if using load balancer)

### To delete everything:
```bash
# Delete in reverse order
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-route53 --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-cloudfront --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-waf --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-alb --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-ecs --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-rds --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-cognito-lambda --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-cognito --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-ecr --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-s3 --region us-east-1
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-vpc --region us-east-1
```

**Note:** Empty S3 buckets before deleting the S3 stack.

