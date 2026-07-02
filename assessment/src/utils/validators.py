"""
Custom validators
"""
import re
from typing import Any

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_hex_color(color: str) -> bool:
    """Validate hex color code"""
    pattern = r'^#[0-9A-Fa-f]{6}$'
    return re.match(pattern, color) is not None

def validate_positive_integer(value: Any) -> bool:
    """Validate positive integer"""
    try:
        return isinstance(value, int) and value > 0
    except:
        return False

def validate_non_empty_string(value: str) -> bool:
    """Validate non-empty string"""
    return isinstance(value, str) and len(value.strip()) > 0

def sanitize_string(value: str, max_length: int = None) -> str:
    """Sanitize string input"""
    sanitized = value.strip()
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    return sanitized