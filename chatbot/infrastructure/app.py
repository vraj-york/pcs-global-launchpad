#!/usr/bin/env python3
"""
Improved CDK App with Better Practices

Improvements over app.py:
1. Uses ConfigLoader for centralized config management
2. Adds resource tagging
3. Better error handling
4. More CloudFormation outputs
5. Cleaner structure
"""

import aws_cdk as cdk
import aws_cdk.aws_ec2 as ec2
import os
import sys
import logging

from config_loader import load_config, ConfigLoader
from modules.api.network_stack import NetworkStack
from modules.api.endpoints_stack import EndpointsStack
from modules.iam.iam_stacks import IAMStack
from modules.data.s3_stack import S3Stack
from modules.kms.kms_messages_stack import KmsMessagesStack
from modules.lambdas.db_init_lambda_stack import DBInitLambdaStack
from modules.lambdas.ingestion_lambda_stack import IngestLambdaStack
from modules.lambdas.runtime_stack import RuntimeStack
from modules.observability.pipeline_observability_stack import PipelineObservabilityStack
from modules.api.api_stacks import APIGatewayStack

logger = logging.getLogger(__name__)


def validate_aws_environment():
    """Validate AWS credentials are configured"""
    account = os.environ.get("CDK_DEFAULT_ACCOUNT")
    region = os.environ.get("CDK_DEFAULT_REGION")
    
    if not account or not region:
        logger.error("ERROR: AWS credentials not configured!")
        logger.error("Please run: aws configure")
        logger.error("Or set CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION environment variables")
        sys.exit(1)
    
    return account, region


