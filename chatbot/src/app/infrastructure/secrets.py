"""
AWS Secrets Manager Client

Handles retrieval of secrets from AWS Secrets Manager.
"""

import json
import boto3
from typing import Dict, Any, Optional
from functools import lru_cache
from app.config import settings


class SecretsManager:
    """Client for AWS Secrets Manager operations"""

    def __init__(self, region: Optional[str] = None):
        """
        Initialize Secrets Manager client
        """
        self.region = region or settings.AWS_REGION
        self.client = boto3.client(service_name="secretsmanager", region_name=self.region)

    @lru_cache(maxsize=32)
    def get_secret(self, secret_arn: str) -> Dict[str, Any]:
        """
        Retrieve and parse secret from Secrets Manager
        """
        response = self.client.get_secret_value(SecretId=secret_arn)
        return json.loads(response["SecretString"])

    def get_db_credentials(self, secret_arn: Optional[str] = None) -> Dict[str, str]:
        """
        Get database credentials from Secrets Manager
        """
        arn = secret_arn or settings.DB_SECRET_ARN
        if not arn:
            raise ValueError("DB_SECRET_ARN not configured")

        return self.get_secret(arn)
