"""
AWS Systems Manager (SSM) Parameter Store Client

Handles retrieval of configuration parameters from SSM Parameter Store.
"""

import boto3
from functools import lru_cache
from typing import Optional
from app.config import settings


class SSMClient:
    """Client for AWS Systems Manager Parameter Store operations"""

    def __init__(self, region: Optional[str] = None):
        """
        Initialize SSM client

        Args:
            region: AWS region (defaults to settings.AWS_REGION)
        """
        self.region = region or settings.AWS_REGION
        self.client = boto3.client("ssm", region_name=self.region)

    @lru_cache(maxsize=32)
    def get_parameter(self, parameter_name: str, with_decryption: bool = True) -> str:
        """
        Get parameter from Parameter Store

        Args:
            parameter_name: Name of the parameter
            with_decryption: Whether to decrypt SecureString parameters

        Returns:
            Parameter value
        """
        response = self.client.get_parameter(Name=parameter_name, WithDecryption=with_decryption)
        return response["Parameter"]["Value"]

    def get_system_prompt(self, cache_key: int = 0) -> str:
        """
        Get system prompt from Parameter Store

        Args:
            cache_key: Optional cache key for forcing refresh

        Returns:
            System prompt string
        """
        parameter_name = f"/bispy-bot/{settings.ENVIRONMENT}/system-prompt"
        return self.get_parameter(parameter_name)

    def refresh_system_prompt(self) -> str:
        """
        Force refresh of cached system prompt

        Returns:
            Refreshed system prompt
        """
        import time

        self.get_parameter.cache_clear()
        return self.get_system_prompt(cache_key=int(time.time()))
