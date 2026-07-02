"""
CDK Stack for Assessment API Lambda
FastAPI application running in Lambda with Docker container
"""
import json

from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_lambda as _lambda,
    aws_logs as logs,
    aws_ec2 as ec2,
    aws_s3 as s3,
    aws_sqs as sqs,
)
from aws_cdk.aws_ecr_assets import Platform
from constructs import Construct

from cors_config import frontend_origin_from_config, lambda_cors_frontend_origin


class AssessmentAPIStack(Stack):
    """
    Assessment API Lambda Stack
    - FastAPI application in Docker container
    - Connected to shared RDS via VPC
    - Uses Secrets Manager for DB credentials
    - Exposed via API Gateway (not Function URL)
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        config: dict,
        shared_vpc,
        lambda_sg,
        lambda_role,
        rds_secret_arn: str,
        scoring_queue: sqs.IQueue,
        report_queue: sqs.IQueue,
        reports_bucket: s3.IBucket,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        env_name = config["env"]["name"]
        api_config = config["lambda"]["api"]
        rds_config = config["rds"]

        # Import the existing RDS secret
        from aws_cdk import aws_secretsmanager as secretsmanager
        rds_secret = secretsmanager.Secret.from_secret_complete_arn(
            self, "RDSSecret", rds_secret_arn
        )

        reports_prefix = (
            config.get("s3", {}).get("reports_prefix", "assessment_report/").strip()
        )
        print_html_prefix = (
            config.get("s3", {}).get("print_html_prefix", "assessment_print_html/").strip()
        )

        cors_origin = lambda_cors_frontend_origin(env_name, config)
        cognito_pool_id = (config.get("cognito") or {}).get("user_pool_id", "").strip()
        api_env = {
            "ENVIRONMENT": env_name,
            "LOG_LEVEL": "INFO",
            "RDS_SECRET_ARN": rds_secret_arn,
            "DB_HOST": rds_config["host"],
            "DB_PORT": str(rds_config["port"]),
            "DB_NAME": rds_config["db_name"],
            "SCORING_QUEUE_URL": scoring_queue.queue_url,
            "REPORT_QUEUE_URL": report_queue.queue_url,
            "REPORTS_BUCKET": reports_bucket.bucket_name,
            "REPORTS_PREFIX": reports_prefix,
            "PRINT_HTML_PREFIX": print_html_prefix,
            "CORS_ORIGINS": json.dumps([cors_origin]),
        }
        frontend_origin = frontend_origin_from_config(config)
        if frontend_origin:
            api_env["FRONTEND_ORIGIN"] = frontend_origin
        if cognito_pool_id:
            api_env["COGNITO_USER_POOL_ID"] = cognito_pool_id

        api_lambda = _lambda.DockerImageFunction(
            self,
            "AssessmentAPIFunction",
            function_name=f"assessment-api-{env_name}",
            description=f"Assessment Module FastAPI ({env_name})",
            code=_lambda.DockerImageCode.from_image_asset(
                "../src",
                platform=Platform.LINUX_AMD64,  # REQUIRED on Apple Silicon
            ),
            timeout=Duration.seconds(api_config["timeout"]),
            memory_size=api_config["memory_size"],
            vpc=shared_vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_group_name="Private"),
            security_groups=[lambda_sg],
            role=lambda_role,
            environment=api_env,
            log_retention=logs.RetentionDays.ONE_WEEK,
        )

        rds_secret.grant_read(api_lambda)
        scoring_queue.grant_send_messages(api_lambda)
        report_queue.grant_send_messages(api_lambda)

        # Store Lambda reference for API Gateway
        self.api_lambda = api_lambda
        self.api_lambda_arn = api_lambda.function_arn

        # Outputs
        CfnOutput(
            self,
            "APILambdaArn",
            value=api_lambda.function_arn,
            description=f"Assessment API Lambda ARN ({env_name})",
            export_name=f"assessment-api-lambda-arn-{env_name}",
        )

        CfnOutput(
            self,
            "APILambdaName",
            value=api_lambda.function_name,
            description=f"Assessment API Lambda Name ({env_name})",
            export_name=f"assessment-api-lambda-name-{env_name}",
        )
