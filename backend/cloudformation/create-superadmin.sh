#!/bin/bash

# Script to create SuperAdmin user in Cognito
# Usage: ./create-superadmin.sh [user-pool-id] [email] [password]

set -e

# Configuration
PROJECT_NAME="${PROJECT_NAME:-bsp-blueprint}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
REGION="${AWS_REGION:-us-east-1}"

# Parameters
USER_POOL_ID="${1:-}"
EMAIL="${2:-anuj@york.ie}"
PASSWORD="${3:-Admin@123}"
GROUP_NAME="SuperAdmin"

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

# Get User Pool ID if not provided
if [ -z "$USER_POOL_ID" ]; then
    print_info "Getting User Pool ID from CloudFormation stack..."
    USER_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name ${PROJECT_NAME}-${ENVIRONMENT}-cognito \
        --region $REGION \
        --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
        --output text 2>/dev/null || echo "")

    if [ -z "$USER_POOL_ID" ]; then
        print_error "Could not find User Pool ID. Please provide it as first argument:"
        print_error "  ./create-superadmin.sh <user-pool-id> [email] [password]"
        exit 1
    fi
    print_info "Found User Pool ID: $USER_POOL_ID"
fi

print_info "Creating SuperAdmin user..."
print_info "  Email: $EMAIL"
print_info "  User Pool ID: $USER_POOL_ID"
print_info "  Group: $GROUP_NAME"
echo ""

# Step 1: Create the user
print_info "Step 1: Creating user..."
aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --user-attributes \
        Name=email,Value="$EMAIL" \
        Name=email_verified,Value=true \
    --temporary-password "TempPass123!" \
    --message-action SUPPRESS \
    --region $REGION

if [ $? -eq 0 ]; then
    print_info "✅ User created successfully"
else
    print_error "❌ Failed to create user"
    exit 1
fi

# Step 2: Set permanent password
print_info "Step 2: Setting permanent password..."
aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --password "$PASSWORD" \
    --permanent \
    --region $REGION

if [ $? -eq 0 ]; then
    print_info "✅ Password set successfully"
else
    print_error "❌ Failed to set password"
    exit 1
fi

# Step 3: Add user to SuperAdmin group
print_info "Step 3: Adding user to SuperAdmin group..."
aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --group-name "$GROUP_NAME" \
    --region $REGION

if [ $? -eq 0 ]; then
    print_info "✅ User added to SuperAdmin group successfully"
else
    print_error "❌ Failed to add user to group"
    exit 1
fi

echo ""
print_info "=========================================="
print_info "SuperAdmin user created successfully!"
print_info "=========================================="
print_info "Email: $EMAIL"
print_info "Password: $PASSWORD"
print_info "Group: $GROUP_NAME"
print_info "User Pool ID: $USER_POOL_ID"
echo ""
print_warn "Note: User can now login with email and password."
print_warn "After first login, they will receive email OTP for 2FA (if Lambda is configured)."

