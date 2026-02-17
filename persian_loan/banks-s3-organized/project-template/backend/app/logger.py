"""
Loguru Logger Configuration
"""

import sys
from pathlib import Path

from loguru import logger

from app.config import settings

# Remove default logger
logger.remove()

# Log format
LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
    "<level>{message}</level>"
)

# Console handler
logger.add(
    sys.stdout,
    format=LOG_FORMAT,
    level="DEBUG" if settings.debug else "INFO",
    colorize=True,
)

# File handler for errors
log_path = Path("logs")
log_path.mkdir(exist_ok=True)

logger.add(
    log_path / "error.log",
    format=LOG_FORMAT,
    level="ERROR",
    rotation="10 MB",
    retention="30 days",
    compression="zip",
)

# File handler for all logs
logger.add(
    log_path / "app.log",
    format=LOG_FORMAT,
    level="DEBUG" if settings.debug else "INFO",
    rotation="50 MB",
    retention="14 days",
    compression="zip",
)


def get_logger(name: str = __name__):
    """Get a logger instance with context."""
    return logger.bind(name=name)