def main():
    """Main application entry point"""
    app = cdk.App()
    
    # Get environment name from context
    env_name = app.node.try_get_context("env") or "stage"
    # Validate AWS credentials
    account, region = validate_aws_environment()
    
    # Load and validate configuration
    config = load_config(env_name)
    
    # Create AWS environment
    aws_env = cdk.Environment(account=account, region=region)
    
    # Get default tags
    default_tags = ConfigLoader.get_default_tags(env_name)

    # Shared RDS connection details provided by the backend team.
    # config_loader already validated that these fields are non-empty.
    rds_config = config["rds"]
    db_host       = rds_config["host"]
    db_port       = str(rds_config["port"])
    db_name       = rds_config["db_name"]
    db_secret_arn = rds_config["secret_arn"]
    backend_rds_sg_id = rds_config["security_group_id"]
    
    # Create stacks
    network_stack = NetworkStack(
        app,
        f"ChatbotNetworkStack-{env_name}",
        config=config,
        env=aws_env,
        description=f"Network infrastructure for Bispy Bot ({env_name})"
    )

    # KMS stack must be created before IAMStack so the key object can be passed
    # into the IAM role policy (kms:GenerateDataKey + kms:Decrypt).
    kms_stack = KmsMessagesStack(
        app,
        f"ChatbotKmsStack-{env_name}",
        env_name=env_name,
        env=aws_env,
        description=f"KMS CMK for chatbot message encryption ({env_name})"
    )

    iam_stack = IAMStack(
        app,
        f"ChatbotIAMStack-{env_name}",
        db_secret_arn=db_secret_arn,
        kms_messages_key=kms_stack.messages_key,
        bedrock_guardrail_id=config.get("bedrock_guardrail_id"),
        env=aws_env,
        description=f"IAM roles and policies for Bispy Bot ({env_name})"
    )
    
    endpoints_stack = EndpointsStack(
        app,
        f"ChatbotEndpointsStack-{env_name}",
        vpc=network_stack.vpc,
        lambda_sg=network_stack.lambda_sg,
        private_subnets=network_stack.private_app_subnets,
        env=aws_env,
        config=config,
        description=f"VPC endpoints for Bispy Bot ({env_name})"
    )
    
    # RAG Infrastructure
    s3_stack = S3Stack(
        app,
        f"ChatbotS3Stack-{env_name}",
        config=config,
        env=aws_env,
        description=f"S3 document storage for Bispy Bot RAG ({env_name})"
    )

    # Allow chatbot Lambdas to reach the backend team's RDS on port 5432.
    # We import the existing security group by ID and add a single inbound rule;
    # CDK will reconcile the rule without touching anything else on the SG.
    backend_rds_sg = ec2.SecurityGroup.from_security_group_id(
        network_stack,
        "BackendRDSSecurityGroup",
        security_group_id=backend_rds_sg_id,
        allow_all_outbound=False,
        mutable=True,
    )
    backend_rds_sg.add_ingress_rule(
        peer=network_stack.lambda_sg,
        connection=ec2.Port.tcp(5432),
        description=f"Allow chatbot Lambdas ({env_name}) to reach shared RDS on 5432",
    )

    # Database Initialization Lambda (one-time setup)
    db_init_stack = DBInitLambdaStack(
        app,
        f"ChatbotDBInitStack-{env_name}",
        vpc=network_stack.vpc,
        lambda_sg=network_stack.lambda_sg,
        private_subnets=network_stack.private_app_subnets,
        db_endpoint=db_host,
        db_port=db_port,
        db_name=db_name,
        db_secret_arn=db_secret_arn,
        config=config,
        env=aws_env,
        description=f"Database initialization Lambda for Bispy Bot ({env_name})"
    )
    
    # Document Ingestion Lambda (for RAG)
    ingest_stack = IngestLambdaStack(
        app,
        f"ChatbotIngestStack-{env_name}",
        vpc=network_stack.vpc,
        lambda_sg=network_stack.lambda_sg,
        private_subnets=network_stack.private_app_subnets,
        documents_bucket=s3_stack.documents_bucket,
        db_endpoint=db_host,
        db_port=db_port,
        db_name=db_name,
        db_secret_arn=db_secret_arn,
        config=config,
        env=aws_env,
        description=f"Document ingestion Lambda for Bispy Bot RAG ({env_name})"
    )
    
    runtime_stack = RuntimeStack(
        app,
        f"ChatbotRuntimeStack-{env_name}",
        vpc=network_stack.vpc,
        lambda_sg=network_stack.lambda_sg,
        private_subnets=network_stack.private_app_subnets,
        iam_stack=iam_stack,
        config=config,
        # Database connection for RAG (shared backend RDS instance)
        db_endpoint=db_host,
        db_port=db_port,
        db_name=db_name,
        db_secret_arn=db_secret_arn,
        # KMS key ARN for AES-256-GCM envelope encryption (Thread & Trim)
        kms_key_arn=kms_stack.key_arn,
        env=aws_env,
        description=f"Lambda runtime for Bispy Bot ({env_name})"
    )
    
    api_stack = APIGatewayStack(
        app,
        f"ChatbotApiStack-{env_name}",
        chatbot_lambda=runtime_stack.chatbot_invoke_target,
        env=aws_env,
        description=f"API Gateway for Bispy Bot ({env_name})"
    )

    observability_stack = PipelineObservabilityStack(
        app,
        f"ChatbotObservabilityStack-{env_name}",
        env_name=env_name,
        stream_lambda=runtime_stack.stream_lambda,
        runtime_lambda=runtime_stack.chatbot_lambda,
        config=config,
        env=aws_env,
        description=f"Pipeline telemetry dashboard and alarms ({env_name})",
    )
    
    # Set up stack dependencies
    iam_stack.add_dependency(network_stack)
    iam_stack.add_dependency(kms_stack)
    endpoints_stack.add_dependency(network_stack)
    s3_stack.add_dependency(network_stack)
    db_init_stack.add_dependency(network_stack)
    db_init_stack.add_dependency(iam_stack)
    ingest_stack.add_dependency(network_stack)
    ingest_stack.add_dependency(s3_stack)
    runtime_stack.add_dependency(endpoints_stack)
    runtime_stack.add_dependency(iam_stack)
    runtime_stack.add_dependency(kms_stack)
    runtime_stack.add_dependency(s3_stack)
    api_stack.add_dependency(runtime_stack)
    observability_stack.add_dependency(runtime_stack)
    
    # Apply tags to all stacks
    for stack in [network_stack, iam_stack, kms_stack, endpoints_stack, s3_stack, db_init_stack, ingest_stack, runtime_stack, api_stack, observability_stack]:
        for key, value in default_tags.items():
            cdk.Tags.of(stack).add(key, value)

    # Add stack-specific tags
    cdk.Tags.of(runtime_stack).add("Component", "Compute")
    cdk.Tags.of(api_stack).add("Component", "API")
    cdk.Tags.of(network_stack).add("Component", "Network")
    cdk.Tags.of(iam_stack).add("Component", "Security")
    cdk.Tags.of(kms_stack).add("Component", "Security")
    cdk.Tags.of(endpoints_stack).add("Component", "Network")
    cdk.Tags.of(s3_stack).add("Component", "Storage")
    cdk.Tags.of(db_init_stack).add("Component", "Database")
    cdk.Tags.of(ingest_stack).add("Component", "RAG")
    cdk.Tags.of(observability_stack).add("Component", "Observability")
    
    # Output summary
    logger.info(f"\nSynthesized stacks for environment: {env_name}")
    logger.info(f"Account: {account} and Region: {region}")
    logger.info(f"VPC: {config['network']['vpc_id']}")
    logger.info(f"Subnets: {len(config['network']['private_app_subnet_ids'])}")
    logger.info(f"Lambda Memory: {config['lambda']['chat']['memory']} MB")
    logger.info(f"Lambda Timeout: {config['lambda']['chat']['timeout']}s")
    logger.info(f"Bedrock Model: {config['bedrock_chat_model']}")
    logger.info(f"Shared RDS host: {db_host} / db: {db_name}")
    
    app.synth()


if __name__ == "__main__":
    main()
