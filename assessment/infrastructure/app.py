#!/usr/bin/env python3
"""
Assessment Engine — CDK App

Stacks deployed:
  AssessmentNetworkStack-{env}       imports backend VPC, creates Lambda SG,
                                      adds inbound 5432 rule to backend RDS SG
  AssessmentIAMStack-{env}           shared Lambda execution role
  AssessmentDBSeederStack-{env}      data seeding Lambda
  AssessmentAPIStack-{env}           FastAPI runtime Lambda (Docker)
  AssessmentAPIGatewayStack-{env}    REST API Gateway (proxy → AssessmentAPIStack)

Deploy:
    cdk deploy --all --context env=dev --require-approval never
Seed / re-seed:
    aws lambda invoke --function-name assessment-db-seeder-dev response.json
"""

import aws_cdk as cdk
import aws_cdk.aws_ec2 as ec2
import os
import sys
import logging

from config_loader import load_config, ConfigLoader
from modules.network.network_stack import NetworkStack
from modules.iam.iam_stack import IAMStack
from modules.lambdas.db_seeder_stack import AssessmentDBSeederStack
from modules.lambdas.api_stack import AssessmentAPIStack
from modules.lambdas.score_engine_stack import AssessmentScoreEngineStack
from modules.api.api_gateway_stack import AssessmentAPIGatewayStack

logger = logging.getLogger(__name__)


def validate_aws_environment():
    account = os.environ.get("CDK_DEFAULT_ACCOUNT")
    region  = os.environ.get("CDK_DEFAULT_REGION")
    if not account or not region:
        logger.error("AWS credentials not configured. Run: aws configure")
        sys.exit(1)
    return account, region


def main():
    app = cdk.App()

    env_name = app.node.try_get_context("env") or "dev"
    account, region = validate_aws_environment()
    config  = load_config(env_name)
    aws_env = cdk.Environment(account=account, region=region)

    default_tags = ConfigLoader.get_default_tags(env_name)

    rds_config    = config["rds"]
    db_host       = rds_config["host"]
    db_port       = str(rds_config["port"])
    db_name       = rds_config["db_name"]
    db_secret_arn = rds_config["secret_arn"]

    #  Stacks 

    network_stack = NetworkStack(
        app,
        f"AssessmentNetworkStack-{env_name}",
        config=config,
        env=aws_env,
        description=f"Network infrastructure for Assessment Engine ({env_name})",
    )

    iam_stack = IAMStack(
        app,
        f"AssessmentIAMStack-{env_name}",
        db_secret_arn=db_secret_arn,
        env=aws_env,
        description=f"IAM roles for Assessment Engine ({env_name})",
    )

    db_seeder_stack = AssessmentDBSeederStack(
        app,
        f"AssessmentDBSeederStack-{env_name}",
        vpc=network_stack.vpc,
        lambda_sg=network_stack.lambda_sg,
        private_subnets=network_stack.private_app_subnets,
        lambda_role=iam_stack.lambda_role,
        db_endpoint=db_host,
        db_port=db_port,
        db_name=db_name,
        db_secret_arn=db_secret_arn,
        config=config,
        env=aws_env,
        description=f"DB seeder Lambda for Assessment Engine ({env_name})",
    )

    score_engine_stack = AssessmentScoreEngineStack(
        app,
        f"AssessmentScoreEngineStack-{env_name}",
        config=config,
        shared_vpc=network_stack.vpc,
        lambda_sg=network_stack.lambda_sg,
        private_subnets=network_stack.private_app_subnets,
        rds_secret_arn=db_secret_arn,
        env=aws_env,
        description=f"Assessment score/report workers ({env_name})",
    )

    api_stack = AssessmentAPIStack(
        app,
        f"AssessmentAPIStack-{env_name}",
        config=config,
        shared_vpc=network_stack.vpc,
        lambda_sg=network_stack.lambda_sg,
        lambda_role=iam_stack.lambda_role,
        rds_secret_arn=db_secret_arn,
        scoring_queue=score_engine_stack.scoring_queue,
        report_queue=score_engine_stack.report_queue,
        reports_bucket=score_engine_stack.reports_bucket,
        env=aws_env,
        description=f"Assessment API Lambda for Assessment Engine ({env_name})",
    )

    api_gateway_stack = AssessmentAPIGatewayStack(
        app,
        f"AssessmentAPIGatewayStack-{env_name}",
        assessment_lambda=api_stack.api_lambda,
        config=config,
        env=aws_env,
        description=f"API Gateway for Assessment Engine ({env_name})",
    )

    #  Dependencies 
    iam_stack.add_dependency(network_stack)
    db_seeder_stack.add_dependency(network_stack)
    db_seeder_stack.add_dependency(iam_stack)
    api_stack.add_dependency(network_stack)
    api_stack.add_dependency(iam_stack)
    api_stack.add_dependency(score_engine_stack)
    score_engine_stack.add_dependency(network_stack)
    api_gateway_stack.add_dependency(api_stack)

    #  Tags 
    for stack in [network_stack, iam_stack, db_seeder_stack, api_stack, score_engine_stack, api_gateway_stack]:
        for key, value in default_tags.items():
            cdk.Tags.of(stack).add(key, value)

    cdk.Tags.of(network_stack).add("Component", "Network")
    cdk.Tags.of(iam_stack).add("Component", "Security")
    cdk.Tags.of(db_seeder_stack).add("Component", "Database")
    cdk.Tags.of(api_stack).add("Component", "Compute")
    cdk.Tags.of(score_engine_stack).add("Component", "Compute")
    cdk.Tags.of(api_gateway_stack).add("Component", "API")

    logger.info(f"Assessment Engine — env={env_name}  account={account}  region={region}")
    logger.info(f"RDS: {db_host} / db={db_name}")

    app.synth()


if __name__ == "__main__":
    main()
