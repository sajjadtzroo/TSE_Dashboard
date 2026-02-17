"""
Banks Module
"""

from app.modules.banks.router import router
from app.modules.banks.service import BankService

__all__ = ["router", "BankService"]
