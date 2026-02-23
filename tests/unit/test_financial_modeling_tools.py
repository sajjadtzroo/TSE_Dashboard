# tests/unit/test_financial_modeling_tools.py
import json
from unittest.mock import MagicMock, patch
import pytest


class TestSheetsHelper:
    @patch("rag.tools.financial_modeling.gspread")
    @patch("rag.tools.financial_modeling.Credentials")
    def test_create_sheet_returns_url(self, mock_creds, mock_gspread):
        mock_client = MagicMock()
        mock_sh = MagicMock()
        mock_sh.url = "https://docs.google.com/spreadsheets/d/test123"
        mock_gspread.authorize.return_value = mock_client
        mock_client.create.return_value = mock_sh

        from rag.tools.financial_modeling import _create_and_share_sheet
        url = _create_and_share_sheet("Test Sheet", [])
        assert url == "https://docs.google.com/spreadsheets/d/test123"
        mock_sh.share.assert_called_once_with(None, perm_type="anyone", role="reader")
