"""
Loans Module
"""

from app.modules.loans.router import router
from app.modules.loans.service import LoanService

__all__ = ["router", "LoanService"]
