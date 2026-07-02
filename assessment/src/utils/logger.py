"""
Logging configuration
"""
import logging
import sys
import os
from datetime import datetime

def setup_logger(name: str = "assessment-api") -> logging.Logger:
    """
    Setup and configure logger
    
    Args:
        name: Logger name
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Get log level from environment
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.setLevel(getattr(logging, log_level, logging.INFO))
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    
    # Formatter
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    
    return logger

# Global logger instance
logger = setup_logger()

def log_request(method: str, path: str, status_code: int, duration_ms: float):
    """Log API request"""
    logger.info(f"{method} {path} - {status_code} - {duration_ms:.2f}ms")

def log_error(error: Exception, context: str = ""):
    """Log error with context"""
    logger.error(f"Error in {context}: {str(error)}", exc_info=True)

def log_db_query(query: str, duration_ms: float):
    """Log database query"""
    logger.debug(f"DB Query ({duration_ms:.2f}ms): {query}")