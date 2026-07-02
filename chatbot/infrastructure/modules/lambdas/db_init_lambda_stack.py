from aws_cdk import (
    Stack,
    Duration,
    aws_lambda as _lambda,
    aws_ec2 as ec2,
    aws_iam as iam,
    CfnOutput,
)
from aws_cdk.aws_ecr_assets import Platform
from constructs import Construct


class DBInitLambdaStack(Stack):
    """
    Database Initialization Lambda Stack
    
    A one-time Lambda function that runs inside the VPC
    to initialize the PostgreSQL database with pgvector and RAG schema.
    
    The Lambda can be invoked manually via AWS CLI:
        aws lambda invoke --function-name bispy-bot-db-init-{env} response.json
    
    After successful initialization, this stack can be kept (for future resets)
    or deleted to save costs.
    """
    
    def __init__(
        self,
        scope: Construct,
        id: str,
        vpc: ec2.Vpc,
        lambda_sg: ec2.SecurityGroup,
        private_subnets: list,
        db_endpoint: str,
        db_port: str,
        db_name: str,
        db_secret_arn: str,
        config: dict,
        **kwargs
    ):
        super().__init__(scope, id, **kwargs)
        
        env_name = config["env"]["name"]
        
        # Create Lambda execution role
        lambda_role = iam.Role(
            self,
            "DBInitLambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="Execution role for database initialization Lambda"
        )
        
        # Add VPC execution permissions
        lambda_role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name(
                "service-role/AWSLambdaVPCAccessExecutionRole"
            )
        )
        
        # Add Secrets Manager permissions
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret"
                ],
                resources=[db_secret_arn]
            )
        )
        
        # Create Lambda function using Docker (to include psycopg2 dependency)
        self.db_init_lambda = _lambda.DockerImageFunction(
            self,
            "DBInitLambda",
            function_name=f"bispy-bot-db-init-{env_name}",
            code=_lambda.DockerImageCode.from_image_asset(
                "../src/lambdas/db_init",
                platform=Platform.LINUX_AMD64  # Cross-platform build
            ),
            role=lambda_role,
            timeout=Duration.minutes(5),
            memory_size=512,
            
            # Network configuration - runs inside VPC
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnets=private_subnets),
            security_groups=[lambda_sg],
            
            # Database connection details
            environment={
                "DB_HOST": db_endpoint,
                "DB_PORT": db_port,
                "DB_NAME": db_name,
                "DB_SECRET_ARN": db_secret_arn,
            },
            
            description="One-time Lambda to initialize PostgreSQL database with pgvector"
        )
        
        # Output Lambda function name
        CfnOutput(
            self,
            "DBInitLambdaName",
            value=self.db_init_lambda.function_name,
            description="Database initialization Lambda function name",
            export_name=f"DBInitLambdaName-{env_name}"
        )
        
        CfnOutput(
            self,
            "DBInitLambdaArn",
            value=self.db_init_lambda.function_arn,
            description="Database initialization Lambda ARN",
            export_name=f"DBInitLambdaArn-{env_name}"
        )
