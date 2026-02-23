# tests/unit/test_financial_modeling_tools.py
import json
from unittest.mock import MagicMock, patch
import pytest


class TestSheetsHelper:
    @patch("rag.tools.financial_modeling._SHEETS_CLIENT", None)
    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", True)
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


class TestFCFFFormula:
    def test_fcff_basic(self):
        from rag.tools.financial_modeling import _compute_fcff
        # FCFF = EBIT*(1-T) + DA - CapEx - DWC
        # 100*(1-0.25) + 20 - 30 - 5 = 75 + 20 - 30 - 5 = 60
        result = _compute_fcff(ebit=100, tax_rate=0.25, da=20, capex=30, delta_wc=5)
        assert result == pytest.approx(60.0)

    def test_fcff_zero_tax(self):
        from rag.tools.financial_modeling import _compute_fcff
        # 100*(1-0) + 10 - 10 - 0 = 100
        result = _compute_fcff(ebit=100, tax_rate=0.0, da=10, capex=10, delta_wc=0)
        assert result == pytest.approx(100.0)

    def test_fcff_negative_delta_wc(self):
        from rag.tools.financial_modeling import _compute_fcff
        # 100*(1-0.25) + 20 - 30 - (-10) = 75 + 20 - 30 + 10 = 75
        result = _compute_fcff(ebit=100, tax_rate=0.25, da=20, capex=30, delta_wc=-10)
        assert result == pytest.approx(75.0)


class TestDCFModel:
    def _make_projections(self, n=3):
        return [
            {"ebit": 100, "tax_rate": 0.25, "da": 20, "capex": 30, "delta_wc": 5}
            for _ in range(n)
        ]

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_wacc_gt_tg_required(self):
        """WACC <= TG should return error."""
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        result = json.loads(build_dcf_model(db, "Test Co", self._make_projections(), wacc=0.05, terminal_growth=0.05))
        assert "error" in result

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_sheets_disabled_null_url(self):
        """When sheets disabled, sheet_url should be None."""
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        result = json.loads(build_dcf_model(
            db, "Test Co", self._make_projections(),
            wacc=0.22, terminal_growth=0.03
        ))
        assert result["sheet_url"] is None

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_equity_bridge(self):
        """Equity value = EV - net_debt."""
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        result = json.loads(build_dcf_model(
            db, "Test Co", self._make_projections(),
            wacc=0.22, terminal_growth=0.03,
            net_debt=50.0, shares_outstanding=1000.0
        ))
        assert result["equity_value"] == pytest.approx(
            result["enterprise_value"] - 50.0, abs=0.01
        )

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_price_per_share(self):
        """Price per share = equity_value / shares_outstanding."""
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        result = json.loads(build_dcf_model(
            db, "Test Co", self._make_projections(),
            wacc=0.22, terminal_growth=0.03,
            net_debt=0.0, shares_outstanding=500.0
        ))
        assert result["price_per_share"] == pytest.approx(
            result["equity_value"] / 500.0, abs=0.01
        )

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_model_type_field(self):
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        result = json.loads(build_dcf_model(
            db, "Test Co", self._make_projections(), wacc=0.22, terminal_growth=0.03
        ))
        assert result["model_type"] == "dcf"


