"""
Configuration Loader — Assessment Engine

Loads and validates per-environment YAML configuration.
Follows the same pattern as chatbot/infrastructure/config_loader.py.
"""

import yaml
import sys
import logging
from typing import Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class ConfigurationError(Exception):
    """Raised when configuration is invalid or missing."""
    pass


class ConfigLoader:
    """
    Loads and validates configuration from environments/*.yaml

    Usage:
        loader = ConfigLoader()
        config = loader.load("dev")
    """

    def __init__(self, config_dir: str = "environments"):
        self.config_dir = Path(config_dir)

    def load(self, environment: str) -> Dict[str, Any]:
        config_file = self.config_dir / f"{environment}.yaml"

        try:
            with open(config_file) as f:
                config = yaml.safe_load(f)
            logger.info(f"Loaded configuration from {config_file}")
        except FileNotFoundError:
            available = self._list_available_environments()
            raise ConfigurationError(
                f"Configuration file not found: {config_file}\n"
                f"Available environments: {', '.join(available)}"
            )
        except yaml.YAMLError as e:
            raise ConfigurationError(f"Invalid YAML in {config_file}: {e}")

        self._validate_config(config, environment)
        return config

    def _validate_config(self, config: Dict[str, Any], environment: str) -> None:
        required_keys = ["network", "lambda"]
        missing = [k for k in required_keys if k not in config]
        if missing:
            raise ConfigurationError(f"Missing required config keys: {missing}")

        if "vpc_id" not in config["network"]:
            raise ConfigurationError("'vpc_id' not found in network config")

        if "private_app_subnet_ids" not in config["network"]:
            raise ConfigurationError("'private_app_subnet_ids' not found in network config")

        subnet_ids = config["network"]["private_app_subnet_ids"]
        if not subnet_ids or not isinstance(subnet_ids, list):
            raise ConfigurationError("private_app_subnet_ids must be a non-empty list")

        if "db_seeder" not in config["lambda"]:
            raise ConfigurationError("'lambda.db_seeder' configuration not found")

        if "api" not in config["lambda"]:
            raise ConfigurationError("'lambda.api' configuration not found")

        self._validate_rds_config(config.get("rds", {}), environment)

    def _validate_rds_config(self, rds: Dict[str, Any], environment: str) -> None:
        """
        Validate shared RDS connection fields.

        All five fields must be populated before cdk deploy will succeed.
        The assessment engine uses the backend team's shared RDS instance —
        it does NOT provision its own.
        """
        required = ["host", "port", "db_name", "secret_arn", "security_group_id"]

        missing = [f for f in required if f not in rds]
        if missing:
            raise ConfigurationError(
                f"[{environment}] rds config is missing required fields: {missing}. "
                "Ask the backend team to provide these values."
            )

        blank = [f for f in required if not str(rds[f]).strip()]
        if blank:
            raise ConfigurationError(
                f"[{environment}] rds config has empty values for: {blank}. "
                f"Fill them in environments/{environment}.yaml before deploying."
            )

    def _list_available_environments(self) -> list:
        if not self.config_dir.exists():
            return []
        return [f.stem for f in self.config_dir.glob("*.yaml")]

    @staticmethod
    def get_default_tags(environment: str) -> Dict[str, str]:
        return {
            "Project": "BSPAssessment",
            "Environment": environment,
            "ManagedBy": "CDK",
            "Repository": "bsp-blueprint",
        }


def load_config(environment: str) -> Dict[str, Any]:
    """Convenience wrapper — exits with error message on failure."""
    loader = ConfigLoader()
    try:
        return loader.load(environment)
    except ConfigurationError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)
