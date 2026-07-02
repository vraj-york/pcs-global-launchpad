# AWS CloudFormation Infrastructure Setup

This directory contains CloudFormation templates to deploy a complete AWS infrastructure for the BSP Blueprint application.

## Architecture Overview

The infrastructure includes:

1. **VPC & Networking** - Virtual Private Cloud with public and private subnets, NAT gateways, and security groups
2. **S3 Buckets** - Application storage, logs, and CloudFront logs
3. **ECR Repository** - Docker container image registry
4. **Cognito** - User authentication and authorization
5. **Single RDS PostgreSQL** - Managed relational database instance (replaces Aurora)
6. **ECS Fargate** - Container orchestration with serverless compute
7. **Application Load Balancer (ALB)** - Load balancing and SSL termination
8. **WAF** - Web Application Firewall for security
9. **CloudFront** - Content delivery network
10. **Route 53** - DNS management

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```
3. **Domain Name** (optional, for Route 53 and SSL certificates)

## Deployment Order

The stacks must be deployed in the following order due to dependencies:

1. `01-vpc-network.yaml` - VPC and networking foundation
2. `02-s3-buckets.yaml` - S3 buckets for storage and logs
3. `03-ecr-repository.yaml` - ECR repository for Docker images
4. `04-cognito.yaml` - Cognito user pool
5. `09-single-rds-postgres.yaml` - Single RDS PostgreSQL instance (requires database credentials)
6. `05-ecs-fargate.yaml` - ECS cluster and Fargate service (depends on RDS)
7. `06-alb.yaml` - Application Load Balancer
8. `07-waf.yaml` - Web Application Firewall
9. `08-cloudfront.yaml` - CloudFront distribution
10. `09-route53.yaml` - Route 53 hosted zone and DNS records

## Quick Deployment

### Option 1: Automated Deployment Script

```bash
cd backend/cloudformation
chmod +x deploy.sh
./deploy.sh
```

You can customize the deployment by setting environment variables:

```bash
export PROJECT_NAME="bsp-blueprint"
export ENVIRONMENT="dev"
export AWS_REGION="us-east-1"
./deploy.sh
```

### Option 2: Manual Deployment

Deploy each stack individually:

```bash
# 1. VPC and Networking
aws cloudformation deploy \
  --template-file 01-vpc-network.yaml \
  --stack-name bsp-blueprint-dev-vpc \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM

# 2. S3 Buckets
aws cloudformation deploy \
  --template-file 02-s3-buckets.yaml \
  --stack-name bsp-blueprint-dev-s3 \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev

# 3. ECR Repository
aws cloudformation deploy \
  --template-file 03-ecr-repository.yaml \
  --stack-name bsp-blueprint-dev-ecr \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev

# 4. Cognito
aws cloudformation deploy \
  --template-file 04-cognito.yaml \
  --stack-name bsp-blueprint-dev-cognito \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev DomainPrefix=bsp-blueprint-dev

# 5. ECS Fargate
aws cloudformation deploy \
  --template-file 05-ecs-fargate.yaml \
  --stack-name bsp-blueprint-dev-ecs \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev \
  --capabilities CAPABILITY_NAMED_IAM

# 6. Application Load Balancer
aws cloudformation deploy \
  --template-file 06-alb.yaml \
  --stack-name bsp-blueprint-dev-alb \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev

# 7. WAF
aws cloudformation deploy \
  --template-file 07-waf.yaml \
  --stack-name bsp-blueprint-dev-waf \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev

