from typing import Optional

from aws_cdk import (
    Stack,
    aws_iam as iam,
    aws_kms as kms,
)
from constructs import Construct


class IAMStack(Stack):
    """
    IAM Stack - Creates IAM roles and policies for Lambda functions
    """
    def __init__(
        self,
        scope,
        id,
        db_secret_arn: str,
        kms_messages_key: Optional[kms.Key] = None,
        bedrock_guardrail_id: Optional[str] = None,
        **kwargs,
    ):
        super().__init__(scope, id, **kwargs)
        stack = Stack.of(self)

        # Create Lambda execution role
        self.lambda_runtime_role = iam.Role(
            self,
            "LambdaRuntimeRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            description="Execution role for Chatbot Lambda function"
        )

        # Add VPC access permissions (needed for Lambda in VPC): includes CloudWatch Logs, EC2 network interface management
        self.lambda_runtime_role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name(
                "service-role/AWSLambdaVPCAccessExecutionRole"
            )
        )

        # Add Bedrock permissions for Claude models
        # ARN format: arn:aws:bedrock:region:account:foundation-model/model-id
        # For foundation models, account is empty (represented as *)
        self.lambda_runtime_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "bedrock:InvokeModel",  # For synchronous invocations
                    "bedrock:InvokeModelWithResponseStream"  # For streaming responses
                ],
                resources=[
                    # Allow access to all Claude models in all regions
                    "arn:aws:bedrock:*:*:foundation-model/anthropic.claude*",
                    # Allow access to Claude inference profiles (cross-region routing)
                    "arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude*",
                    "arn:aws:bedrock:*:*:inference-profile/eu.anthropic.claude*",
                    "arn:aws:bedrock:*:*:inference-profile/ap.anthropic.claude*"
                ]
            )
        )

        # Add Bedrock Prompt Management permissions
        # Lambda needs to retrieve prompts from Bedrock Prompt Management
        self.lambda_runtime_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "bedrock:GetPrompt",  # For bedrock client (legacy)
                    "bedrock:ListPrompts",  # For bedrock client (legacy)
                    "bedrock-agent:GetPrompt",  # For bedrock-agent client (REQUIRED)
                    "bedrock-agent:ListPrompts"  # For bedrock-agent client
                ],
                resources=[
                    # Allow access to all prompts in the account
                    f"arn:aws:bedrock:{stack.region}:{stack.account}:prompt/*"
                ]
            )
        )

        if bedrock_guardrail_id:
            self.lambda_runtime_role.add_to_policy(
                iam.PolicyStatement(
                    actions=["bedrock:ApplyGuardrail"],
                    resources=[
                        f"arn:aws:bedrock:{stack.region}:{stack.account}:guardrail/{bedrock_guardrail_id}"
                    ],
                )
            )

        # Add S3 permissions for RAG document storage
        # Lambda needs to read documents for ingestion and reference
        self.lambda_runtime_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject",
                    "s3:ListBucket",
                    "s3:GetObjectVersion"
                ],
                resources=[
                    f"arn:aws:s3:::bispy-bot-documents-*",
                    f"arn:aws:s3:::bispy-bot-documents-*/*"
                ]
            )
        )

        # Add Secrets Manager permissions for the shared RDS credentials secret.
        # We use the exact ARN supplied from config rather than a wildcard so that
        # the role cannot accidentally access unrelated secrets.
        self.lambda_runtime_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret"
                ],
                resources=[db_secret_arn]
            )
        )

        # Add Bedrock Titan Embeddings permissions for RAG
        # Lambda needs to generate embeddings for documents and queries
        self.lambda_runtime_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "bedrock:InvokeModel"
                ],
                resources=[
                    # Titan Text Embeddings V2
                    "arn:aws:bedrock:*:*:foundation-model/amazon.titan-embed-text-v2:0"
                ]
            )
        )

        # KMS permissions for message encryption (Thread & Trim)
        # GenerateDataKey: creates a fresh DEK per encrypt call
        # Decrypt:         recovers the DEK stored alongside each ciphertext blob
        #
        # Upgrade path: no policy changes required — same two actions are
        # sufficient for per-user envelope encryption with a shared root CMK.
        if kms_messages_key is not None:
            self.lambda_runtime_role.add_to_policy(
                iam.PolicyStatement(
                    actions=[
                        "kms:GenerateDataKey",
                        "kms:Decrypt",
                    ],
                    resources=[kms_messages_key.key_arn],
                )
            )
            # Also grant the key's own resource policy so the Lambda role
            # is a recognised key user (required for cross-account scenarios).
            kms_messages_key.grant(
                self.lambda_runtime_role,
                "kms:GenerateDataKey",
                "kms:Decrypt",
            )

