"""
KmsMessagesStack — Customer Managed Key for chatbot message encryption

Creates a single CMK (Customer Managed Key) used by the chat Lambda for
AES-256-GCM envelope encryption of conversation messages and thread summaries.

Design decisions:
  • One shared CMK per environment (dev/stage/prod).
    Upgrade path (Distilled Memories): add per-user DEK generation using
    this CMK as the root wrapping key.  No stack changes required —
    only the service layer changes.
  • Annual key rotation enabled (AWS-managed): AWS replaces the key material
    every year automatically.  Old ciphertext remains decryptable because AWS
    keeps all past key versions active under the same key ARN.
  • RemovalPolicy.RETAIN: the key is never automatically deleted when the CDK
    stack is torn down.  Deleting a live CMK makes all encrypted data
    permanently unreadable.  Manual deletion requires a 7–30 day waiting
    period configured via the AWS Console or CLI.
  • The key policy is intentionally left as AWS CDK's default (account root +
    IAM principal-based access).  Fine-grained key policy restrictions
    (limiting usage to the specific Lambda execution role) should be added in
    the production environment via a separate key policy statement.

Outputs:
  MessagesKeyArn — the ARN of the CMK, exported for consumption by:
    • IAMStack (kms:GenerateDataKey + kms:Decrypt policy on the Lambda role)
    • RuntimeStack (KMS_MESSAGES_KEY_ARN Lambda environment variable)

Usage (in app.py):
    kms_stack = KmsMessagesStack(app, f"ChatbotKmsStack-{env_name}", ...)
    iam_stack = IAMStack(..., kms_messages_key=kms_stack.messages_key)
    runtime_stack = RuntimeStack(..., kms_key_arn=kms_stack.key_arn)
"""

from aws_cdk import (
    Stack,
    CfnOutput,
    RemovalPolicy,
    aws_kms as kms,
)
from constructs import Construct


class KmsMessagesStack(Stack):
    """CDK stack that provisions the chatbot messages CMK."""

    def __init__(
        self,
        scope: Construct,
        id: str,
        env_name: str,
        **kwargs,
    ) -> None:
        """
        Args:
            scope:    CDK app or parent construct.
            id:       Stack logical ID (e.g. "ChatbotKmsStack-dev").
            env_name: Environment name (dev | stage | prod) used in the key alias.
        """
        super().__init__(scope, id, **kwargs)

        self.messages_key = kms.Key(
            self,
            "ChatbotMessagesKey",
            description=(
                f"CMK for AES-256-GCM envelope encryption of chatbot messages "
                f"and thread summaries ({env_name})"
            ),
            alias=f"alias/bmm-messages-cmk-{env_name}",
            # AWS-managed annual rotation: key material is rotated every ~365 days.
            # All past ciphertext remains decryptable — AWS retains old key versions.
            enable_key_rotation=True,
            # Never auto-delete — a deleted CMK makes all encrypted data unreadable.
            removal_policy=RemovalPolicy.RETAIN,
        )

        # Expose the key ARN so other stacks can reference it without circular deps
        self.key_arn: str = self.messages_key.key_arn

        CfnOutput(
            self,
            "MessagesKeyArn",
            value=self.messages_key.key_arn,
            description=(
                f"ARN of the KMS CMK for chatbot message encryption ({env_name}). "
                "Set as KMS_MESSAGES_KEY_ARN on the chat Lambda."
            ),
            export_name=f"ChatbotMessagesKeyArn-{env_name}",
        )
