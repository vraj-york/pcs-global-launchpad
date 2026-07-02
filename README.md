# BSP Blueprint

A full-stack application blueprint with React frontend, NestJS backend, and AWS infrastructure deployed via CloudFormation. This project provides a production-ready foundation with CI/CD, authentication, and scalable cloud architecture.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront (CDN)                      │
│                    (Frontend + Backend API)                  │
└────────────┬──────────────────────────────┬──────────────────┘
             │                              │
             │                              │
    ┌────────▼────────┐          ┌────────▼────────┐
    │   S3 Bucket      │          │   WAF + ALB     │
    │  (Static Files)  │          │  (Load Balancer) │
    └──────────────────┘          └────────┬────────┘
                                           │
                                    ┌──────▼──────┐
                                    │ ECS Fargate │
                                    │  (Backend)   │
                                    └─────────────┘
```

### Infrastructure Components

- **Frontend**: React SPA hosted on S3 + CloudFront
- **Backend**: NestJS API running on ECS Fargate
- **Authentication**: AWS Cognito with email OTP (2FA)
- **Networking**: VPC with public/private subnets, ALB, WAF
- **CI/CD**: Bitbucket Pipelines for automated deployment
- **Monitoring**: CloudWatch logs and metrics

## 📦 Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Yup
- **Routing**: React Router DOM 7
- **Design Tokens**: Tokens Studio + Style Dictionary

### Backend
- **Framework**: NestJS 11
- **Language**: TypeScript
- **API Documentation**: Swagger/OpenAPI
- **Container**: Docker
- **Runtime**: Node.js 20

### Infrastructure
- **IaC**: AWS CloudFormation
- **Compute**: ECS Fargate
- **Storage**: S3
- **CDN**: CloudFront
- **Load Balancing**: Application Load Balancer (ALB)
- **Security**: WAF, Cognito, IAM
- **DNS**: Route 53 (optional)

### DevOps
- **CI/CD**: Bitbucket Pipelines
- **Container Registry**: Amazon ECR
- **Monitoring**: CloudWatch

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and **pnpm** 9+ (or npm)
- **AWS CLI** installed and configured
- **Docker** (for local backend development)
- **AWS Account** with appropriate permissions
- **Bitbucket Repository** (for CI/CD)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd bsp-blueprint

# Install frontend dependencies
cd frontend
pnpm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment Variables

#### Frontend

Create `frontend/.env`:

```env
VITE_AWS_USER_POOL_ID=your-user-pool-id
VITE_AWS_USER_POOL_CLIENT_ID=your-client-id
```

If you want a separate "remember me" behaviour (longer refresh token lifetime), add the optional remember-me client ID:

```env
VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER=your-remember-me-client-id
```

Notes:
- The repository can use two Cognito App Clients: one with short-lived refresh tokens (e.g. 1 day) for regular sign-ins, and one with long-lived refresh tokens (e.g. 30 days) used when users check "Remember me". The frontend will choose which client to use at login time.
- After updating CloudFormation (to add the remember-me client), rebuild and redeploy the frontend so the `VITE_` variables are baked into the build.

#### Backend

Backend environment variables are configured via ECS task definitions. For local development, create `.env` in the backend directory if needed.

### 3. Run Locally

#### Frontend

```bash
cd frontend
pnpm dev
# Frontend runs on http://localhost:5173
```

#### Backend

```bash
cd backend
npm run start:dev
# Backend API runs on http://localhost:3000
# Swagger docs available at http://localhost:3000/api
```

## 📁 Project Structure

```
bsp-blueprint/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components (UI, auth, etc.)
│   │   ├── pages/           # Page components
│   │   ├── routes/          # Route definitions
│   │   ├── store/           # Zustand state management
│   │   ├── config/          # Configuration (Amplify, etc.)
│   │   └── tokens/          # Design tokens
│   ├── public/              # Static assets
│   └── package.json
│
├── backend/                 # NestJS backend application
│   ├── src/                 # Source code
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   └── main.ts         # Application entry point
│   ├── cloudformation/      # AWS infrastructure templates
│   │   ├── 01-vpc-network.yaml
│   │   ├── 02-s3-buckets.yaml
│   │   ├── 03-ecr-repository.yaml
│   │   ├── 04-cognito.yaml
│   │   ├── 05-ecs-fargate.yaml
│   │   ├── 06-alb.yaml
│   │   ├── 07-waf.yaml
│   │   ├── 08-cloudfront.yaml
│   │   ├── 09-route53.yaml
│   │   ├── 10-frontend-s3.yaml
│   │   ├── 11-frontend-cloudfront.yaml
│   │   ├── deploy.sh        # Automated deployment script
│   │   └── deploy-frontend.sh
│   ├── Dockerfile           # Docker image for backend
│   └── package.json
│
├── bitbucket-pipelines.yml  # CI/CD configuration
└── README.md               # This file
```

## 🛠️ Development

### Frontend Development

```bash
cd frontend

