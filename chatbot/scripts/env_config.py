"""
Load chatbot environment YAML for CLI scripts.

Uses the same files as CDK (chatbot/infrastructure/environments/*.yaml).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import yaml

ENVIRONMENTS_DIR = (
    Path(__file__).resolve().parent.parent / "infrastructure" / "environments"
)


class EnvConfigError(Exception):
    """Raised when environment configuration is invalid or incomplete."""


def load_environment_config(env_name: str) -> dict[str, Any]:
    config_file = ENVIRONMENTS_DIR / f"{env_name}.yaml"
    if not config_file.is_file():
        available = sorted(p.stem for p in ENVIRONMENTS_DIR.glob("*.yaml"))
        raise EnvConfigError(
            f"Configuration not found: {config_file}\n"
            f"Available environments: {', '.join(available)}"
        )

    with open(config_file) as handle:
        config = yaml.safe_load(handle)

    if not isinstance(config, dict):
        raise EnvConfigError(f"Invalid YAML in {config_file}")

    return config


def get_rds_connection_info(env_name: str) -> dict[str, str]:
    """
    Return RDS host/port/dbname/secret_arn from the environment YAML.

    Chatbot uses shared backend RDS — not ChatbotRDSStack CloudFormation outputs.
    """
    config = load_environment_config(env_name)
    rds = config.get("rds") or {}
    required = ("host", "port", "db_name", "secret_arn")
    missing = [field for field in required if not str(rds.get(field, "")).strip()]
    if missing:
        raise EnvConfigError(
            f"[{env_name}] rds config missing or empty: {missing}. "
            f"Fill environments/{env_name}.yaml before running this script."
        )

    return {
        "host": str(rds["host"]).strip(),
        "port": str(rds["port"]).strip(),
        "dbname": str(rds["db_name"]).strip(),
        "secret_arn": str(rds["secret_arn"]).strip(),
    }


def exit_on_config_error(exc: Exception) -> None:
    print(f"Configuration error: {exc}", file=sys.stderr)
    sys.exit(1)
