# How to Generate AWS Access Key ID and Secret Access Key

## Method 1: Using AWS Console (Recommended)

### Step 1: Sign in to AWS Console
1. Go to https://console.aws.amazon.com/
2. Sign in with your AWS account

### Step 2: Navigate to IAM
1. In the search bar at the top, type "IAM" and click on **IAM** service
2. Or go directly to: https://console.aws.amazon.com/iam/

### Step 3: Create a New User
1. Click on **Users** in the left sidebar
2. Click **Create user** button
3. Enter a username (e.g., `cloudformation-deploy` or `bsp-blueprint-user`)
4. Click **Next**

### Step 4: Set Permissions
1. Select **Attach policies directly**
2. For CloudFormation deployment, you need these policies:
   - **PowerUserAccess** (recommended for development)
   - OR **AdministratorAccess** (full access - use with caution)

   **Note:** For production, create custom policies with least privilege.

3. Click **Next**

### Step 5: Review and Create
1. Review the user details
2. Click **Create user**

### Step 6: Create Access Keys
1. Click on the user you just created
2. Go to the **Security credentials** tab
3. Scroll down to **Access keys** section
4. Click **Create access key**

### Step 7: Choose Use Case
1. Select **Command Line Interface (CLI)**
2. Check the confirmation box
3. Click **Next**
4. (Optional) Add a description tag
5. Click **Create access key**

### Step 8: Save Your Credentials
**⚠️ IMPORTANT: Save these immediately - you won't be able to see the secret key again!**

1. You'll see:
   - **Access key ID**: `AKIAIOSFODNN7EXAMPLE`
   - **Secret access key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

2. Click **Download .csv file** to save them securely
3. OR copy them manually to a secure location

4. Click **Done**

### Step 9: Configure AWS CLI
Run this command in your terminal:

```bash
aws configure
```

Enter:
- **AWS Access Key ID**: [Paste your Access Key ID]
- **AWS Secret Access Key**: [Paste your Secret Access Key]
- **Default region name**: `us-east-1` (or your preferred region)
- **Default output format**: `json`

## Method 2: Using AWS CLI (If you already have admin access)

If you already have AWS CLI configured with admin credentials:

```bash
# Create a new IAM user
aws iam create-user --user-name bsp-blueprint-user

# Attach policy (PowerUserAccess)
aws iam attach-user-policy \
  --user-name bsp-blueprint-user \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Create access key
aws iam create-access-key --user-name bsp-blueprint-user
```

The output will contain your Access Key ID and Secret Access Key.

## Verify Your Credentials

Test that your credentials work:

```bash
aws sts get-caller-identity
```

You should see output like:
```json
{
    "UserId": "AIDAIOSFODNN7EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/bsp-blueprint-user"
}
```

## Security Best Practices

1. **Never commit credentials to Git**
   - Add `.aws/` to your `.gitignore`
   - Never share credentials in code or documentation

2. **Use IAM roles when possible**
   - For EC2 instances, use IAM roles instead of access keys
   - For CI/CD, use IAM roles with OIDC

3. **Rotate keys regularly**
   - Create new keys every 90 days
   - Delete old keys after confirming new ones work

4. **Use least privilege**
   - Only grant permissions needed for the task
   - Create separate users for different purposes

5. **Enable MFA**
   - Add Multi-Factor Authentication to your IAM user
   - Required for sensitive operations

## Troubleshooting

### "Access Denied" errors
- Check that your user has the correct permissions
- Verify the access key is active (not disabled)
- Ensure you're using the correct region

### "Invalid credentials"
- Double-check you copied the keys correctly (no extra spaces)
- Verify the keys haven't been deleted
- Check if the user account is active

### "User is not authorized"
- Attach the required IAM policies
- For CloudFormation, you need permissions for:
  - CloudFormation
  - EC2 (VPC, subnets, security groups)
  - ECS, ECR
  - S3
  - IAM (to create roles)
  - And other services in the stack

## Required IAM Policies for CloudFormation Deployment

Minimum required permissions:
- `CloudFormationFullAccess`
- `IAMFullAccess` (or custom policy for role creation)
- `EC2FullAccess`
- `ECSFullAccess`
- `ECRFullAccess`
- `S3FullAccess`
- `ElasticLoadBalancingFullAccess`
- `WAFV2FullAccess`
- `CloudFrontFullAccess`
- `Route53FullAccess`
- `CognitoUserPoolFullAccess`
- `LogsFullAccess`

Or simply use **PowerUserAccess** or **AdministratorAccess** for development.

## Alternative: Use AWS SSO (Single Sign-On)

For organizations, consider using AWS SSO:
1. Go to AWS SSO in the console
2. Set up your identity provider
3. Assign users to permission sets
4. Users can login and get temporary credentials

This is more secure and easier to manage for teams.

