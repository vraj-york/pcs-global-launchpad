from aws_cdk import (
    Stack,
    Duration,
    aws_lambda as _lambda,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_s3 as s3,
    CfnOutput,
)
from aws_cdk.aws_ecr_assets import Platform
from constructs import Construct


class IngestLambdaStack(Stack):
    """
    Document Ingestion Lambda Stack
    
    This Lambda ingests documents from S3 into the RAG database.
    It runs inside the VPC and has access to S3, RDS, and Bedrock.
    
    Usage:
        aws lambda invoke --function-name bispy-bot-ingest-{env} \
            --payload '{"s3_bucket": "bucket", "s3_key": "documents/file.pptx"}' \
            response.json
    """
    
    def __init__(
        self,
        scope: Construct,
        id: str,
        vpc: ec2.Vpc,
        lambda_sg: ec2.SecurityGroup,
        private_subnets: list,
        documents_bucket: s3.Bucket,
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
            "IngestLambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="Execution role for document ingestion Lambda"
        )
        
        # Add VPC execution permissions
        lambda_role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name(
                "service-role/AWSLambdaVPCAccessExecutionRole"
            )
        )
        
        # Add S3 read permissions
        documents_bucket.grant_read(lambda_role)
        
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
        
        # Add Bedrock permissions for embeddings
        lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=["bedrock:InvokeModel"],
                resources=[
                    "arn:aws:bedrock:*:*:foundation-model/amazon.titan-embed-text-v2:0"
                ]
            )
        )
        
        # Create Lambda function using Docker
        # Build context is ../src/ so we can include shared/ package
        self.ingest_lambda = _lambda.DockerImageFunction(
            self,
            "IngestLambda",
            function_name=f"bispy-bot-ingest-{env_name}",
            code=_lambda.DockerImageCode.from_image_asset(
                "../src",
                file="lambdas/ingest/Dockerfile",
                platform=Platform.LINUX_AMD64
            ),
            role=lambda_role,
            timeout=Duration.minutes(5),
            memory_size=1024,  # More memory for processing
            
            # Network configuration
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnets=private_subnets),
            security_groups=[lambda_sg],
            
            # Environment variables
            environment={
                "DB_HOST": db_endpoint,
                "DB_PORT": db_port,
                "DB_NAME": db_name,
                "DB_SECRET_ARN": db_secret_arn,
                "CHUNK_SIZE": str(config.get("lambda", {}).get("ingestion", {}).get("chunk_size", 2000)),
                "CHUNK_OVERLAP": str(config.get("lambda", {}).get("ingestion", {}).get("chunk_overlap", 200)),
            },
            
            description="Lambda to ingest documents from S3 into RAG database"
        )
        
        # Output Lambda function name
        CfnOutput(
            self,
            "IngestLambdaName",
            value=self.ingest_lambda.function_name,
            description="Document ingestion Lambda function name",
            export_name=f"IngestLambdaName-{env_name}"
        )
        
        CfnOutput(
            self,
            "IngestLambdaArn",
            value=self.ingest_lambda.function_arn,
            description="Document ingestion Lambda ARN",
            export_name=f"IngestLambdaArn-{env_name}"
        )