# Start development server
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint

# Start Storybook
pnpm storybook

# Build design tokens
pnpm build-tokens
```

### Backend Development

```bash
cd backend

# Start in development mode (watch mode)
npm run start:dev

# Build
npm run build

# Start production build
npm run start:prod

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Lint
npm run lint
```

### Docker Development

```bash
# Build Docker image
cd backend
docker build --platform linux/amd64 -t bsp-blueprint:latest .

# Run locally
docker run -p 3000:3000 bsp-blueprint:latest
```

## 🚢 Deployment

### Infrastructure Deployment

Deploy AWS infrastructure using CloudFormation:

```bash
cd backend/cloudformation

# Automated deployment (recommended)
./deploy.sh

# Or deploy manually (see DEPLOYMENT_STEPS.md)
```

**Deployment Order:**
1. VPC & Networking
2. S3 Buckets
3. ECR Repository
4. Cognito User Pool
5. ALB (Application Load Balancer)
6. ECS Fargate
7. WAF
8. CloudFront
9. Route 53 (optional)
10. Frontend S3 & CloudFront

### Frontend Deployment

```bash
cd backend/cloudformation

# Deploy frontend (builds and uploads to S3)
./deploy-frontend.sh
```

This script will:
1. Build the React application
2. Upload static files to S3
3. Invalidate CloudFront cache

### Backend Deployment

The backend is automatically deployed via Bitbucket Pipelines when you push to `main`, `master`, or `dev` branches.

**Manual deployment:**

```bash
cd backend/cloudformation

# Build and push Docker image
./push-docker-image.sh