# 8. CloudFront
# First, get the ALB DNS name and CloudFront logs bucket from previous stacks
ALB_DNS=$(aws cloudformation describe-stacks --stack-name bsp-blueprint-dev-alb \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" --output text)
CLOUDFRONT_LOGS=$(aws cloudformation describe-stacks --stack-name bsp-blueprint-dev-s3 \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontLogsBucketName'].OutputValue" --output text)

aws cloudformation deploy \
  --template-file 08-cloudfront.yaml \
  --stack-name bsp-blueprint-dev-cloudfront \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev \
    ALBDNSName=$ALB_DNS CloudFrontLogsBucket=$CLOUDFRONT_LOGS

# 9. Route 53 (optional, requires domain name)
aws cloudformation deploy \
  --template-file 09-route53.yaml \
  --stack-name bsp-blueprint-dev-route53 \
  --parameter-overrides ProjectName=bsp-blueprint Environment=dev \
    DomainName=yourdomain.com \
    CloudFrontDistributionDomainName=<cloudfront-domain-from-output>
```

## Post-Deployment Steps

### 1. Build and Push Docker Image to ECR

```bash
# Get ECR repository URI
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name bsp-blueprint-dev-ecr \
  --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryUri'].OutputValue" \
  --output text)

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI

# Build Docker image
cd ../..
docker build -t bsp-blueprint:latest -f Dockerfile .

# Tag image
docker tag bsp-blueprint:latest $ECR_URI:latest

# Push image
docker push $ECR_URI:latest
```

### 2. Update ECS Service with Image

```bash
# Update ECS task definition with the new image
aws ecs update-service \
  --cluster bsp-blueprint-dev-cluster \
  --service bsp-blueprint-dev-service \
  --force-new-deployment \
  --region us-east-1
```

### 3. Set Up SSL Certificate (for HTTPS)

1. Request a certificate in AWS Certificate Manager (ACM)
   - For ALB: Request in the same region as your ALB
   - For CloudFront: Request in `us-east-1` region
2. Update the ALB stack with the certificate ARN:
   ```bash
   aws cloudformation update-stack \
     --stack-name bsp-blueprint-dev-alb \
     --template-body file://06-alb.yaml \
     --parameters ParameterKey=ProjectName,ParameterValue=bsp-blueprint \
                  ParameterKey=Environment,ParameterValue=dev \
                  ParameterKey=CertificateArn,ParameterValue=<certificate-arn>
   ```

### 4. Configure Route 53

1. Update your domain's nameservers with the values from the Route 53 hosted zone output
2. Wait for DNS propagation (can take up to 48 hours)

## Stack Parameters

### Common Parameters (all stacks)
- `ProjectName`: Project identifier (default: `bsp-blueprint`)
- `Environment`: Environment name - dev, staging, or prod (default: `dev`)

### Stack-Specific Parameters

#### 04-cognito.yaml
- `DomainPrefix`: Unique prefix for Cognito hosted UI domain

#### 09-single-rds-postgres.yaml
- `DatabaseName`: Initial database name (default: `bspdb`)
- `MasterUsername`: Master database username (default: `postgres`)
- `MasterUserPassword`: Master database password (required, min 8 characters)
- `DBInstanceClass`: DB instance class (default: `db.t4g.medium`)
- `EngineVersion`: PostgreSQL engine version (default: `15.4`)
- `AllocatedStorage`: Allocated storage in GB (default: `20`)
- `MaxAllocatedStorage`: Upper limit for storage autoscaling in GB (default: `100`)
- `BackupRetentionPeriod`: Days to retain backups (default: `7`)
- `MultiAZ`: Enable Multi-AZ for HA (default: `false`, recommended for prod)
- `EnableDeletionProtection`: Enable deletion protection (default: `false`, auto-enabled for prod)
- `EnableStorageEncryption`: Enable encryption at rest (default: `true`)

#### 05-ecs-fargate.yaml
- `ContainerImage`: ECR image URI (optional, can be set after pushing image)
- `ContainerPort`: Container port (default: `3000`)
- `DesiredCount`: Number of tasks (default: `2`)
- `Cpu`: CPU units - 256, 512, 1024, 2048, 4096 (default: `256`)
- `Memory`: Memory in MB - 512, 1024, 2048, 4096, 8192, 16384 (default: `512`)
- `DatabaseHost`: RDS instance endpoint (optional, auto-imported from RDS stack)
- `DatabasePort`: Database port (default: `5432`)
- `DatabaseName`: Database name (optional, auto-imported from RDS stack)
- `DatabaseUsername`: Database username (optional)
- `DatabasePassword`: Database password (optional)

#### 06-alb.yaml
- `CertificateArn`: ACM certificate ARN for HTTPS (optional)

#### 07-waf.yaml
- `ALBArn`: ALB ARN for WAF association (optional)

#### 08-cloudfront.yaml
- `ALBDNSName`: ALB DNS name (required)
- `CertificateArn`: ACM certificate ARN in us-east-1 (optional)
- `DomainName`: Custom domain name (optional)
- `WebACLArn`: WAF Web ACL ARN (optional)
- `CloudFrontLogsBucket`: S3 bucket for CloudFront logs (required)

#### 09-route53.yaml
- `DomainName`: Domain name for hosted zone (required)
- `CloudFrontDistributionDomainName`: CloudFront domain (optional)
- `ALBDNSName`: ALB DNS name (optional)

## Outputs

Each stack exports outputs that can be used by other stacks. Key outputs:

- **VPC Stack**: VPC ID, Subnet IDs, Security Group IDs
- **S3 Stack**: Bucket names and ARNs
- **ECR Stack**: Repository URI and name
- **Cognito Stack**: User Pool ID, Client ID, Domain
- **RDS Stack**: RDSInstanceEndpoint, RDSInstancePort, DatabaseName, RDSecurityGroupId
- **ECS Stack**: Cluster name, Service name, Target Group ARN
- **ALB Stack**: DNS name, ARN, Listener ARN
- **WAF Stack**: Web ACL ID and ARN
- **CloudFront Stack**: Distribution ID, Domain name, ARN
- **Route 53 Stack**: Hosted Zone ID, Name servers

## Cost Considerations

- **NAT Gateways**: ~$32/month each (2 in this setup = ~$64/month)
- **ALB**: ~$16/month + data transfer
- **RDS PostgreSQL**: ~$30-150/month (depends on instance class and storage)
- **ECS Fargate**: Pay per vCPU and memory used
- **CloudFront**: Pay per data transfer
- **Route 53**: $0.50 per hosted zone/month

**Estimated monthly cost for dev environment**: ~$150-300 (depending on usage and database size)

## Troubleshooting

### Stack deployment fails
- Check CloudFormation events in AWS Console
- Verify all prerequisites are met
- Ensure previous stacks are deployed successfully

### ECS tasks not starting
- Check ECS service events
- Verify task definition has correct image URI
- Check security group rules
- Verify IAM roles have correct permissions

### ALB health checks failing
- Ensure your application has a `/health` endpoint
- Check security group allows traffic from ALB
- Verify container port matches ALB target group port

### CloudFront not working
- Verify ALB DNS name is correct
- Check CloudFront distribution status
- Ensure origin is accessible

## Cleanup

To delete all stacks (in reverse order):

```bash
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-route53
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-cloudfront
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-waf
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-alb
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-ecs
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-rds
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-cognito
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-ecr
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-s3
aws cloudformation delete-stack --stack-name bsp-blueprint-dev-vpc
```

**Note**: S3 buckets will need to be emptied before deletion. NAT Gateways and EIPs may incur charges until fully deleted.

## Security Best Practices

1. **Use HTTPS**: Always use SSL/TLS certificates for production
2. **WAF Rules**: Customize WAF rules based on your application needs
3. **Security Groups**: Follow principle of least privilege
4. **IAM Roles**: Use specific IAM roles with minimal permissions
5. **Encryption**: Enable encryption at rest for S3 buckets and RDS databases
6. **VPC**: Use private subnets for ECS tasks and RDS databases
7. **Secrets**: Use AWS Secrets Manager or Parameter Store for sensitive data (recommended for database passwords)
8. **Database**: RDS is deployed in private subnets (prod) with security groups restricting access to ECS tasks only

## Additional Resources

- [AWS CloudFormation Documentation](https://docs.aws.amazon.com/cloudformation/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Route 53 Documentation](https://docs.aws.amazon.com/route53/)

