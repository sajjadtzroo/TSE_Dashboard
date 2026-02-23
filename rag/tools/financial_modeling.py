# rag/tools/financial_modeling.py
"""Financial modeling tools: DCF, P&L, Loan Amortization, Bond Pricing."""
from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy.orm import Session

from config.settings import GOOGLE_SHEETS_CREDENTIALS_PATH, GOOGLE_SHEETS_ENABLED

try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:  # pragma: no cover
    gspread = None  # type: ignore[assignment]
    Credentials = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

_SHEETS_CLIENT = None  # module-level cache


def _get_sheets_client():
    global _SHEETS_CLIENT
    if not GOOGLE_SHEETS_ENABLED:
        raise RuntimeError("GOOGLE_SHEETS_ENABLED is false")
    if _SHEETS_CLIENT is not None:
        return _SHEETS_CLIENT
    creds = Credentials.from_service_account_file(
        GOOGLE_SHEETS_CREDENTIALS_PATH,
        scopes=[
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ],
    )
    _SHEETS_CLIENT = gspread.authorize(creds)
    return _SHEETS_CLIENT


def _create_and_share_sheet(title: str, worksheets_data: list) -> str:
    """Create sheet, write worksheets_data, share publicly, return URL."""
    gc = _get_sheets_client()
    sh = gc.create(title)

    if worksheets_data:
        sh.sheet1.update_title(worksheets_data[0]["name"])
        if worksheets_data[0].get("data"):
            sh.sheet1.update("A1", worksheets_data[0]["data"])
        for ws_def in worksheets_data[1:]:
            ws = sh.add_worksheet(title=ws_def["name"], rows=200, cols=30)
            if ws_def.get("data"):
                ws.update("A1", ws_def["data"])

    sh.share(None, perm_type="anyone", role="reader")
    return sh.url
