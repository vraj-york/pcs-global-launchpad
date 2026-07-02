"""
Shared Database Utilities

Common database operations used across lambdas.
"""

import json
import boto3
import psycopg2
from typing import Dict
from contextlib import contextmanager


def get_db_credentials(secret_arn: str, region: str = "us-east-1") -> Dict[str, str]:
    """
    Retrieve database credentials from Secrets Manager
    """
    client = boto3.client("secretsmanager", region_name=region)
    response = client.get_secret_value(SecretId=secret_arn)
    return json.loads(response["SecretString"])


@contextmanager
def get_db_connection(
    host: str, port: int, dbname: str, secret_arn: str, region: str = "us-east-1"
):
    """
    Get database connection context manager
    """
    credentials = get_db_credentials(secret_arn, region)

    conn = psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=credentials["username"],
        password=credentials["password"],
        connect_timeout=30,
    )

    try:
        yield conn
    finally:
        conn.close()
