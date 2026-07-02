from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_lambda as _lambda,
    aws_ec2 as ec2,
    aws_iam as iam,
)
from aws_cdk.aws_ecr_assets import Platform
from constructs import Construct


class AssessmentDBSeederStack(Stack):
    """
    Assessment DB Seeder Lambda Stack

    Builds a Docker image from src/lambdas/db_seeder/, pushes it to ECR,
    and creates a Lambda that seeds the 60 predefined assessment questions
    and their options into the database (schema is managed by Prisma).

    Invoke manually after every deploy that changes questions.json:
        aws lambda invoke \\
            --function-name assessment-db-seeder-{env} \\
            response.json

    This stack is intentionally separate so it can be updated and re-invoked
    independently of future API stacks.
    """

    def __init__(
        self,
        scope: Construct,
        id: str,
        vpc: ec2.IVpc,
        lambda_sg: ec2.ISecurityGroup,
        private_subnets: list,
        lambda_role: iam.IRole,
        db_endpoint: str,
        db_port: str,
        db_name: str,
        db_secret_arn: str,
        config: dict,
        **kwargs,
    ):
        super().__init__(scope, id, **kwargs)

        env_name = config["env"]["name"]
        lambda_cfg = config["lambda"]["db_seeder"]

        self.fn = _lambda.DockerImageFunction(
            self,
            "AssessmentDBSeederFn",
            function_name=f"assessment-db-seeder-{env_name}",
            code=_lambda.DockerImageCode.from_image_asset(
                # Path relative to infrastructure/ — goes up to assessment/
                # then down into src/lambdas/db_seeder
                "../src/lambdas/db_seeder",
                platform=Platform.LINUX_AMD64,  # required on Apple Silicon
            ),
            role=lambda_role,
            timeout=Duration.seconds(lambda_cfg["timeout"]),
            memory_size=lambda_cfg["memory"],
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnets=private_subnets),
            security_groups=[lambda_sg],
            environment={
                "DB_HOST":       db_endpoint,
                "DB_PORT":       db_port,
                "DB_NAME":       db_name,
                "DB_SECRET_ARN": db_secret_arn,
            },
            description="Seeds assessment questions and options",
        )

        CfnOutput(
            self,
            "DBSeederFnName",
            value=self.fn.function_name,
            description="Assessment DB Seeder Lambda name",
            export_name=f"AssessmentDBSeederFn-{env_name}",
        )

        CfnOutput(
            self,
            "DBSeederFnArn",
            value=self.fn.function_arn,
            description="Assessment DB Seeder Lambda ARN",
            export_name=f"AssessmentDBSeederFnArn-{env_name}",
        )
