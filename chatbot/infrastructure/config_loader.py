"""
Configuration Loader Module

Centralizes configuration loading and validation logic.
Makes it easier to add new config sources (e.g., AWS Parameter Store, Secrets Manager)
"""

import yaml
import sys
import logging
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class ConfigurationError(Exception):
    """Raised when configuration is invalid or missing"""
    pass


class ConfigLoader:
    """
    Loads and validates configuration from YAML files
    
    Usage:
        loader = ConfigLoader()
        config = loader.load("stage")
    """
    
    def __init__(self, config_dir: str = "environments"):
        self.config_dir = Path(config_dir)
        
    def load(self, environment: str) -> Dict[str, Any]:
        """
        Load configuration for specified environment
        
        Args:
            environment: Environment name (dev, stage, uat, prod)
            
        Returns:
            Configuration dictionary
            
        Raises:
            ConfigurationError: If config is invalid or missing
        """
        config_file = self.config_dir / f"{environment}.yaml"
        
        # Load YAML file
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
        
        # Validate configuration
        self._validate_config(config, environment)
        
        return config
    
    def _validate_config(self, config: Dict[str, Any], environment: str) -> None:
        """
        Validate configuration has required keys and values
        
        Args:
            config: Configuration dictionary
            environment: Environment name
            
        Raises:
            ConfigurationError: If validation fails
        """
        # Required top-level keys
        required_keys = ["network", "lambda", "bedrock_chat_model"]
        missing_keys = [key for key in required_keys if key not in config]
        if missing_keys:
            raise ConfigurationError(
                f"Missing required configuration keys: {missing_keys}"
            )
        
        # Validate network configuration
        if "vpc_id" not in config["network"]:
            raise ConfigurationError("'vpc_id' not found in network configuration")
        
        if "private_app_subnet_ids" not in config["network"]:
            raise ConfigurationError(
                "'private_app_subnet_ids' not found in network configuration"
            )
        
        # Validate subnet IDs list is not empty
        subnet_ids = config["network"]["private_app_subnet_ids"]
        if not subnet_ids or not isinstance(subnet_ids, list):
            raise ConfigurationError(
                "private_app_subnet_ids must be a non-empty list"
            )
        
        # Validate lambda configuration
        if "chat" not in config["lambda"]:
            raise ConfigurationError("'lambda.chat' configuration not found")
        
        lambda_chat = config["lambda"]["chat"]
        if "memory" not in lambda_chat:
            raise ConfigurationError("'lambda.chat.memory' not found")
        if "timeout" not in lambda_chat:
            raise ConfigurationError("'lambda.chat.timeout' not found")
        
        # Validate timeout is reasonable (API Gateway limit is 29 seconds)
        timeout = lambda_chat["timeout"]
        if timeout > 29:
            logger.warning(
                f"Lambda timeout ({timeout}s) exceeds API Gateway "
                f"limit (29s). This may cause issues."
            )

        self._merge_optimization_defaults(config)
        self._validate_optimization_config(config.get("optimization", {}))

        # Validate shared RDS connection block (provided by the backend team).
        # Fields must exist and be non-empty strings before deploying.
        self._validate_shared_rds_config(config.get("rds", {}), environment)

        # Fail fast if JWT verification is on but unconfigured — otherwise the
        # app would fail closed at runtime and deny every request.
        self._validate_cognito_config(config.get("cognito", {}), environment)

    def _merge_optimization_defaults(self, config: Dict[str, Any]) -> None:
        """Ensure optimization block exists with documented defaults."""
        defaults = {
            "warm_context_http_timeout": 3,
            "enable_bedrock_prompt_caching": True,
            "use_coach_persona_shell": True,
            "enable_speculative_warm_prefetch": False,
        }
        optimization = config.get("optimization") or {}
        config["optimization"] = {**defaults, **optimization}

    def _validate_optimization_config(self, optimization: Dict[str, Any]) -> None:
        timeout = optimization.get("warm_context_http_timeout", 3)
        if not isinstance(timeout, (int, float)) or timeout <= 0:
            raise ConfigurationError(
                "optimization.warm_context_http_timeout must be a positive number"
            )

        for flag in (
            "enable_bedrock_prompt_caching",
            "use_coach_persona_shell",
            "enable_speculative_warm_prefetch",
        ):
            if not isinstance(optimization.get(flag, False), bool):
                raise ConfigurationError(f"optimization.{flag} must be a boolean")

    def _validate_shared_rds_config(self, rds: Dict[str, Any], environment: str) -> None:
        """
        Validate that all shared-RDS connection fields have been populated.

        The chatbot no longer provisions its own RDS instance; it connects to the
        backend team's RDS.  All four fields below must be supplied before
        `cdk deploy` will succeed.

        Args:
            rds: The ``rds`` sub-dict from the environment YAML.
            environment: Environment name (used in error messages only).

        Raises:
            ConfigurationError: If any required field is missing or still blank.
        """
        required_rds_fields = ["host", "port", "db_name", "secret_arn", "security_group_id"]
        missing = [f for f in required_rds_fields if f not in rds]
        if missing:
            raise ConfigurationError(
                f"[{environment}] rds config is missing required fields: {missing}. "
                "Ask the backend team to provide these values."
            )

        blank = [f for f in required_rds_fields if not str(rds[f]).strip()]
        if blank:
            raise ConfigurationError(
                f"[{environment}] rds config has empty values for: {blank}. "
                f"Fill them in environments/{environment}.yaml before deploying."
            )
    
    def _validate_cognito_config(self, cognito: Dict[str, Any], environment: str) -> None:
        """
        When ``cognito.verify_jwt`` is true, require enough config to reach the
        JWKS — either a ``user_pool_id`` (region is derived) or an explicit
        ``jwks_url``. Without it the app fails closed and denies all requests.
        """
        if not cognito or not cognito.get("verify_jwt"):
            return

        has_pool = bool(str(cognito.get("user_pool_id", "")).strip())
        has_jwks = bool(str(cognito.get("jwks_url", "")).strip())
        if not (has_pool or has_jwks):
            raise ConfigurationError(
                f"[{environment}] cognito.verify_jwt is true but neither "
                "cognito.user_pool_id nor cognito.jwks_url is set. The chatbot "
                "would reject every request. Set the Cognito user pool id "
                "(same as the frontend VITE_AWS_USER_POOL_ID) before deploying."
            )

    def _list_available_environments(self) -> list[str]:
        """List all available environment configurations"""
        if not self.config_dir.exists():
            return []
        
        yaml_files = self.config_dir.glob("*.yaml")
        return [f.stem for f in yaml_files]
    
    @staticmethod
    def get_default_tags(environment: str, project_name: str = "BispyBot") -> Dict[str, str]:
        """
        Get default tags to apply to all resources
        
        Args:
            environment: Environment name
            project_name: Project name
            
        Returns:
            Dictionary of tags
        """
        return {
            "Project": project_name,
            "Environment": environment,
            "ManagedBy": "CDK",
            "Repository": "new-BSPBot-CDK-Setup",
        }


def load_config(environment: str) -> Dict[str, Any]:
    """
    Convenience function to load configuration
    
    Args:
        environment: Environment name (dev, stage, prod)
        
    Returns:
        Configuration dictionary
    """
    loader = ConfigLoader()
    try:
        return loader.load(environment)
    except ConfigurationError as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)


# Example usage:
if __name__ == "__main__":
    import sys
    
    env = sys.argv[1] if len(sys.argv) > 1 else "stage"
    
    try:
        config = load_config(env)
        logger.info(f"\nConfiguration for {env}:")
        logger.info(f"  VPC ID: {config['network']['vpc_id']}")
        logger.info(f"  Subnets: {len(config['network']['private_app_subnet_ids'])}")
        logger.info(f"  Lambda Memory: {config['lambda']['chat']['memory']} MB")
        logger.info(f"  Lambda Timeout: {config['lambda']['chat']['timeout']}s")
        logger.info(f"  Bedrock Model: {config['bedrock_chat_model']}")
    except Exception as e:
        logger.error(f"ERROR: {e}")
        sys.exit(1)
