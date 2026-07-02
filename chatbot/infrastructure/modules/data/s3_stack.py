from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    aws_s3 as s3,
    aws_s3_notifications as s3n,
    aws_iam as iam,
)
from constructs import Construct


class S3Stack(Stack):
    """
    S3 Stack - Document storage for RAG pipeline
    
    Features:
    - Private bucket with encryption
    - Versioning enabled for document history
    - Lifecycle rules for old versions
    - CORS for frontend uploads
    - EventBridge integration for processing
    """
    
    def __init__(
        self,
        scope: Construct,
        id: str,
        config: dict,
        **kwargs
    ):
        super().__init__(scope, id, **kwargs)
        
        env_name = config["env"]["name"]
        
        # Create S3 bucket for documents
        self.documents_bucket = s3.Bucket(
            self,
            "DocumentsBucket",
            bucket_name=f"bispy-bot-documents-{env_name}-{Stack.of(self).account}",
            
            # Security
            encryption=s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            
            # Versioning (for document history and rollback)
            versioned=True,
            
            # Lifecycle rules
            lifecycle_rules=[
                # Delete old versions after 30 days
                s3.LifecycleRule(
                    id="DeleteOldVersions",
                    noncurrent_version_expiration=Duration.days(30),
                    enabled=True
                ),
                # Move to Infrequent Access after 90 days
                s3.LifecycleRule(
                    id="TransitionToIA",
                    transitions=[
                        s3.Transition(
                            storage_class=s3.StorageClass.INFREQUENT_ACCESS,
                            transition_after=Duration.days(90)
                        )
                    ],
                    enabled=True
                )
            ],
            
            # CORS for frontend uploads
            cors=[
                s3.CorsRule(
                    allowed_methods=[
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.DELETE
                    ],
                    allowed_origins=["*"],  # Restrict in production
                    allowed_headers=["*"],
                    exposed_headers=[
                        "ETag",
                        "x-amz-meta-custom-header"
                    ],
                    max_age=3000
                )
            ],
            
            # EventBridge notifications (for Lambda triggers)
            event_bridge_enabled=True,
            
            # Cleanup policy (for dev)
            removal_policy=RemovalPolicy.RETAIN if env_name == "prod" else RemovalPolicy.DESTROY,
            auto_delete_objects=False if env_name == "prod" else True
        )
        
        # Add bucket policy for secure access
        self.documents_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                sid="DenyUnencryptedObjectUploads",
                effect=iam.Effect.DENY,
                principals=[iam.AnyPrincipal()],
                actions=["s3:PutObject"],
                resources=[f"{self.documents_bucket.bucket_arn}/*"],
                conditions={
                    "StringNotEquals": {
                        "s3:x-amz-server-side-encryption": "AES256"
                    }
                }
            )
        )
        
        # Output bucket information
        from aws_cdk import CfnOutput
        
        CfnOutput(
            self,
            "DocumentsBucketName",
            value=self.documents_bucket.bucket_name,
            description="S3 bucket for document storage",
            export_name=f"DocumentsBucket-{env_name}"
        )
        
        CfnOutput(
            self,
            "DocumentsBucketArn",
            value=self.documents_bucket.bucket_arn,
            description="S3 bucket ARN",
            export_name=f"DocumentsBucketArn-{env_name}"
        )