# Or manually:
docker build --platform linux/amd64 -t bsp-blueprint:latest .
docker tag bsp-blueprint:latest <ECR_URI>:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ECR_URI>
docker push <ECR_URI>:latest
```

## 🔄 CI/CD Pipeline

The project uses **Bitbucket Pipelines** for automated CI/CD.

### Pipeline Workflow

1. **Build & Push Docker Image**: Builds backend Docker image and pushes to ECR
2. **Deploy to ECS**: Updates ECS service with new image
3. **Build & Deploy Frontend**: Builds React app and deploys to S3 + CloudFront

### Configuration

Pipeline triggers on:
- `main` / `master` / `dev` branches: Full deployment
- Pull requests: Build validation only
- Custom pipelines: Manual triggers

### Required Bitbucket Variables

Set these in **Repository Settings → Pipelines → Repository variables**:

- `AWS_ACCESS_KEY_ID`: AWS access key for CI/CD user
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (default: `us-east-1`)
- `PROJECT_NAME`: Project name (default: `bsp-blueprint`)
- `ENVIRONMENT`: Environment name (default: `dev`)
- `VITE_AWS_USER_POOL_ID`: Cognito User Pool ID (for frontend build)
- `VITE_AWS_USER_POOL_CLIENT_ID`: Cognito Client ID (for frontend build)
- `VITE_API_BASE_URL`: API base URL (for frontend build, optional)

### IAM Permissions

The Bitbucket CI/CD user needs permissions for:
- ECR: Push/pull images
- ECS: Update services
- S3: Upload frontend files
- CloudFront: Create invalidations
- CloudFormation: Read stack outputs

Run the setup script:

```bash
cd backend/cloudformation
./update-bitbucket-iam.sh
```

## 🔐 Authentication

The application uses **AWS Cognito** for authentication with:

- **Email OTP (2FA)**: Custom authentication flow
- **No self-signup**: Admin creates users only
- **SuperAdmin group**: Pre-configured admin group

### Create SuperAdmin User

```bash
cd backend/cloudformation
./create-superadmin.sh
```

This will prompt for:
- Email address
- Temporary password
- User will be added to SuperAdmin group

## 📚 Documentation

### Detailed Guides

- **[Deployment Steps](./backend/cloudformation/DEPLOYMENT_STEPS.md)**: Complete infrastructure deployment guide
- **[Frontend Setup](./backend/cloudformation/FRONTEND_SETUP.md)**: Frontend infrastructure and deployment
- **[Bitbucket CI/CD Setup](./backend/cloudformation/BITBUCKET_CI_CD_SETUP.md)**: CI/CD pipeline configuration
- **[AWS Credentials Setup](./backend/cloudformation/AWS_CREDENTIALS_SETUP.md)**: AWS CLI configuration

### API Documentation

Once the backend is running, access Swagger documentation at:
- **Local**: http://localhost:3000/api
- **Production**: https://your-domain.com/api

## 🌍 Environment Variables

### Frontend (Build-time)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_AWS_USER_POOL_ID` | Cognito User Pool ID | Yes |
| `VITE_AWS_USER_POOL_CLIENT_ID` | Cognito Client ID | Yes |
| `VITE_API_BASE_URL` | API base URL | No |

**Note**: These are embedded at build time. To change values, rebuild and redeploy.

### Backend (Runtime)

Backend environment variables are configured via ECS task definitions. Common variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (production, development)

## 🧪 Testing

### Frontend

```bash
cd frontend
pnpm test          # Run tests
pnpm storybook     # Component testing with Storybook
```

### Backend

```bash
cd backend
npm run test       # Unit tests
npm run test:e2e   # End-to-end tests
npm run test:cov   # Coverage report
```

## 🐛 Troubleshooting

### Common Issues

**1. ECS container exits immediately**
- Check CloudWatch logs: `aws logs tail /ecs/bsp-blueprint-dev --follow`
- Verify health check endpoint is accessible
- Check Dockerfile CMD path matches build output

**2. Frontend build fails in pipeline**
- Verify `VITE_AWS_USER_POOL_ID` and `VITE_AWS_USER_POOL_CLIENT_ID` are set in Bitbucket variables
- Check Node.js version (requires 18+)

**3. S3 upload permission denied**
- Run `./update-bitbucket-iam.sh` to update IAM permissions
- Verify IAM user has `s3:PutObject` and `s3:ListBucket` permissions

**4. CloudFormation stack fails**
- Check deployment order (ALB must be before ECS)
- Verify all prerequisites are met
- Check CloudFormation events for specific errors

## 📝 Scripts Reference

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `backend/cloudformation/deploy.sh` | Deploy all infrastructure stacks |
| `backend/cloudformation/deploy-frontend.sh` | Build and deploy frontend |
| `backend/cloudformation/push-docker-image.sh` | Build and push Docker image to ECR |
| `backend/cloudformation/create-superadmin.sh` | Create SuperAdmin user in Cognito |
| `backend/cloudformation/update-bitbucket-iam.sh` | Update IAM permissions for CI/CD |

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

[Add your license here]

## 🔗 Useful Links

- [NestJS Documentation](https://docs.nestjs.com)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vite.dev)
- [AWS CloudFormation](https://docs.aws.amazon.com/cloudformation/)
- [Bitbucket Pipelines](https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/)

---

**Need Help?** Check the detailed guides in `backend/cloudformation/` or review the CloudWatch logs for deployment issues.