class TestPLModel:
    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_revenue_growth(self):
        """Revenue compounds correctly."""
        from rag.tools.financial_modeling import build_pl_model
        db = MagicMock()
        result = json.loads(build_pl_model(
            db, "Test Co",
            base_revenue=100.0,
            revenue_growth_rates=[0.10, 0.20],
            gross_margin=0.40,
            ebitda_margin=0.25,
            da_pct=0.05,
            interest_expense=5.0,
            tax_rate=0.25,
        ))
        proj = result["projections"]
        assert proj[0]["revenue"] == pytest.approx(110.0)
        assert proj[1]["revenue"] == pytest.approx(132.0)

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_margin_waterfall(self):
        """Gross profit = revenue * gross_margin."""
        from rag.tools.financial_modeling import build_pl_model
        db = MagicMock()
        result = json.loads(build_pl_model(
            db, "Test Co",
            base_revenue=100.0,
            revenue_growth_rates=[0.0],
            gross_margin=0.40,
            ebitda_margin=0.25,
            da_pct=0.05,
            interest_expense=0.0,
            tax_rate=0.25,
        ))
        y = result["projections"][0]
        # Revenue = 100
        assert y["revenue"] == pytest.approx(100.0)
        # Gross profit = 40
        assert y["gross_profit"] == pytest.approx(40.0)
        # EBITDA = 25
        assert y["ebitda"] == pytest.approx(25.0)
        # EBIT = EBITDA - DA = 25 - 5 = 20
        assert y["ebit"] == pytest.approx(20.0)
        # Net income = EBT * (1-T) = 20 * 0.75 = 15
        assert y["net_income"] == pytest.approx(15.0)

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_model_type(self):
        from rag.tools.financial_modeling import build_pl_model
        db = MagicMock()
        result = json.loads(build_pl_model(
            db, "Test Co", 100.0, [0.10], 0.40, 0.25, 0.05, 5.0, 0.25
        ))
        assert result["model_type"] == "pl"


class TestLoanAmortization:
    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_fully_amortizing_balance_zero(self):
        """Final balance should be ~0 for fully_amortizing."""
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=12
        ))
        assert result["summary"]["final_balance"] == pytest.approx(0.0, abs=0.01)

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_fully_amortizing_equal_payments(self):
        """All monthly payments should be equal for fully_amortizing."""
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.12, term_months=12
        ))
        payments = [s["payment"] for s in result["schedule"]]
        assert max(payments) - min(payments) < 0.01

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_bullet_principal_at_end(self):
        """Bullet loan: principal repaid only at last period."""
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=6, loan_type="bullet"
        ))
        schedule = result["schedule"]
        # All months except last: principal = 0
        for s in schedule[:-1]:
            assert s["principal"] == pytest.approx(0.0, abs=0.001)
        # Last month: principal = face value
        assert schedule[-1]["principal"] == pytest.approx(100.0)

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_balloon_final_balance_zero(self):
        """Balloon loan: final balance should be 0."""
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=12, loan_type="balloon"
        ))
        assert result["schedule"][-1]["balance"] == pytest.approx(0.0, abs=0.01)

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_unknown_loan_type(self):
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=12, loan_type="unknown"
        ))
        assert "error" in result


class TestBondModel:
    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_at_par_price(self):
        """Bond price = face value when coupon_rate == YTM."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.20, periods=5, ytm=0.20
        ))
        assert result["price"] == pytest.approx(1_000_000, rel=1e-4)

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_discount_bond_price_below_par(self):
        """When YTM > coupon rate, price < face value."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=5, ytm=0.22
        ))
        assert result["price"] < 1_000_000

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_premium_bond_price_above_par(self):
        """When YTM < coupon rate, price > face value."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.22, periods=5, ytm=0.18
        ))
        assert result["price"] > 1_000_000

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_macaulay_duration_le_maturity(self):
        """Macaulay duration (years) must be ≤ maturity (periods/frequency)."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=5, ytm=0.20
        ))
        assert result["macaulay_duration_years"] <= 5.0

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_modified_duration_lt_macaulay(self):
        """Modified duration < Macaulay duration (for positive YTM)."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=5, ytm=0.20
        ))
        assert result["modified_duration"] < result["macaulay_duration_years"]

    @patch("rag.tools.financial_modeling.GOOGLE_SHEETS_ENABLED", False)
    def test_model_type(self):
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=3, ytm=0.20
        ))
        assert result["model_type"] == "bond"


class TestToolDefinitions:
    def test_tool_definitions_count(self):
        from rag.tools.financial_modeling import TOOL_DEFINITIONS
        assert len(TOOL_DEFINITIONS) == 4

    def test_tool_dispatch_count(self):
        from rag.tools.financial_modeling import TOOL_DISPATCH
        assert len(TOOL_DISPATCH) == 4

    def test_tool_names_match(self):
        from rag.tools.financial_modeling import TOOL_DEFINITIONS, TOOL_DISPATCH
        def_names = {d["function"]["name"] for d in TOOL_DEFINITIONS}
        dispatch_names = set(TOOL_DISPATCH.keys())
        assert def_names == dispatch_names
