# tests/unit/test_financial_modeling_tools.py
import json
import re
from unittest.mock import MagicMock, patch
import pytest


UUID4_PATTERN = re.compile(
    r'^/api/financial-modeling/download/'
    r'[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)


class TestExcelSaveHelper:
    def test_save_excel_returns_none_when_unavailable(self):
        """_save_excel returns None when EXCEL_AVAILABLE is False."""
        import rag.tools.financial_modeling as fm
        original = fm.EXCEL_AVAILABLE
        try:
            fm.EXCEL_AVAILABLE = False
            result = fm._save_excel(MagicMock(), "test")
            assert result is None
        finally:
            fm.EXCEL_AVAILABLE = original

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", True)
    def test_save_excel_returns_file_id_on_success(self, tmp_path):
        """_save_excel returns a UUID4 string when save succeeds."""
        import rag.tools.financial_modeling as fm
        mock_wb = MagicMock()
        with patch.object(fm, "_get_excel_models_dir", return_value=tmp_path):
            file_id = fm._save_excel(mock_wb, "test")
        assert file_id is not None
        assert UUID4_PATTERN.match(f"/api/financial-modeling/download/{file_id}")

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", True)
    def test_save_excel_returns_none_on_io_error(self, tmp_path):
        """_save_excel returns None when file write fails."""
        import rag.tools.financial_modeling as fm
        mock_wb = MagicMock()
        mock_wb.save.side_effect = OSError("disk full")
        with patch.object(fm, "_get_excel_models_dir", return_value=tmp_path):
            result = fm._save_excel(mock_wb, "test")
        assert result is None


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

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_wacc_gt_tg_required(self):
        """WACC <= TG should return error."""
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        result = json.loads(build_dcf_model(db, "Test Co", self._make_projections(), wacc=0.05, terminal_growth=0.05))
        assert "error" in result

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_excel_unavailable_null_download_url(self):
        """When Excel unavailable, download_url should be None."""
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        result = json.loads(build_dcf_model(
            db, "Test Co", self._make_projections(),
            wacc=0.22, terminal_growth=0.03
        ))
        assert result["download_url"] is None

    def test_excel_available_returns_download_url(self, tmp_path):
        """When Excel available and save succeeds, download_url matches expected pattern."""
        import rag.tools.financial_modeling as fm
        fake_file_id = "12345678-1234-4123-8123-123456789abc"
        with (
            patch.object(fm, "EXCEL_AVAILABLE", True),
            patch.object(fm, "_build_dcf_workbook", return_value=MagicMock()),
            patch.object(fm, "_save_excel", return_value=fake_file_id),
        ):
            result = json.loads(fm.build_dcf_model(
                MagicMock(), "Test Co", self._make_projections(),
                wacc=0.22, terminal_growth=0.03
            ))
        url = result.get("download_url")
        assert url == f"/api/financial-modeling/download/{fake_file_id}"

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
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

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
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

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_model_type_field(self):
        from rag.tools.financial_modeling import build_dcf_model
        db = MagicMock()
        result = json.loads(build_dcf_model(
            db, "Test Co", self._make_projections(), wacc=0.22, terminal_growth=0.03
        ))
        assert result["model_type"] == "dcf"


class TestPLModel:
    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
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

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
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
        assert y["revenue"] == pytest.approx(100.0)
        assert y["gross_profit"] == pytest.approx(40.0)
        assert y["ebitda"] == pytest.approx(25.0)
        assert y["ebit"] == pytest.approx(20.0)
        assert y["net_income"] == pytest.approx(15.0)

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_model_type(self):
        from rag.tools.financial_modeling import build_pl_model
        db = MagicMock()
        result = json.loads(build_pl_model(
            db, "Test Co", 100.0, [0.10], 0.40, 0.25, 0.05, 5.0, 0.25
        ))
        assert result["model_type"] == "pl"

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_download_url_null_when_unavailable(self):
        from rag.tools.financial_modeling import build_pl_model
        db = MagicMock()
        result = json.loads(build_pl_model(
            db, "Test Co", 100.0, [0.10], 0.40, 0.25, 0.05, 5.0, 0.25
        ))
        assert result["download_url"] is None


class TestLoanAmortization:
    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_fully_amortizing_balance_zero(self):
        """Final balance should be ~0 for fully_amortizing."""
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=12
        ))
        assert result["summary"]["final_balance"] == pytest.approx(0.0, abs=0.01)

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_fully_amortizing_equal_payments(self):
        """All monthly payments should be equal for fully_amortizing."""
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.12, term_months=12
        ))
        payments = [s["payment"] for s in result["schedule"]]
        assert max(payments) - min(payments) < 0.01

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_bullet_principal_at_end(self):
        """Bullet loan: principal repaid only at last period."""
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=6, loan_type="bullet"
        ))
        schedule = result["schedule"]
        for s in schedule[:-1]:
            assert s["principal"] == pytest.approx(0.0, abs=0.001)
        assert schedule[-1]["principal"] == pytest.approx(100.0)

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_balloon_final_balance_zero(self):
        """Balloon loan: final balance should be 0."""
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=12, loan_type="balloon"
        ))
        assert result["schedule"][-1]["balance"] == pytest.approx(0.0, abs=0.01)

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_unknown_loan_type(self):
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=12, loan_type="unknown"
        ))
        assert "error" in result

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_download_url_null_when_unavailable(self):
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=12
        ))
        assert result["download_url"] is None


class TestBondModel:
    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_at_par_price(self):
        """Bond price = face value when coupon_rate == YTM."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.20, periods=5, ytm=0.20
        ))
        assert result["price"] == pytest.approx(1_000_000, rel=1e-4)

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_discount_bond_price_below_par(self):
        """When YTM > coupon rate, price < face value."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=5, ytm=0.22
        ))
        assert result["price"] < 1_000_000

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_premium_bond_price_above_par(self):
        """When YTM < coupon rate, price > face value."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.22, periods=5, ytm=0.18
        ))
        assert result["price"] > 1_000_000

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_macaulay_duration_le_maturity(self):
        """Macaulay duration (years) must be ≤ maturity (periods/frequency)."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=5, ytm=0.20
        ))
        assert result["macaulay_duration_years"] <= 5.0

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_modified_duration_lt_macaulay(self):
        """Modified duration < Macaulay duration (for positive YTM)."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=5, ytm=0.20
        ))
        assert result["modified_duration"] < result["macaulay_duration_years"]

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_model_type(self):
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=3, ytm=0.20
        ))
        assert result["model_type"] == "bond"

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_download_url_null_when_unavailable(self):
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=3, ytm=0.20
        ))
        assert result["download_url"] is None


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
