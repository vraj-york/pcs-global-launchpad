from aws_cdk import Stack, aws_iam as iam
from constructs import Construct


class IAMStack(Stack):
    """
    Shared IAM role for Assessment Engine Lambdas.

    Sprint 1: db_seeder Lambda uses this role.
    Sprint 2+: API Lambdas will reuse the same role — add permissions here.
    """

    def __init__(self, scope: Construct, id: str, db_secret_arn: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        self.lambda_role = iam.Role(
            self,
            "AssessmentLambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="Execution role for Assessment Engine Lambda functions",
        )

        # VPC access — required for any Lambda running inside a VPC
        self.lambda_role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name(
                "service-role/AWSLambdaVPCAccessExecutionRole"
            )
        )

        # Secrets Manager — exact ARN of the assessment DB credentials secret
        self.lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret",
                ],
                resources=[db_secret_arn],
            )
        )

        # Assessment report print HTML staging + report PDF uploads (reports bucket).
        self.lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "s3:PutObject",
                    "s3:GetObject",
                    "s3:AbortMultipartUpload",
                ],
                resources=["*"],
            )
        )

        #  Future permissions (add here as sprints progress) 
        # Sprint 2: API Lambdas may need read/write on the same secret — already covered.
        # Sprint 3: If BSP score calculations use Bedrock, add bedrock:InvokeModel here.
