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

    def test_sensitivity_recomputes_pv_fcff_per_wacc(self):
        """Sensitivity table must recompute PV(FCFF) at each row's WACC, not reuse the base WACC's pv_sum."""
        pytest.importorskip("openpyxl")
        from rag.tools.financial_modeling import _build_dcf_workbook, _compute_fcff

        projs = [{"ebit": 200, "tax_rate": 0.25, "da": 30, "capex": 40, "delta_wc": 10}] * 3
        base_wacc = 0.22
        base_tg = 0.03
        # Compute base_pv_sum exactly as build_dcf_model does
        fcff = _compute_fcff(200, 0.25, 30, 40, 10)  # = 130
        base_pv_sum = sum(fcff / (1 + base_wacc) ** (t + 1) for t in range(3))

        wb = _build_dcf_workbook("TestCo", projs, base_wacc, base_tg, 0.0, 1000.0, base_pv_sum)
        ws_s = wb["Sensitivity"]

        # Row 2 = WACC index 0 = base_wacc - 0.04 = 0.18
        # Col 2 = TG index 0 = base_tg - 0.02 = 0.01
        w_test = round(base_wacc - 0.04, 4)   # 0.18
        tg_test = round(base_tg - 0.02, 4)    # 0.01

        sheet_price = ws_s.cell(row=2, column=2).value
        assert sheet_price != "N/A"

        # Correct: recompute PV(FCFF) at w_test, use tg_test for TV numerator
        correct_pv_sum = sum(fcff / (1 + w_test) ** (t + 1) for t in range(3))
        tv = fcff * (1 + tg_test) / (w_test - tg_test)
        pv_tv = tv / (1 + w_test) ** 3
        correct_price = round((correct_pv_sum + pv_tv) / 1000.0, 2)

        # Compute buggy price so we can assert the bug actually existed
        last_fcff_grown = fcff * (1 + base_tg)
        tv_buggy = last_fcff_grown / (w_test - tg_test)
        pv_tv_buggy = tv_buggy / (1 + w_test) ** 3
        buggy_price = round((base_pv_sum + pv_tv_buggy) / 1000.0, 2)
        assert buggy_price != correct_price, "Test setup error: buggy and correct prices are equal"

        assert sheet_price == pytest.approx(correct_price, abs=0.01), (
            f"Sensitivity price {sheet_price} should be correct={correct_price}, "
            f"buggy value would be {buggy_price}"
        )


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

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_balloon_at_specified_month(self):
        """Balloon payment must occur at balloon_month, not at term_months."""
        from rag.tools.financial_modeling import build_loan_amortization
        db = MagicMock()
        result = json.loads(build_loan_amortization(
            db, principal=100.0, annual_rate=0.18, term_months=24,
            loan_type="balloon", balloon_month=12
        ))
        schedule = result["schedule"]
        assert len(schedule) == 12, f"Expected 12 months, got {len(schedule)}"
        assert schedule[-1]["balance"] == pytest.approx(0.0, abs=0.01)
        assert result["summary"]["balloon_month"] == 12


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


class TestBondConvexity:
    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_convexity_positive(self):
        """Convexity must be positive for a plain coupon bond."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=5, ytm=0.20
        ))
        assert "convexity" in result
        assert result["convexity"] > 0

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_dv01_equals_mod_dur_times_price(self):
        """DV01 = ModDur × Price / 10000."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        result = json.loads(build_bond_model(
            db, face_value=1_000_000, coupon_rate=0.18, periods=5, ytm=0.20
        ))
        expected_dv01 = result["modified_duration"] * result["price"] / 10000
        assert result["dv01"] == pytest.approx(expected_dv01, rel=1e-4)

    @patch("rag.tools.financial_modeling.EXCEL_AVAILABLE", False)
    def test_longer_maturity_higher_convexity(self):
        """Longer maturity bond has higher convexity, all else equal."""
        from rag.tools.financial_modeling import build_bond_model
        db = MagicMock()
        short = json.loads(build_bond_model(db, face_value=1_000_000, coupon_rate=0.18, periods=3, ytm=0.20))
        long_ = json.loads(build_bond_model(db, face_value=1_000_000, coupon_rate=0.18, periods=10, ytm=0.20))
        assert long_["convexity"] > short["convexity"]


class TestWACC:
    def test_all_equity_wacc_equals_ke(self):
        """100% equity: WACC = Ke exactly."""
        from rag.tools.financial_modeling import compute_wacc
        db = MagicMock()
        result = json.loads(compute_wacc(
            db, equity_value=1000.0, debt_value=0.0,
            cost_of_equity=0.15, cost_of_debt=0.10, tax_rate=0.25
        ))
        assert result["wacc"] == pytest.approx(0.15, rel=1e-6)

    def test_all_debt_wacc_equals_after_tax_kd(self):
        """100% debt: WACC = Kd × (1-T)."""
        from rag.tools.financial_modeling import compute_wacc
        db = MagicMock()
        result = json.loads(compute_wacc(
            db, equity_value=0.0, debt_value=1000.0,
            cost_of_equity=0.15, cost_of_debt=0.10, tax_rate=0.25
        ))
        assert result["wacc"] == pytest.approx(0.10 * 0.75, rel=1e-6)

    def test_50_50_split(self):
        """50/50 split: WACC = 0.5*Ke + 0.5*Kd*(1-T)."""
        from rag.tools.financial_modeling import compute_wacc
        db = MagicMock()
        result = json.loads(compute_wacc(
            db, equity_value=500.0, debt_value=500.0,
            cost_of_equity=0.20, cost_of_debt=0.12, tax_rate=0.25
        ))
        expected = 0.5 * 0.20 + 0.5 * 0.12 * 0.75
        assert result["wacc"] == pytest.approx(expected, rel=1e-6)

    def test_zero_total_value_error(self):
        from rag.tools.financial_modeling import compute_wacc
        db = MagicMock()
        result = json.loads(compute_wacc(
            db, equity_value=0.0, debt_value=0.0,
            cost_of_equity=0.15, cost_of_debt=0.10, tax_rate=0.25
        ))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_wacc
        db = MagicMock()
        result = json.loads(compute_wacc(
            db, equity_value=700.0, debt_value=300.0,
            cost_of_equity=0.18, cost_of_debt=0.12, tax_rate=0.25
        ))
        assert result["model_type"] == "wacc"


class TestCAPM:
    def test_zero_beta_returns_rf(self):
        """Zero beta: Ke = Rf (risk-free rate only)."""
        from rag.tools.financial_modeling import compute_capm
        db = MagicMock()
        result = json.loads(compute_capm(db, risk_free_rate=0.20, beta=0.0, equity_risk_premium=0.06))
        assert result["cost_of_equity"] == pytest.approx(0.20, rel=1e-6)

    def test_beta_one_adds_full_erp(self):
        """Beta=1: Ke = Rf + ERP."""
        from rag.tools.financial_modeling import compute_capm
        db = MagicMock()
        result = json.loads(compute_capm(db, risk_free_rate=0.20, beta=1.0, equity_risk_premium=0.06))
        assert result["cost_of_equity"] == pytest.approx(0.26, rel=1e-6)

    def test_size_and_specific_premiums_added(self):
        """Size and specific premiums add correctly."""
        from rag.tools.financial_modeling import compute_capm
        db = MagicMock()
        result = json.loads(compute_capm(
            db, risk_free_rate=0.20, beta=1.0, equity_risk_premium=0.06,
            size_premium=0.02, specific_premium=0.01
        ))
        assert result["cost_of_equity"] == pytest.approx(0.29, rel=1e-6)

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_capm
        db = MagicMock()
        result = json.loads(compute_capm(db, risk_free_rate=0.20, beta=1.2, equity_risk_premium=0.06))
        assert result["model_type"] == "capm"

    def test_output_fields(self):
        from rag.tools.financial_modeling import compute_capm
        db = MagicMock()
        result = json.loads(compute_capm(db, risk_free_rate=0.20, beta=1.2, equity_risk_premium=0.06))
        assert "cost_of_equity_pct" in result
        assert "formula" in result


class TestDDM:
    def test_gordon_at_par(self):
        """Gordon Growth: P₀ = D₁/(ke-g). D0=100, g=5%, ke=15% → P0=1050."""
        from rag.tools.financial_modeling import build_ddm_model
        db = MagicMock()
        result = json.loads(build_ddm_model(
            db, current_dividend=100.0, discount_rate=0.15,
            model_type="gordon", growth_rate=0.05
        ))
        assert result["intrinsic_value"] == pytest.approx(1050.0, rel=1e-4)

    def test_gordon_ke_lte_g_error(self):
        """ke <= g must return error."""
        from rag.tools.financial_modeling import build_ddm_model
        db = MagicMock()
        result = json.loads(build_ddm_model(
            db, current_dividend=100.0, discount_rate=0.05,
            model_type="gordon", growth_rate=0.05
        ))
        assert "error" in result

    def test_h_model_equals_gordon_when_gs_equals_gl(self):
        """H-model reduces to Gordon Growth when short_term_growth == long_term_growth."""
        from rag.tools.financial_modeling import build_ddm_model
        db = MagicMock()
        gordon = json.loads(build_ddm_model(
            db, current_dividend=100.0, discount_rate=0.15,
            model_type="gordon", growth_rate=0.05
        ))
        h_model = json.loads(build_ddm_model(
            db, current_dividend=100.0, discount_rate=0.15,
            model_type="h_model", short_term_growth=0.05, long_term_growth=0.05, half_life=5.0
        ))
        assert h_model["intrinsic_value"] == pytest.approx(gordon["intrinsic_value"], rel=1e-4)

    def test_multistage_pv_components_sum_to_intrinsic(self):
        """pv_dividends + pv_terminal == intrinsic_value."""
        from rag.tools.financial_modeling import build_ddm_model
        db = MagicMock()
        result = json.loads(build_ddm_model(
            db, current_dividend=50.0, discount_rate=0.15,
            model_type="multistage",
            stage_growth_rates=[0.15, 0.12, 0.10],
            terminal_growth=0.05
        ))
        assert result["intrinsic_value"] == pytest.approx(
            result["pv_dividends"] + result["pv_terminal"], rel=1e-4
        )

    def test_multistage_schedule_length(self):
        """Schedule has one row per explicit stage year."""
        from rag.tools.financial_modeling import build_ddm_model
        db = MagicMock()
        result = json.loads(build_ddm_model(
            db, current_dividend=50.0, discount_rate=0.15,
            model_type="multistage",
            stage_growth_rates=[0.15, 0.12, 0.10],
            terminal_growth=0.05
        ))
        assert len(result["schedule"]) == 3

    def test_unknown_model_type_error(self):
        from rag.tools.financial_modeling import build_ddm_model
        db = MagicMock()
        result = json.loads(build_ddm_model(
            db, current_dividend=50.0, discount_rate=0.15, model_type="unknown"
        ))
        assert "error" in result


class TestResidualIncome:
    def test_negative_ri_when_eps_zero(self):
        """Zero EPS < equity charge → RI negative → intrinsic value < book value."""
        from rag.tools.financial_modeling import build_residual_income_model
        db = MagicMock()
        result = json.loads(build_residual_income_model(
            db,
            book_value_per_share=100.0,
            earnings_per_share_list=[0.0, 0.0, 0.0],
            cost_of_equity=0.15,
            persistence_factor=0.0,
        ))
        assert result["intrinsic_value"] < result["book_value_per_share"]

    def test_positive_ri_creates_premium_to_book(self):
        """Positive RI → intrinsic value > book value."""
        from rag.tools.financial_modeling import build_residual_income_model
        db = MagicMock()
        result = json.loads(build_residual_income_model(
            db,
            book_value_per_share=100.0,
            earnings_per_share_list=[20.0, 20.0, 20.0],
            cost_of_equity=0.10,
            persistence_factor=0.0,
        ))
        assert result["intrinsic_value"] > result["book_value_per_share"]

    def test_pv_components_sum_to_intrinsic(self):
        """book_value + pv_explicit_ri + pv_continuing_ri == intrinsic_value."""
        from rag.tools.financial_modeling import build_residual_income_model
        db = MagicMock()
        result = json.loads(build_residual_income_model(
            db,
            book_value_per_share=100.0,
            earnings_per_share_list=[20.0, 22.0, 24.0],
            cost_of_equity=0.12,
            persistence_factor=1.0,
        ))
        assert result["intrinsic_value"] == pytest.approx(
            result["book_value_per_share"] + result["pv_explicit_ri"] + result["pv_continuing_ri"],
            rel=1e-4
        )

    def test_model_type(self):
        from rag.tools.financial_modeling import build_residual_income_model
        db = MagicMock()
        result = json.loads(build_residual_income_model(
            db, book_value_per_share=100.0,
            earnings_per_share_list=[15.0], cost_of_equity=0.12
        ))
        assert result["model_type"] == "residual_income"

    def test_schedule_length_matches_eps_list(self):
        from rag.tools.financial_modeling import build_residual_income_model
        db = MagicMock()
        result = json.loads(build_residual_income_model(
            db, book_value_per_share=100.0,
            earnings_per_share_list=[15.0, 16.0, 17.0], cost_of_equity=0.12
        ))
        assert len(result["schedule"]) == 3


class TestMultiples:
    def _base_inputs(self):
        return dict(
            ebitda=100.0, net_income=50.0, book_value=500.0, revenue=400.0,
            shares_outstanding=100.0, net_debt=200.0,
            peer_ev_ebitda=8.0, peer_pe=12.0, peer_pb=1.5, peer_ps=2.0,
        )

    def test_ev_ebitda_implied_price(self):
        """EV/EBITDA: implied_price = (EBITDA × multiple − net_debt) / shares."""
        from rag.tools.financial_modeling import build_multiples_model
        db = MagicMock()
        result = json.loads(build_multiples_model(db, **self._base_inputs()))
        expected = (100.0 * 8.0 - 200.0) / 100.0  # = 6.0
        assert result["multiples"]["ev_ebitda"]["implied_price"] == pytest.approx(expected, rel=1e-4)

    def test_pe_implied_price(self):
        """P/E: implied_price = (NI / shares) × PE."""
        from rag.tools.financial_modeling import build_multiples_model
        db = MagicMock()
        result = json.loads(build_multiples_model(db, **self._base_inputs()))
        eps = 50.0 / 100.0
        expected = eps * 12.0  # = 6.0
        assert result["multiples"]["pe"]["implied_price"] == pytest.approx(expected, rel=1e-4)

    def test_pb_implied_price(self):
        """P/B: implied_price = (Book / shares) × PB."""
        from rag.tools.financial_modeling import build_multiples_model
        db = MagicMock()
        result = json.loads(build_multiples_model(db, **self._base_inputs()))
        bvps = 500.0 / 100.0
        expected = bvps * 1.5  # = 7.5
        assert result["multiples"]["pb"]["implied_price"] == pytest.approx(expected, rel=1e-4)

    def test_ps_implied_price(self):
        """P/S: implied_price = (Revenue / shares) × PS."""
        from rag.tools.financial_modeling import build_multiples_model
        db = MagicMock()
        result = json.loads(build_multiples_model(db, **self._base_inputs()))
        rps = 400.0 / 100.0
        expected = rps * 2.0  # = 8.0
        assert result["multiples"]["ps"]["implied_price"] == pytest.approx(expected, rel=1e-4)

    def test_range_fields_present(self):
        from rag.tools.financial_modeling import build_multiples_model
        db = MagicMock()
        result = json.loads(build_multiples_model(db, **self._base_inputs()))
        assert "implied_price_min" in result
        assert "implied_price_max" in result
        assert "implied_price_median" in result
        assert result["implied_price_max"] >= result["implied_price_min"]

    def test_model_type(self):
        from rag.tools.financial_modeling import build_multiples_model
        db = MagicMock()
        result = json.loads(build_multiples_model(db, **self._base_inputs()))
        assert result["model_type"] == "multiples"


class TestFCFE:
    def test_direct_computation(self):
        """FCFE = NI + DA - CapEx - DWC + Net Borrowing."""
        from rag.tools.financial_modeling import compute_fcfe
        db = MagicMock()
        # 100 + 20 - 30 - 5 + 10 = 95
        result = json.loads(compute_fcfe(
            db, net_income=100.0, da=20.0, capex=30.0, delta_wc=5.0, net_borrowing=10.0
        ))
        assert result["fcfe"] == pytest.approx(95.0)
        assert result["calculation_path"] == "direct"

    def test_from_fcff_path(self):
        """FCFE = FCFF - Interest*(1-T) + Net Borrowing."""
        from rag.tools.financial_modeling import compute_fcfe
        db = MagicMock()
        # FCFF=80, interest=10, T=0.25, net_borrowing=5
        # FCFE = 80 - 10*(1-0.25) + 5 = 80 - 7.5 + 5 = 77.5
        result = json.loads(compute_fcfe(
            db, fcff=80.0, interest_expense=10.0, tax_rate=0.25, net_borrowing=5.0
        ))
        assert result["fcfe"] == pytest.approx(77.5)
        assert result["calculation_path"] == "from_fcff"

    def test_identity_direct_vs_fcff_path(self):
        """Both paths give same FCFE when inputs are consistent."""
        from rag.tools.financial_modeling import compute_fcfe
        db = MagicMock()
        # NI=75, DA=20, CapEx=30, DWC=5, NetBorrow=10, Interest=10, T=0.25
        # FCFE direct = 75 + 20 - 30 - 5 + 10 = 70
        # FCFF = 67.5, FCFE = 67.5 - 7.5 + 10 = 70
        direct = json.loads(compute_fcfe(
            db, net_income=75.0, da=20.0, capex=30.0, delta_wc=5.0, net_borrowing=10.0
        ))
        from_fcff = json.loads(compute_fcfe(
            db, fcff=67.5, interest_expense=10.0, tax_rate=0.25, net_borrowing=10.0
        ))
        assert direct["fcfe"] == pytest.approx(from_fcff["fcfe"], rel=1e-4)

    def test_missing_params_error(self):
        from rag.tools.financial_modeling import compute_fcfe
        db = MagicMock()
        result = json.loads(compute_fcfe(db, net_income=100.0))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_fcfe
        db = MagicMock()
        result = json.loads(compute_fcfe(
            db, net_income=100.0, da=20.0, capex=30.0, delta_wc=5.0, net_borrowing=10.0
        ))
        assert result["model_type"] == "fcfe"


class TestRevenueModel:
    def test_growth_rates_compounding(self):
        """Revenue compounds correctly year over year."""
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=3,
            approach="growth_rates", growth_rates=[0.10, 0.20, 0.15]
        ))
        projs = result["projections"]
        assert projs[0]["revenue"] == pytest.approx(1100.0, rel=1e-4)
        assert projs[1]["revenue"] == pytest.approx(1320.0, rel=1e-4)
        assert projs[2]["revenue"] == pytest.approx(1518.0, rel=1e-4)

    def test_growth_rates_pct_field(self):
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=2,
            approach="growth_rates", growth_rates=[0.10, 0.20]
        ))
        assert result["projections"][0]["growth_pct"] == pytest.approx(10.0, rel=1e-4)
        assert result["projections"][1]["growth_pct"] == pytest.approx(20.0, rel=1e-4)

    def test_top_down_revenue(self):
        """top_down: revenue = market_size × (1+g)^t × share."""
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=0.0, years=2, approach="top_down",
            market_size=10000.0, market_share_pct=0.05, market_growth_rate=0.10
        ))
        projs = result["projections"]
        assert projs[0]["revenue"] == pytest.approx(550.0, rel=1e-4)
        assert projs[1]["revenue"] == pytest.approx(605.0, rel=1e-4)

    def test_bottom_up_revenue(self):
        """bottom_up: revenue = units × price, both growing."""
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=0.0, years=1, approach="bottom_up",
            units_sold=1000.0, price_per_unit=100.0,
            volume_growth_rate=0.10, price_growth_rate=0.05
        ))
        # Year 1: 1000*1.10 × 100*1.05 = 1100 × 105 = 115500
        assert result["projections"][0]["revenue"] == pytest.approx(115500.0, rel=1e-4)

    def test_wrong_growth_rates_length_error(self):
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=3,
            approach="growth_rates", growth_rates=[0.10, 0.20]
        ))
        assert "error" in result

    def test_unknown_approach_error(self):
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=2, approach="magic"
        ))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=2,
            approach="growth_rates", growth_rates=[0.10, 0.10]
        ))
        assert result["model_type"] == "revenue_model"

    def test_schedule_length(self):
        from rag.tools.financial_modeling import build_revenue_model
        db = MagicMock()
        result = json.loads(build_revenue_model(
            db, base_revenue=1000.0, years=5,
            approach="growth_rates", growth_rates=[0.10]*5
        ))
        assert len(result["projections"]) == 5


class TestWCModel:
    def test_ar_formula(self):
        """AR = (DSO / 365) × Revenue."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60, dso=30.0, dio=45.0, dpo=20.0
        ))
        assert result["projections"][0]["ar"] == pytest.approx((30 / 365) * 1000.0, rel=1e-4)

    def test_ccc_formula(self):
        """CCC = DSO + DIO - DPO."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60, dso=30.0, dio=45.0, dpo=20.0
        ))
        assert result["projections"][0]["ccc"] == pytest.approx(55.0, rel=1e-4)

    def test_delta_wc_year1_uses_opening_nwc(self):
        """Year 1 ΔWC = NWC(1) - opening_nwc."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60, dso=30.0, dio=45.0, dpo=20.0, opening_nwc=0.0
        ))
        p = result["projections"][0]
        expected_nwc = p["ar"] + p["inventory"] - p["ap"]
        assert p["delta_wc"] == pytest.approx(expected_nwc, rel=1e-4)

    def test_delta_wc_positive_means_cash_outflow(self):
        """When NWC increases, ΔWC > 0 (cash outflow for FCFF)."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0, 1200.0], cogs_pct=0.60, dso=30.0, dio=45.0, dpo=20.0
        ))
        assert result["projections"][0]["delta_wc"] > 0
        assert result["projections"][1]["delta_wc"] > 0

    def test_inventory_formula(self):
        """Inventory = (DIO / 365) × COGS."""
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60, dso=30.0, dio=45.0, dpo=20.0
        ))
        assert result["projections"][0]["inventory"] == pytest.approx((45 / 365) * 600.0, rel=1e-4)

    def test_model_type(self):
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0], cogs_pct=0.60, dso=30.0, dio=45.0, dpo=20.0
        ))
        assert result["model_type"] == "wc_model"

    def test_schedule_length(self):
        from rag.tools.financial_modeling import build_wc_model
        db = MagicMock()
        result = json.loads(build_wc_model(
            db, revenue_list=[1000.0, 1100.0, 1200.0], cogs_pct=0.60, dso=30.0, dio=45.0, dpo=20.0
        ))
        assert len(result["projections"]) == 3


class TestCapexSchedule:
    def test_net_ppe_roll_forward(self):
        """Net PP&E = gross_ppe - accum_dep, rolling forward correctly."""
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=100.0,
            useful_life=10.0, years=1, capex_list=[50.0]
        ))
        p = result["projections"][0]
        # gross=500+50=550, DA=500/10=50, accum=100+50=150, net=550-150=400
        assert p["gross_ppe"] == pytest.approx(550.0, rel=1e-4)
        assert p["da"] == pytest.approx(50.0, rel=1e-4)
        assert p["accum_dep"] == pytest.approx(150.0, rel=1e-4)
        assert p["net_ppe"] == pytest.approx(400.0, rel=1e-4)

    def test_da_straight_line(self):
        """DA = opening_gross_ppe / useful_life."""
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=1000.0, opening_accum_dep=0.0,
            useful_life=20.0, years=1, capex_list=[0.0]
        ))
        assert result["projections"][0]["da"] == pytest.approx(50.0, rel=1e-4)

    def test_capex_pct_revenue_path(self):
        """capex = capex_pct_revenue × revenue when capex_list not provided."""
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=0.0,
            useful_life=10.0, years=2,
            capex_pct_revenue=0.08, revenue_list=[1000.0, 1100.0]
        ))
        assert result["projections"][0]["capex"] == pytest.approx(80.0, rel=1e-4)
        assert result["projections"][1]["capex"] == pytest.approx(88.0, rel=1e-4)

    def test_accum_dep_never_exceeds_gross(self):
        """Net PP&E is never negative."""
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=100.0, opening_accum_dep=90.0,
            useful_life=2.0, years=3, capex_list=[0.0, 0.0, 0.0]
        ))
        for p in result["projections"]:
            assert p["net_ppe"] >= 0.0

    def test_schedule_length(self):
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=100.0,
            useful_life=10.0, years=4, capex_list=[50.0]*4
        ))
        assert len(result["projections"]) == 4

    def test_model_type(self):
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=0.0,
            useful_life=10.0, years=1, capex_list=[50.0]
        ))
        assert result["model_type"] == "capex_schedule"

    def test_missing_capex_inputs_error(self):
        from rag.tools.financial_modeling import build_capex_schedule
        db = MagicMock()
        result = json.loads(build_capex_schedule(
            db, opening_gross_ppe=500.0, opening_accum_dep=0.0,
            useful_life=10.0, years=2
        ))
        assert "error" in result


class TestDebtSchedule:
    def _single_tranche(self):
        return [{"name": "TLA", "opening_balance": 1000.0, "annual_rate": 0.08, "amortization_pct": 0.10}]

    def test_ending_balance_after_amortization(self):
        """Ending = opening - opening × amort_pct."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=1))
        assert result["projections"][0]["total_debt"] == pytest.approx(900.0, rel=1e-4)

    def test_interest_uses_average_balance(self):
        """Interest = ((Opening + Ending) / 2) × rate."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=1))
        # avg = (1000 + 900) / 2 = 950; interest = 950 × 0.08 = 76
        assert result["projections"][0]["interest_expense"] == pytest.approx(76.0, rel=1e-4)

    def test_multi_tranche_sums_correctly(self):
        """Total debt and interest are sum across all tranches."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        tranches = [
            {"name": "TLA", "opening_balance": 500.0, "annual_rate": 0.08, "amortization_pct": 0.10},
            {"name": "Senior Notes", "opening_balance": 300.0, "annual_rate": 0.10, "amortization_pct": 0.0},
        ]
        result = json.loads(build_debt_schedule(db, tranches=tranches, years=1))
        # TLA: ending=450, interest=avg(500,450)*0.08=38; Notes: ending=300, interest=30
        assert result["projections"][0]["total_debt"] == pytest.approx(750.0, rel=1e-4)
        assert result["projections"][0]["interest_expense"] == pytest.approx(68.0, rel=1e-4)

    def test_net_debt_uses_cash(self):
        """net_debt = total_debt - cash."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(
            db, tranches=self._single_tranche(), years=1, cash_list=[50.0]
        ))
        assert result["projections"][0]["net_debt"] == pytest.approx(850.0, rel=1e-4)

    def test_balance_rolls_forward(self):
        """Year 2 opening = year 1 ending."""
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=2))
        # Year 1: ending=900. Year 2: ending=900-90=810
        assert result["projections"][1]["total_debt"] == pytest.approx(810.0, rel=1e-4)

    def test_balance_never_negative(self):
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        tranches = [{"name": "TLA", "opening_balance": 100.0, "annual_rate": 0.05, "amortization_pct": 0.60}]
        result = json.loads(build_debt_schedule(db, tranches=tranches, years=3))
        for p in result["projections"]:
            assert p["total_debt"] >= 0.0

    def test_model_type(self):
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=1))
        assert result["model_type"] == "debt_schedule"

    def test_schedule_length(self):
        from rag.tools.financial_modeling import build_debt_schedule
        db = MagicMock()
        result = json.loads(build_debt_schedule(db, tranches=self._single_tranche(), years=5))
        assert len(result["projections"]) == 5


class TestThreeStatementModel:
    def _base_inputs(self):
        """Verified-balanced single-year inputs (no WC)."""
        return dict(
            revenue_list=[1000.0],
            ebit_list=[200.0],
            interest_expense_list=[30.0],
            tax_rate=0.25,
            da_list=[50.0],
            capex_list=[80.0],
            total_debt_list=[350.0],
            net_borrowing_list=[-50.0],
            opening_bs={"cash": 100.0, "ppe_net": 500.0, "other_assets": 50.0,
                        "other_liabilities": 50.0, "equity": 200.0},
        )

    def test_balance_sheet_balances(self):
        """Total Assets must equal Total L+E (balance_check_passed=True)."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        bs = result["years"][0]["balance_sheet"]
        assert bs["balance_check_passed"] is True
        assert bs["balance_error"] < 0.01

    def test_balance_sheet_balances_with_wc(self):
        """Balance holds when AR/inventory/AP lists are provided."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        inp = self._base_inputs()
        inp["ar_list"] = [100.0]
        inp["inventory_list"] = [80.0]
        inp["ap_list"] = [40.0]
        result = json.loads(build_three_statement_model(db, **inp))
        bs = result["years"][0]["balance_sheet"]
        assert bs["balance_check_passed"] is True
        assert bs["balance_error"] < 0.01

    def test_cash_rolls_forward(self):
        """Cash(t) = Cash(t-1) + net_change_in_cash."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        yr = result["years"][0]
        expected = 100.0 + yr["cash_flow_statement"]["net_change_in_cash"]
        assert yr["balance_sheet"]["cash"] == pytest.approx(expected, rel=1e-4)

    def test_ppe_rolls_forward(self):
        """PP&E(t) = PP&E(t-1) + CapEx - DA."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        # 500 + 80 - 50 = 530
        assert result["years"][0]["balance_sheet"]["ppe_net"] == pytest.approx(530.0, rel=1e-4)

    def test_equity_rolls_forward(self):
        """Equity(t) = Equity(t-1) + NI - Dividends."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        yr = result["years"][0]
        ni = yr["income_statement"]["net_income"]
        divid = yr["income_statement"]["dividends"]
        assert yr["balance_sheet"]["equity"] == pytest.approx(200.0 + ni - divid, rel=1e-4)

    def test_operating_cf_formula(self):
        """Operating CF = NI + DA - delta_wc (no WC → delta_wc=0)."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        yr = result["years"][0]
        ni = yr["income_statement"]["net_income"]
        # no WC: delta_wc = 0, da = 50
        assert yr["cash_flow_statement"]["operating_cf"] == pytest.approx(ni + 50.0, rel=1e-4)

    def test_net_income_formula(self):
        """NI = (EBIT - interest) * (1 - tax_rate) when EBT > 0."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        # (200-30) * 0.75 = 127.5
        assert result["years"][0]["income_statement"]["net_income"] == pytest.approx(127.5, rel=1e-4)

    def test_tax_zero_when_ebt_negative(self):
        """Loss year: EBT < 0 → tax = 0, NI = EBT."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        inp = self._base_inputs()
        inp["ebit_list"] = [10.0]   # EBIT=10, interest=30 → EBT=-20
        result = json.loads(build_three_statement_model(db, **inp))
        yr = result["years"][0]["income_statement"]
        assert yr["tax"] == pytest.approx(0.0, abs=1e-6)
        assert yr["net_income"] == pytest.approx(-20.0, rel=1e-4)

    def test_schedule_length(self):
        """One entry per year in the years list."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        inp = dict(
            revenue_list=[1000.0, 1100.0, 1200.0],
            ebit_list=[200.0, 220.0, 240.0],
            interest_expense_list=[30.0, 25.0, 20.0],
            tax_rate=0.25,
            da_list=[50.0, 55.0, 60.0],
            capex_list=[80.0, 85.0, 90.0],
            total_debt_list=[350.0, 300.0, 250.0],
            net_borrowing_list=[-50.0, -50.0, -50.0],
            opening_bs={"cash": 100.0, "ppe_net": 500.0, "other_assets": 50.0,
                        "other_liabilities": 50.0, "equity": 200.0},
        )
        result = json.loads(build_three_statement_model(db, **inp))
        assert len(result["years"]) == 3

    def test_model_type(self):
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        result = json.loads(build_three_statement_model(db, **self._base_inputs()))
        assert result["model_type"] == "three_statement_model"

    def test_mismatched_list_length_error(self):
        """Lists of different lengths must return an error."""
        from rag.tools.financial_modeling import build_three_statement_model
        db = MagicMock()
        inp = self._base_inputs()
        inp["ebit_list"] = [200.0, 220.0]   # 2 items vs 1 revenue
        result = json.loads(build_three_statement_model(db, **inp))
        assert "error" in result


class TestComputeBeta:
    def test_unlever_then_relever_same_de_returns_original(self):
        """Unlever then re-lever at same D/E must recover original levered beta."""
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.2, debt_to_equity=0.5, tax_rate=0.25,
            target_debt_to_equity=0.5
        ))
        assert result["re_levered_beta"] == pytest.approx(1.2, rel=1e-4)

    def test_unlevered_beta_less_than_levered(self):
        """β_U < β_L when D/E > 0 and T > 0."""
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.5, debt_to_equity=0.8, tax_rate=0.25
        ))
        assert result["unlevered_beta"] < 1.5

    def test_bloomberg_adjusted_high_beta_decreases(self):
        """Bloomberg adj: beta > 1 should be pulled toward 1 (decrease)."""
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.8, debt_to_equity=0.5, tax_rate=0.25
        ))
        assert result["adjusted_beta"] < 1.8

    def test_bloomberg_adjusted_low_beta_increases(self):
        """Bloomberg adj: beta < 1 should increase toward 1."""
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=0.6, debt_to_equity=0.5, tax_rate=0.25
        ))
        assert result["adjusted_beta"] > 0.6

    def test_zero_debt_unlever_equals_levered(self):
        """Zero D/E: β_U = β_L."""
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.1, debt_to_equity=0.0, tax_rate=0.25
        ))
        assert result["unlevered_beta"] == pytest.approx(1.1, rel=1e-4)

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_beta
        db = MagicMock()
        result = json.loads(compute_beta(
            db, levered_beta=1.2, debt_to_equity=0.5, tax_rate=0.25
        ))
        assert result["model_type"] == "beta"


class TestScenarioModel:
    def _base(self):
        return {"price_per_share": 100.0, "enterprise_value": 5000.0}

    def test_bear_less_than_base_less_than_bull(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results=self._base(), bear_pct=-0.30, bull_pct=0.25
        ))
        for key in self._base():
            assert result["scenarios"]["Bear"][key] < result["scenarios"]["Base"][key]
            assert result["scenarios"]["Base"][key] < result["scenarios"]["Bull"][key]

    def test_bear_value_matches_pct(self):
        """Bear value = base × (1 + bear_pct)."""
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["scenarios"]["Bear"]["price"] == pytest.approx(70.0, rel=1e-4)

    def test_bull_value_matches_pct(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["scenarios"]["Bull"]["price"] == pytest.approx(125.0, rel=1e-4)

    def test_per_metric_override_respected(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0, "ev": 5000.0},
            bear_pct=-0.30, bull_pct=0.25, bear_overrides={"price": -0.50}
        ))
        assert result["scenarios"]["Bear"]["price"] == pytest.approx(50.0, rel=1e-4)
        assert result["scenarios"]["Bear"]["ev"] == pytest.approx(3500.0, rel=1e-4)

    def test_downside_pct_correct(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["summary"]["downside_pct"]["price"] == pytest.approx(-30.0, rel=1e-4)

    def test_upside_pct_correct(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["summary"]["upside_pct"]["price"] == pytest.approx(25.0, rel=1e-4)

    def test_empty_base_results_error(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(db, base_results={}, bear_pct=-0.30, bull_pct=0.25))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import build_scenario_model
        db = MagicMock()
        result = json.loads(build_scenario_model(
            db, base_results={"price": 100.0}, bear_pct=-0.30, bull_pct=0.25
        ))
        assert result["model_type"] == "scenario_model"


class TestOperatingLeverage:
    def test_contribution_margin(self):
        """CM = Revenue - Variable Costs."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["contribution_margin"] == pytest.approx(400.0, rel=1e-4)

    def test_cm_ratio(self):
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["cm_ratio"] == pytest.approx(0.40, rel=1e-4)

    def test_ebit(self):
        """EBIT = CM - Fixed Costs."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["ebit"] == pytest.approx(200.0, rel=1e-4)

    def test_dol_formula(self):
        """DOL = CM / EBIT."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["dol"] == pytest.approx(2.0, rel=1e-4)

    def test_breakeven_revenue(self):
        """Breakeven Revenue = Fixed Costs / CM Ratio."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["breakeven_revenue"] == pytest.approx(500.0, rel=1e-4)

    def test_breakeven_units_when_provided(self):
        """Breakeven Units = FC / (Price/unit - VC/unit)."""
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0, units_sold=500.0
        ))
        # Price=2, VC=1.2, CM/unit=0.8 → Breakeven=200/0.8=250
        assert result["breakeven_units"] == pytest.approx(250.0, rel=1e-4)

    def test_zero_cm_error(self):
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=1000.0, fixed_costs=200.0
        ))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_operating_leverage
        db = MagicMock()
        result = json.loads(compute_operating_leverage(
            db, revenue=1000.0, variable_costs=600.0, fixed_costs=200.0
        ))
        assert result["model_type"] == "operating_leverage"


class TestPVGO:
    def test_pvgo_plus_no_growth_equals_intrinsic(self):
        """PVGO + E₁/ke = intrinsic_value."""
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        assert result["pvgo"] + result["no_growth_value"] == pytest.approx(1000.0, rel=1e-4)

    def test_no_growth_value_formula(self):
        """No-growth value = E₁ / ke."""
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        assert result["no_growth_value"] == pytest.approx(800.0, rel=1e-4)

    def test_justified_pe_leading_formula(self):
        """Justified leading P/E = (1-b)/(ke-g)."""
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        # (1-0.5)/(0.10-0.05) = 10
        assert result["justified_pe_leading"] == pytest.approx(10.0, rel=1e-4)

    def test_justified_pe_trailing_formula(self):
        """Justified trailing P/E = (1-b)(1+g)/(ke-g)."""
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        assert result["justified_pe_trailing"] == pytest.approx(10.5, rel=1e-4)

    def test_ke_lte_g_error(self):
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.05, growth_rate=0.05, payout_ratio=0.50
        ))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_pvgo
        db = MagicMock()
        result = json.loads(compute_pvgo(
            db, intrinsic_value=1000.0, earnings_per_share=80.0,
            cost_of_equity=0.10, growth_rate=0.05, payout_ratio=0.50
        ))
        assert result["model_type"] == "pvgo"


class TestEVA:
    def test_nopat_formula(self):
        """NOPAT = EBIT × (1 - tax_rate)."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["nopat"] == pytest.approx(150.0, rel=1e-4)

    def test_roic_formula(self):
        """ROIC = NOPAT / Invested Capital."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["roic"] == pytest.approx(0.15, rel=1e-4)

    def test_eva_formula(self):
        """EVA = NOPAT - WACC × Invested Capital."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["eva"] == pytest.approx(30.0, rel=1e-4)

    def test_negative_eva_when_roic_lt_wacc(self):
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=100.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["eva"] < 0

    def test_eva_spread_formula(self):
        """EVA spread = ROIC - WACC."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["eva_spread"] == pytest.approx(0.03, rel=1e-4)

    def test_mva_when_market_value_provided(self):
        """MVA = Market Value - Book Value of IC."""
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0,
            market_value_of_firm=1500.0
        ))
        assert result["mva"] == pytest.approx(500.0, rel=1e-4)

    def test_mva_none_when_not_provided(self):
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["mva"] is None

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_eva
        db = MagicMock()
        result = json.loads(compute_eva(
            db, ebit=200.0, tax_rate=0.25, wacc=0.12, invested_capital=1000.0
        ))
        assert result["model_type"] == "eva"


class TestPortfolioStats:
    def test_two_asset_portfolio(self):
        """Portfolio of 2 uncorrelated assets with equal weight."""
        from rag.tools.financial_modeling import compute_portfolio_stats
        db = MagicMock()
        assets = [
            {"name": "A", "weight": 0.5, "expected_return": 0.10, "volatility": 0.20},
            {"name": "B", "weight": 0.5, "expected_return": 0.06, "volatility": 0.10},
        ]
        corr = [[1.0, 0.0], [0.0, 1.0]]
        result = json.loads(compute_portfolio_stats(db, assets, corr))
        assert result["portfolio_return"] == pytest.approx(0.08, abs=1e-4)
        # σp = sqrt(0.5^2*0.2^2 + 0.5^2*0.1^2) = sqrt(0.01+0.0025) = sqrt(0.0125)
        assert result["portfolio_volatility"] == pytest.approx(0.1118, abs=1e-3)
        assert result["diversification_ratio"] > 1.0  # diversification benefit

    def test_single_asset(self):
        """Single asset: portfolio = asset stats."""
        from rag.tools.financial_modeling import compute_portfolio_stats
        db = MagicMock()
        assets = [{"name": "X", "weight": 1.0, "expected_return": 0.12, "volatility": 0.25}]
        corr = [[1.0]]
        result = json.loads(compute_portfolio_stats(db, assets, corr))
        assert result["portfolio_return"] == pytest.approx(0.12, abs=1e-4)
        assert result["portfolio_volatility"] == pytest.approx(0.25, abs=1e-4)
        assert result["diversification_ratio"] == pytest.approx(1.0, abs=1e-4)

    def test_bad_weights_error(self):
        """Weights not summing to 1 returns error."""
        from rag.tools.financial_modeling import compute_portfolio_stats
        db = MagicMock()
        assets = [
            {"name": "A", "weight": 0.3, "expected_return": 0.10, "volatility": 0.20},
            {"name": "B", "weight": 0.3, "expected_return": 0.06, "volatility": 0.10},
        ]
        corr = [[1.0, 0.0], [0.0, 1.0]]
        result = json.loads(compute_portfolio_stats(db, assets, corr))
        assert "error" in result

    def test_corr_matrix_size_mismatch(self):
        from rag.tools.financial_modeling import compute_portfolio_stats
        db = MagicMock()
        assets = [
            {"name": "A", "weight": 0.5, "expected_return": 0.10, "volatility": 0.20},
            {"name": "B", "weight": 0.5, "expected_return": 0.06, "volatility": 0.10},
        ]
        corr = [[1.0]]  # wrong size
        result = json.loads(compute_portfolio_stats(db, assets, corr))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_portfolio_stats
        db = MagicMock()
        assets = [{"name": "X", "weight": 1.0, "expected_return": 0.12, "volatility": 0.25}]
        corr = [[1.0]]
        result = json.loads(compute_portfolio_stats(db, assets, corr))
        assert result["model_type"] == "portfolio_stats"


class TestRiskMetrics:
    def test_basic_sharpe(self):
        """Sharpe ratio with known monthly returns."""
        from rag.tools.financial_modeling import compute_risk_metrics
        db = MagicMock()
        # 12 months of 1% return
        returns = [0.01] * 12
        result = json.loads(compute_risk_metrics(db, returns, risk_free_rate=0.0, periods_per_year=12))
        assert result["annualized_return"] == pytest.approx(0.12, abs=1e-4)
        assert result["annualized_volatility"] == pytest.approx(0.0, abs=1e-4)
        # sharpe undefined (zero vol) → 0
        assert result["sharpe_ratio"] == pytest.approx(0.0, abs=1e-4)

    def test_all_negative_returns(self):
        """All negative returns: max drawdown should be substantial."""
        from rag.tools.financial_modeling import compute_risk_metrics
        db = MagicMock()
        returns = [-0.05, -0.03, -0.02, -0.04]
        result = json.loads(compute_risk_metrics(db, returns, periods_per_year=12))
        assert result["annualized_return"] < 0
        assert result["max_drawdown"] > 0

    def test_max_drawdown_known(self):
        """Max drawdown calculation."""
        from rag.tools.financial_modeling import compute_risk_metrics
        db = MagicMock()
        # Goes up 10%, then down 20%, then up 5%
        returns = [0.10, -0.20, 0.05]
        result = json.loads(compute_risk_metrics(db, returns, periods_per_year=12))
        # Peak at 1.10, trough at 1.10*0.80=0.88, DD = (1.10-0.88)/1.10 = 0.2
        assert result["max_drawdown"] == pytest.approx(0.2, abs=1e-4)

    def test_benchmark_metrics(self):
        """Benchmark-relative metrics are present when benchmark provided."""
        from rag.tools.financial_modeling import compute_risk_metrics
        db = MagicMock()
        returns = [0.02, 0.01, -0.01, 0.03]
        bench = [0.01, 0.01, 0.00, 0.02]
        result = json.loads(compute_risk_metrics(db, returns, benchmark_returns=bench, periods_per_year=12))
        assert "beta" in result
        assert "treynor_ratio" in result
        assert "information_ratio" in result
        assert "tracking_error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_risk_metrics
        db = MagicMock()
        result = json.loads(compute_risk_metrics(db, [0.01, 0.02], periods_per_year=12))
        assert result["model_type"] == "risk_metrics"

    def test_too_few_returns_error(self):
        from rag.tools.financial_modeling import compute_risk_metrics
        db = MagicMock()
        result = json.loads(compute_risk_metrics(db, [0.01]))
        assert "error" in result


class TestVaR:
    def test_parametric(self):
        """Parametric VaR with known inputs."""
        from rag.tools.financial_modeling import compute_var
        db = MagicMock()
        result = json.loads(compute_var(
            db, portfolio_value=1_000_000, confidence_level=0.95,
            method="parametric", expected_return=0.10, volatility=0.20
        ))
        assert result["method"] == "parametric"
        assert result["var_amount"] > 0
        assert result["var_pct"] > 0

    def test_historical(self):
        """Historical VaR from return series."""
        from rag.tools.financial_modeling import compute_var
        db = MagicMock()
        # 100 returns: mostly positive, a few negative
        returns = [-0.05, -0.04, -0.03, -0.02, -0.01] + [0.01] * 95
        result = json.loads(compute_var(
            db, portfolio_value=1_000_000, confidence_level=0.95,
            method="historical", returns=returns
        ))
        assert result["method"] == "historical"
        assert result["var_amount"] > 0

    def test_monte_carlo(self):
        """Monte Carlo VaR with seed for reproducibility."""
        from rag.tools.financial_modeling import compute_var
        db = MagicMock()
        result = json.loads(compute_var(
            db, portfolio_value=1_000_000, confidence_level=0.95,
            method="monte_carlo", expected_return=0.10, volatility=0.20,
            num_simulations=1000, seed=42
        ))
        assert result["method"] == "monte_carlo"
        assert result["var_amount"] > 0

    def test_invalid_method(self):
        from rag.tools.financial_modeling import compute_var
        db = MagicMock()
        result = json.loads(compute_var(
            db, portfolio_value=1_000_000, method="invalid"
        ))
        assert "error" in result

    def test_parametric_missing_inputs_error(self):
        from rag.tools.financial_modeling import compute_var
        db = MagicMock()
        result = json.loads(compute_var(
            db, portfolio_value=1_000_000, method="parametric"
        ))
        assert "error" in result

    def test_unsupported_confidence_level(self):
        from rag.tools.financial_modeling import compute_var
        db = MagicMock()
        result = json.loads(compute_var(
            db, portfolio_value=1_000_000, method="parametric",
            expected_return=0.10, volatility=0.20, confidence_level=0.80
        ))
        assert "error" in result


class TestCVaR:
    def test_historical_cvar(self):
        """Historical CVaR from return series."""
        from rag.tools.financial_modeling import compute_cvar
        db = MagicMock()
        returns = [-0.05, -0.04, -0.03, -0.02, -0.01] + [0.01] * 95
        result = json.loads(compute_cvar(
            db, portfolio_value=1_000_000, confidence_level=0.95,
            returns=returns
        ))
        assert result["method"] == "historical"
        assert result["cvar_amount"] > 0
        # CVaR >= VaR
        assert result["cvar_amount"] >= result["var_amount"] - 1e-2

    def test_parametric_cvar(self):
        """Parametric CVaR."""
        from rag.tools.financial_modeling import compute_cvar
        db = MagicMock()
        result = json.loads(compute_cvar(
            db, portfolio_value=1_000_000, confidence_level=0.95,
            expected_return=0.10, volatility=0.20
        ))
        assert result["method"] == "parametric"
        assert result["cvar_amount"] > 0
        # CVaR >= VaR for normal distribution
        assert result["cvar_amount"] >= result["var_amount"] - 1e-2

    def test_cvar_gte_var(self):
        """CVaR should always be >= VaR."""
        from rag.tools.financial_modeling import compute_cvar
        db = MagicMock()
        result = json.loads(compute_cvar(
            db, portfolio_value=1_000_000, confidence_level=0.95,
            expected_return=0.05, volatility=0.30
        ))
        assert result["cvar_pct"] >= result["var_pct"] - 1e-4

    def test_missing_inputs_error(self):
        from rag.tools.financial_modeling import compute_cvar
        db = MagicMock()
        result = json.loads(compute_cvar(db, portfolio_value=1_000_000))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_cvar
        db = MagicMock()
        result = json.loads(compute_cvar(
            db, portfolio_value=1_000_000, expected_return=0.10, volatility=0.20
        ))
        assert result["model_type"] == "cvar"


class TestMonteCarlo:
    def test_basic_gbm(self):
        """GBM simulation with seed produces consistent results."""
        from rag.tools.financial_modeling import run_monte_carlo
        db = MagicMock()
        result = json.loads(run_monte_carlo(
            db, initial_value=1000.0, expected_return=0.10, volatility=0.20,
            horizon_years=1.0, num_simulations=5000, seed=42
        ))
        assert result["model_type"] == "monte_carlo"
        assert result["terminal_stats"]["mean"] > 0
        assert result["terminal_stats"]["min"] > 0
        # With positive drift, mean should be above initial value
        assert result["terminal_stats"]["mean"] > 1000.0 * 0.9

    def test_zero_volatility_deterministic(self):
        """Zero volatility → all paths should be nearly identical."""
        from rag.tools.financial_modeling import run_monte_carlo
        db = MagicMock()
        result = json.loads(run_monte_carlo(
            db, initial_value=1000.0, expected_return=0.10, volatility=0.0,
            horizon_years=1.0, num_simulations=100, num_steps=252, seed=42
        ))
        # With zero vol, S = S0 * exp(mu * T) = 1000 * exp(0.10) ≈ 1105.17
        expected = 1000.0 * 2.718281828 ** 0.10
        assert result["terminal_stats"]["mean"] == pytest.approx(expected, rel=1e-3)
        assert result["terminal_stats"]["std"] == pytest.approx(0.0, abs=1e-2)
        assert result["probability_of_loss"] == pytest.approx(0.0, abs=1e-4)

    def test_negative_initial_value_error(self):
        from rag.tools.financial_modeling import run_monte_carlo
        db = MagicMock()
        result = json.loads(run_monte_carlo(
            db, initial_value=-100.0, expected_return=0.10, volatility=0.20
        ))
        assert "error" in result

    def test_percentile_ordering(self):
        """Percentile paths should be ordered: p5 < p25 < p50 < p75 < p95."""
        from rag.tools.financial_modeling import run_monte_carlo
        db = MagicMock()
        result = json.loads(run_monte_carlo(
            db, initial_value=1000.0, expected_return=0.10, volatility=0.20,
            num_simulations=5000, seed=42
        ))
        pp = result["percentile_paths"]
        assert pp["p5"] <= pp["p25"] <= pp["p50"] <= pp["p75"] <= pp["p95"]


class TestOptimizePortfolio:
    def test_min_variance(self):
        """Min-variance objective should return valid weights."""
        from rag.tools.financial_modeling import optimize_portfolio
        db = MagicMock()
        assets = [
            {"name": "A", "expected_return": 0.12, "volatility": 0.20},
            {"name": "B", "expected_return": 0.08, "volatility": 0.10},
        ]
        corr = [[1.0, 0.3], [0.3, 1.0]]
        result = json.loads(optimize_portfolio(
            db, assets, corr, objective="min_variance",
            num_portfolios=5000, seed=42
        ))
        assert result["model_type"] == "portfolio_optimization"
        weights = [w["weight"] for w in result["optimal_weights"]]
        assert sum(weights) == pytest.approx(1.0, abs=0.01)
        # Lower vol asset should get more weight for min variance
        assert weights[1] > weights[0]

    def test_max_sharpe(self):
        """Max Sharpe with uncorrelated assets."""
        from rag.tools.financial_modeling import optimize_portfolio
        db = MagicMock()
        assets = [
            {"name": "A", "expected_return": 0.15, "volatility": 0.25},
            {"name": "B", "expected_return": 0.05, "volatility": 0.10},
        ]
        corr = [[1.0, 0.0], [0.0, 1.0]]
        result = json.loads(optimize_portfolio(
            db, assets, corr, objective="max_sharpe",
            num_portfolios=10000, seed=42
        ))
        assert result["sharpe_ratio"] > 0

    def test_unknown_objective_error(self):
        from rag.tools.financial_modeling import optimize_portfolio
        db = MagicMock()
        assets = [{"name": "A", "expected_return": 0.10, "volatility": 0.20}]
        corr = [[1.0]]
        result = json.loads(optimize_portfolio(
            db, assets, corr, objective="unknown"
        ))
        assert "error" in result

    def test_target_return_missing_error(self):
        from rag.tools.financial_modeling import optimize_portfolio
        db = MagicMock()
        assets = [{"name": "A", "expected_return": 0.10, "volatility": 0.20}]
        corr = [[1.0]]
        result = json.loads(optimize_portfolio(
            db, assets, corr, objective="target_return"
        ))
        assert "error" in result


class TestEfficientFrontier:
    def test_frontier_point_count(self):
        """Frontier should produce roughly num_points entries."""
        from rag.tools.financial_modeling import compute_efficient_frontier
        db = MagicMock()
        assets = [
            {"name": "A", "expected_return": 0.15, "volatility": 0.25},
            {"name": "B", "expected_return": 0.05, "volatility": 0.10},
        ]
        corr = [[1.0, 0.3], [0.3, 1.0]]
        result = json.loads(compute_efficient_frontier(
            db, assets, corr, num_points=20
        ))
        assert result["model_type"] == "efficient_frontier"
        assert result["num_points"] > 0
        assert result["min_variance_portfolio"] is not None
        assert result["tangent_portfolio"] is not None

    def test_tangent_portfolio_has_sharpe(self):
        from rag.tools.financial_modeling import compute_efficient_frontier
        db = MagicMock()
        assets = [
            {"name": "A", "expected_return": 0.12, "volatility": 0.20},
            {"name": "B", "expected_return": 0.06, "volatility": 0.10},
        ]
        corr = [[1.0, 0.0], [0.0, 1.0]]
        result = json.loads(compute_efficient_frontier(
            db, assets, corr, num_points=10
        ))
        assert "sharpe_ratio" in result["tangent_portfolio"]

    def test_empty_assets_error(self):
        from rag.tools.financial_modeling import compute_efficient_frontier
        db = MagicMock()
        result = json.loads(compute_efficient_frontier(db, [], []))
        assert "error" in result


class TestRiskParity:
    def test_equal_vol_equal_weights(self):
        """Equal volatility assets with identity correlation → equal weights."""
        from rag.tools.financial_modeling import compute_risk_parity
        db = MagicMock()
        assets = [
            {"name": "A", "volatility": 0.20},
            {"name": "B", "volatility": 0.20},
        ]
        corr = [[1.0, 0.0], [0.0, 1.0]]
        result = json.loads(compute_risk_parity(db, assets, corr))
        weights = [w["weight"] for w in result["weights"]]
        assert weights[0] == pytest.approx(weights[1], abs=0.02)
        assert sum(weights) == pytest.approx(1.0, abs=0.01)

    def test_higher_vol_lower_weight(self):
        """Higher volatility asset should get lower weight."""
        from rag.tools.financial_modeling import compute_risk_parity
        db = MagicMock()
        assets = [
            {"name": "High", "volatility": 0.40},
            {"name": "Low", "volatility": 0.10},
        ]
        corr = [[1.0, 0.0], [0.0, 1.0]]
        result = json.loads(compute_risk_parity(db, assets, corr))
        weights = {w["name"]: w["weight"] for w in result["weights"]}
        assert weights["Low"] > weights["High"]

    def test_risk_contributions_approximately_equal(self):
        """Risk parity: risk contributions should be approximately equal."""
        from rag.tools.financial_modeling import compute_risk_parity
        db = MagicMock()
        assets = [
            {"name": "A", "volatility": 0.20},
            {"name": "B", "volatility": 0.15},
            {"name": "C", "volatility": 0.30},
        ]
        corr = [[1.0, 0.2, 0.1], [0.2, 1.0, 0.3], [0.1, 0.3, 1.0]]
        result = json.loads(compute_risk_parity(db, assets, corr))
        rcs = [rc["risk_contribution"] for rc in result["risk_contributions"]]
        # All risk contributions should be roughly equal
        mean_rc = sum(rcs) / len(rcs)
        for rc in rcs:
            assert rc == pytest.approx(mean_rc, rel=0.15)

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_risk_parity
        db = MagicMock()
        assets = [{"name": "A", "volatility": 0.20}]
        corr = [[1.0]]
        result = json.loads(compute_risk_parity(db, assets, corr))
        assert result["model_type"] == "risk_parity"

    def test_zero_vol_error(self):
        from rag.tools.financial_modeling import compute_risk_parity
        db = MagicMock()
        assets = [{"name": "A", "volatility": 0.0}]
        corr = [[1.0]]
        result = json.loads(compute_risk_parity(db, assets, corr))
        assert "error" in result


class TestFactorModel:
    def test_single_factor_beta_recovery(self):
        """Single factor regression should recover known beta."""
        from rag.tools.financial_modeling import compute_factor_model
        db = MagicMock()
        # Asset = 0.001 + 1.5 * market
        market = [0.01, 0.02, -0.01, 0.03, -0.02, 0.015, -0.005, 0.025, 0.01, -0.015]
        asset = [0.001 + 1.5 * m for m in market]
        result = json.loads(compute_factor_model(db, asset, market))
        assert result["factors"] == "single"
        assert result["beta_market"] == pytest.approx(1.5, abs=0.01)
        assert result["alpha"] == pytest.approx(0.001, abs=0.01)
        assert result["r_squared"] > 0.99

    def test_unequal_length_error(self):
        from rag.tools.financial_modeling import compute_factor_model
        db = MagicMock()
        result = json.loads(compute_factor_model(
            db, asset_returns=[0.01, 0.02], market_returns=[0.01]
        ))
        assert "error" in result

    def test_three_factor(self):
        """Three-factor model should include SMB and HML betas."""
        from rag.tools.financial_modeling import compute_factor_model
        db = MagicMock()
        n = 20
        market = [0.01 * (i % 5 - 2) for i in range(n)]
        smb = [0.005 * (i % 3 - 1) for i in range(n)]
        hml = [0.003 * (i % 4 - 2) for i in range(n)]
        # asset = 0.002 + 1.2*market + 0.5*smb - 0.3*hml
        asset = [0.002 + 1.2 * market[i] + 0.5 * smb[i] - 0.3 * hml[i] for i in range(n)]
        result = json.loads(compute_factor_model(
            db, asset, market, smb_returns=smb, hml_returns=hml
        ))
        assert result["factors"] == "three_factor"
        assert "beta_smb" in result
        assert "beta_hml" in result
        assert result["beta_market"] == pytest.approx(1.2, abs=0.05)

    def test_too_few_observations_error(self):
        from rag.tools.financial_modeling import compute_factor_model
        db = MagicMock()
        result = json.loads(compute_factor_model(
            db, asset_returns=[0.01, 0.02], market_returns=[0.01, 0.02]
        ))
        assert "error" in result

    def test_model_type(self):
        from rag.tools.financial_modeling import compute_factor_model
        db = MagicMock()
        market = [0.01, 0.02, -0.01, 0.03]
        asset = [0.02, 0.03, 0.0, 0.04]
        result = json.loads(compute_factor_model(db, asset, market))
        assert result["model_type"] == "factor_model"


class TestStressTest:
    def test_basic_shock_pnl(self):
        """Simple stress test with known shock."""
        from rag.tools.financial_modeling import run_stress_test
        db = MagicMock()
        portfolio = [
            {"asset": "Stock", "weight": 1.0, "current_value": 100000},
        ]
        scenarios = [
            {"name": "crash", "shocks": {"Stock": -0.30}},
        ]
        result = json.loads(run_stress_test(db, portfolio, scenarios))
        assert result["model_type"] == "stress_test"
        sr = result["scenario_results"][0]
        assert sr["portfolio_pnl"] == pytest.approx(-30000.0, abs=1)
        assert sr["portfolio_pct_change"] == pytest.approx(-0.30, abs=0.01)

    def test_missing_asset_defaults_to_zero(self):
        """Asset not in shocks should default to 0% change."""
        from rag.tools.financial_modeling import run_stress_test
        db = MagicMock()
        portfolio = [
            {"asset": "Stock", "weight": 0.5, "current_value": 100000},
            {"asset": "Bond", "weight": 0.5, "current_value": 100000},
        ]
        scenarios = [
            {"name": "stock_crash", "shocks": {"Stock": -0.20}},
        ]
        result = json.loads(run_stress_test(db, portfolio, scenarios))
        sr = result["scenario_results"][0]
        # Stock PnL: 100000*0.5*(-0.20) = -10000, Bond PnL: 0
        assert sr["portfolio_pnl"] == pytest.approx(-10000.0, abs=1)

    def test_worst_best_asset(self):
        """Worst and best asset identification."""
        from rag.tools.financial_modeling import run_stress_test
        db = MagicMock()
        portfolio = [
            {"asset": "Stock", "weight": 0.5, "current_value": 100000},
            {"asset": "Gold", "weight": 0.5, "current_value": 100000},
        ]
        scenarios = [
            {"name": "crash", "shocks": {"Stock": -0.30, "Gold": 0.10}},
        ]
        result = json.loads(run_stress_test(db, portfolio, scenarios))
        sr = result["scenario_results"][0]
        assert sr["worst_asset"] == "Stock"
        assert sr["best_asset"] == "Gold"

    def test_empty_portfolio_error(self):
        from rag.tools.financial_modeling import run_stress_test
        db = MagicMock()
        result = json.loads(run_stress_test(db, [], [{"name": "test", "shocks": {}}]))
        assert "error" in result

    def test_multiple_scenarios(self):
        from rag.tools.financial_modeling import run_stress_test
        db = MagicMock()
        portfolio = [
            {"asset": "Stock", "weight": 1.0, "current_value": 100000},
        ]
        scenarios = [
            {"name": "mild", "shocks": {"Stock": -0.05}},
            {"name": "severe", "shocks": {"Stock": -0.30}},
        ]
        result = json.loads(run_stress_test(db, portfolio, scenarios))
        assert len(result["scenario_results"]) == 2
        assert abs(result["scenario_results"][0]["portfolio_pnl"]) < abs(result["scenario_results"][1]["portfolio_pnl"])


class TestBSM:
    """Tests for price_option_bsm."""

    def test_call_price(self):
        """ATM call: S=100, K=100, T=1, r=0.05, σ=0.20 → C ≈ 10.45."""
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        result = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.20, "call"))
        assert result["model_type"] == "bsm"
        assert result["price"] == pytest.approx(10.45, abs=0.5)
        assert result["d1"] is not None
        assert result["d2"] is not None

    def test_put_price(self):
        """ATM put: S=100, K=100, T=1, r=0.05, σ=0.20 → P ≈ 5.57."""
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        result = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.20, "put"))
        assert result["model_type"] == "bsm"
        assert result["price"] == pytest.approx(5.57, abs=0.5)

    def test_deep_itm_call(self):
        """Deep ITM call: S=200, K=100, T=0.01 → price ≈ 100."""
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        result = json.loads(price_option_bsm(db, 200, 100, 0.01, 0.05, 0.20, "call"))
        assert result["price"] == pytest.approx(100.0, abs=1.0)

    def test_zero_time(self):
        """Expired ATM option → price = 0."""
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        result = json.loads(price_option_bsm(db, 100, 100, 0.0, 0.05, 0.20, "call"))
        assert result["price"] == 0.0
        assert result["intrinsic_value"] == 0.0
        assert result["time_value"] == 0.0

    def test_zero_volatility_error(self):
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        result = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.0))
        assert "error" in result

    def test_invalid_option_type(self):
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        result = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.20, "straddle"))
        assert "error" in result

    def test_put_call_symmetry(self):
        """BSM call - put ≈ S·e^(-qT) - K·e^(-rT) (put-call parity)."""
        from rag.tools.financial_modeling import price_option_bsm
        import math
        db = MagicMock()
        S, K, T, r, sigma, q = 100, 100, 1.0, 0.05, 0.20, 0.0
        call = json.loads(price_option_bsm(db, S, K, T, r, sigma, "call", q))
        put = json.loads(price_option_bsm(db, S, K, T, r, sigma, "put", q))
        lhs = call["price"] - put["price"]
        rhs = S * math.exp(-q * T) - K * math.exp(-r * T)
        assert lhs == pytest.approx(rhs, abs=0.01)

    def test_with_dividend_yield(self):
        """Dividend yield lowers call price."""
        from rag.tools.financial_modeling import price_option_bsm
        db = MagicMock()
        call_no_div = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.20, "call", 0.0))
        call_div = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.20, "call", 0.03))
        assert call_div["price"] < call_no_div["price"]


class TestBinomial:
    """Tests for price_option_binomial."""

    def test_european_converges_to_bsm(self):
        """200-step European binomial converges to BSM within ±0.3."""
        from rag.tools.financial_modeling import price_option_bsm, price_option_binomial
        db = MagicMock()
        bsm = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.20, "call"))
        binom = json.loads(price_option_binomial(db, 100, 100, 1.0, 0.05, 0.20, "call", 0.0, 200, "european"))
        assert binom["model_type"] == "binomial_tree"
        assert binom["price"] == pytest.approx(bsm["price"], abs=0.3)

    def test_american_put_geq_european(self):
        """American put >= European put (early exercise premium)."""
        from rag.tools.financial_modeling import price_option_binomial
        db = MagicMock()
        euro = json.loads(price_option_binomial(db, 100, 100, 1.0, 0.05, 0.20, "put", 0.0, 100, "european"))
        amer = json.loads(price_option_binomial(db, 100, 100, 1.0, 0.05, 0.20, "put", 0.0, 100, "american"))
        assert amer["price"] >= euro["price"]

    def test_expired_option(self):
        """Expired option returns intrinsic value."""
        from rag.tools.financial_modeling import price_option_binomial
        db = MagicMock()
        result = json.loads(price_option_binomial(db, 110, 100, 0.0, 0.05, 0.20, "call"))
        assert result["price"] == pytest.approx(10.0, abs=0.01)

    def test_crr_parameters(self):
        """Verify u, d, p are returned."""
        from rag.tools.financial_modeling import price_option_binomial
        db = MagicMock()
        result = json.loads(price_option_binomial(db, 100, 100, 1.0, 0.05, 0.20, "call", 0.0, 50))
        assert result["u"] is not None
        assert result["d"] is not None
        assert result["p"] is not None
        assert result["u"] > 1.0
        assert result["d"] < 1.0
        assert 0.0 < result["p"] < 1.0

    def test_invalid_exercise(self):
        from rag.tools.financial_modeling import price_option_binomial
        db = MagicMock()
        result = json.loads(price_option_binomial(db, 100, 100, 1.0, 0.05, 0.20, "call", 0.0, 100, "bermudan"))
        assert "error" in result


class TestGreeks:
    """Tests for compute_greeks."""

    def test_atm_call_delta(self):
        """ATM call delta ≈ 0.5–0.7."""
        from rag.tools.financial_modeling import compute_greeks
        db = MagicMock()
        result = json.loads(compute_greeks(db, 100, 100, 1.0, 0.05, 0.20, "call"))
        assert result["model_type"] == "greeks"
        assert 0.5 <= result["delta"] <= 0.7

    def test_put_delta_negative(self):
        """Put delta is negative."""
        from rag.tools.financial_modeling import compute_greeks
        db = MagicMock()
        result = json.loads(compute_greeks(db, 100, 100, 1.0, 0.05, 0.20, "put"))
        assert result["delta"] < 0

    def test_gamma_positive(self):
        """Gamma is always positive."""
        from rag.tools.financial_modeling import compute_greeks
        db = MagicMock()
        result = json.loads(compute_greeks(db, 100, 100, 1.0, 0.05, 0.20, "call"))
        assert result["gamma"] > 0

    def test_vega_positive(self):
        """Vega is always positive (both call and put)."""
        from rag.tools.financial_modeling import compute_greeks
        db = MagicMock()
        call = json.loads(compute_greeks(db, 100, 100, 1.0, 0.05, 0.20, "call"))
        put = json.loads(compute_greeks(db, 100, 100, 1.0, 0.05, 0.20, "put"))
        assert call["vega"] > 0
        assert put["vega"] > 0

    def test_theta_negative(self):
        """Call theta is negative (time decay)."""
        from rag.tools.financial_modeling import compute_greeks
        db = MagicMock()
        result = json.loads(compute_greeks(db, 100, 100, 1.0, 0.05, 0.20, "call"))
        assert result["theta"] < 0

    def test_zero_time_error(self):
        from rag.tools.financial_modeling import compute_greeks
        db = MagicMock()
        result = json.loads(compute_greeks(db, 100, 100, 0.0, 0.05, 0.20, "call"))
        assert "error" in result

    def test_call_put_gamma_equal(self):
        """Call and put gamma should be the same."""
        from rag.tools.financial_modeling import compute_greeks
        db = MagicMock()
        call = json.loads(compute_greeks(db, 100, 100, 1.0, 0.05, 0.20, "call"))
        put = json.loads(compute_greeks(db, 100, 100, 1.0, 0.05, 0.20, "put"))
        assert call["gamma"] == pytest.approx(put["gamma"], abs=0.0001)


class TestImpliedVol:
    """Tests for compute_implied_volatility."""

    def test_round_trip(self):
        """Price with vol=0.25, then recover → ≈ 0.25."""
        from rag.tools.financial_modeling import price_option_bsm, compute_implied_volatility
        db = MagicMock()
        bsm = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.25, "call"))
        iv = json.loads(compute_implied_volatility(db, bsm["price"], 100, 100, 1.0, 0.05, "call"))
        assert iv["model_type"] == "implied_volatility"
        assert iv["implied_volatility"] == pytest.approx(0.25, abs=0.005)

    def test_convergence_status(self):
        """Should converge for normal inputs."""
        from rag.tools.financial_modeling import price_option_bsm, compute_implied_volatility
        db = MagicMock()
        bsm = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.30, "call"))
        iv = json.loads(compute_implied_volatility(db, bsm["price"], 100, 100, 1.0, 0.05, "call"))
        assert iv["convergence"] == "converged"

    def test_put_round_trip(self):
        """Round-trip for a put option."""
        from rag.tools.financial_modeling import price_option_bsm, compute_implied_volatility
        db = MagicMock()
        bsm = json.loads(price_option_bsm(db, 100, 110, 0.5, 0.03, 0.35, "put"))
        iv = json.loads(compute_implied_volatility(db, bsm["price"], 100, 110, 0.5, 0.03, "put"))
        assert iv["implied_volatility"] == pytest.approx(0.35, abs=0.005)

    def test_invalid_market_price(self):
        from rag.tools.financial_modeling import compute_implied_volatility
        db = MagicMock()
        result = json.loads(compute_implied_volatility(db, -1.0, 100, 100, 1.0, 0.05))
        assert "error" in result


class TestPutCallParity:
    """Tests for check_put_call_parity."""

    def test_parity_holds(self):
        """BSM-consistent prices → deviation < 1.0."""
        from rag.tools.financial_modeling import price_option_bsm, check_put_call_parity
        db = MagicMock()
        call = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.20, "call"))
        put = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.20, "put"))
        result = json.loads(check_put_call_parity(db, call["price"], put["price"], 100, 100, 1.0, 0.05))
        assert result["model_type"] == "put_call_parity"
        assert abs(result["deviation"]) < 1.0
        assert result["arbitrage_opportunity"] is False

    def test_arbitrage_detected(self):
        """Mispriced call → arbitrage detected."""
        from rag.tools.financial_modeling import price_option_bsm, check_put_call_parity
        db = MagicMock()
        put = json.loads(price_option_bsm(db, 100, 100, 1.0, 0.05, 0.20, "put"))
        # Overprice the call by 5
        result = json.loads(check_put_call_parity(db, 20.0, put["price"], 100, 100, 1.0, 0.05))
        assert result["arbitrage_opportunity"] is True
        assert "strategy" in result
        assert len(result["strategy"]) > 10  # Not empty

    def test_negative_time_error(self):
        from rag.tools.financial_modeling import check_put_call_parity
        db = MagicMock()
        result = json.loads(check_put_call_parity(db, 10, 5, 100, 100, -1.0, 0.05))
        assert "error" in result


class TestOptionStrategy:
    """Tests for build_option_strategy."""

    def test_long_straddle(self):
        """Long straddle: max_loss ≈ total premium, 2 breakevens."""
        from rag.tools.financial_modeling import build_option_strategy
        db = MagicMock()
        legs = [
            {"type": "call", "position": "long", "strike": 100, "premium": 5},
            {"type": "put", "position": "long", "strike": 100, "premium": 5},
        ]
        result = json.loads(build_option_strategy(db, legs, 100, 70, 130, 100))
        assert result["model_type"] == "option_strategy"
        # Max loss is the total premium paid (≈ -10, may be slightly less due to discrete grid)
        assert result["max_loss"] == pytest.approx(-10.0, abs=1.0)
        # Should have 2 breakevens
        assert len(result["breakevens"]) == 2

    def test_covered_call(self):
        """Covered call: max_profit > 0."""
        from rag.tools.financial_modeling import build_option_strategy
        db = MagicMock()
        # Stock: premium=0 (cost captured in strike), short call premium=5 (received)
        legs = [
            {"type": "stock", "position": "long", "strike": 100, "premium": 0},
            {"type": "call", "position": "short", "strike": 110, "premium": 5},
        ]
        result = json.loads(build_option_strategy(db, legs, 100))
        assert result["max_profit"] > 0

    def test_empty_legs_error(self):
        from rag.tools.financial_modeling import build_option_strategy
        db = MagicMock()
        result = json.loads(build_option_strategy(db, [], 100))
        assert "error" in result

    def test_custom_spot_range(self):
        from rag.tools.financial_modeling import build_option_strategy
        db = MagicMock()
        legs = [{"type": "call", "position": "long", "strike": 100, "premium": 5}]
        result = json.loads(build_option_strategy(db, legs, 100, 80, 120, 10))
        assert len(result["payoff_table"]) == 10
        assert result["payoff_table"][0]["spot"] == pytest.approx(80.0, abs=0.01)
        assert result["payoff_table"][-1]["spot"] == pytest.approx(120.0, abs=0.01)

    def test_default_spot_range(self):
        """When spot_max <= spot_min, defaults to ±30%."""
        from rag.tools.financial_modeling import build_option_strategy
        db = MagicMock()
        legs = [{"type": "call", "position": "long", "strike": 100, "premium": 5}]
        result = json.loads(build_option_strategy(db, legs, 100, 0, 0, 50))
        assert result["payoff_table"][0]["spot"] == pytest.approx(70.0, abs=0.5)
        assert result["payoff_table"][-1]["spot"] == pytest.approx(130.0, abs=0.5)


# ── Phase 9: Iranian Market & Real Estate ────────────────────────────────────


class TestRealEstateNOI:
    """Tests for compute_real_estate_noi."""

    def test_basic_noi(self):
        """EGI and NOI are computed correctly."""
        from rag.tools.financial_modeling import compute_real_estate_noi
        db = MagicMock()
        result = json.loads(compute_real_estate_noi(
            db, gross_rental_income=120000, vacancy_rate=0.05,
            operating_expenses=30000,
        ))
        assert result["model_type"] == "real_estate_noi"
        # EGI = 120000 * 0.95 = 114000
        assert result["effective_gross_income"] == pytest.approx(114000, rel=1e-3)
        # NOI = 114000 - 30000 = 84000
        assert result["noi"] == pytest.approx(84000, rel=1e-3)

    def test_cap_rate_from_property_value(self):
        """Cap rate = NOI / property_value when property_value given."""
        from rag.tools.financial_modeling import compute_real_estate_noi
        db = MagicMock()
        result = json.loads(compute_real_estate_noi(
            db, gross_rental_income=100000, vacancy_rate=0.10,
            operating_expenses=20000, property_value=1000000,
        ))
        # EGI = 90000, NOI = 70000
        assert result["cap_rate"] == pytest.approx(70000 / 1000000, rel=1e-3)
        assert "grm" in result
        assert result["grm"] == pytest.approx(1000000 / 100000, rel=1e-3)

    def test_implied_value_from_cap_rate(self):
        """When cap_rate given but no property_value, compute implied value."""
        from rag.tools.financial_modeling import compute_real_estate_noi
        db = MagicMock()
        result = json.loads(compute_real_estate_noi(
            db, gross_rental_income=100000, vacancy_rate=0.10,
            operating_expenses=20000, cap_rate=0.07,
        ))
        # NOI = 70000; implied = 70000 / 0.07 = 1000000
        assert result["implied_value"] == pytest.approx(1000000, rel=1e-3)

    def test_dscr_with_debt(self):
        """DSCR and cash_after_debt with debt_service provided."""
        from rag.tools.financial_modeling import compute_real_estate_noi
        db = MagicMock()
        result = json.loads(compute_real_estate_noi(
            db, gross_rental_income=100000, vacancy_rate=0.0,
            operating_expenses=20000, debt_service=50000,
            equity_invested=200000,
        ))
        # NOI = 80000, DSCR = 80000/50000 = 1.6
        assert result["dscr"] == pytest.approx(1.6, rel=1e-3)
        assert result["cash_after_debt"] == pytest.approx(30000, rel=1e-3)
        # cash-on-cash = 30000 / 200000 = 0.15
        assert result["cash_on_cash_return"] == pytest.approx(0.15, rel=1e-3)

    def test_error_negative_income(self):
        from rag.tools.financial_modeling import compute_real_estate_noi
        db = MagicMock()
        result = json.loads(compute_real_estate_noi(
            db, gross_rental_income=-100, vacancy_rate=0.05,
            operating_expenses=10,
        ))
        assert "error" in result


class TestDevelopmentProforma:
    """Tests for build_development_proforma."""

    def test_basic_profit_and_margin(self):
        """Gross profit and margin are positive for a viable project."""
        from rag.tools.financial_modeling import build_development_proforma
        db = MagicMock()
        result = json.loads(build_development_proforma(
            db, land_cost=5_000_000, construction_cost_per_sqm=10_000,
            total_sqm=1000, sellable_pct=0.85,
            sale_price_per_sqm=25_000, construction_months=18,
        ))
        assert result["model_type"] == "development_proforma"
        assert result["gross_profit"] > 0
        assert 0 < result["margin"] < 1
        assert result["equity_multiple"] > 1

    def test_breakeven_below_sale_price(self):
        """Breakeven price should be below sale price for a profitable project."""
        from rag.tools.financial_modeling import build_development_proforma
        db = MagicMock()
        result = json.loads(build_development_proforma(
            db, land_cost=2_000_000, construction_cost_per_sqm=8_000,
            total_sqm=500, sellable_pct=0.90,
            sale_price_per_sqm=20_000, construction_months=12,
            absorption_months=4,
        ))
        assert result["breakeven_price"] < 20_000

    def test_irr_positive(self):
        """IRR should be positive for a viable project."""
        from rag.tools.financial_modeling import build_development_proforma
        db = MagicMock()
        result = json.loads(build_development_proforma(
            db, land_cost=3_000_000, construction_cost_per_sqm=9_000,
            total_sqm=800, sellable_pct=0.85,
            sale_price_per_sqm=22_000, construction_months=24,
        ))
        assert result["irr"] > 0


class TestSukuk:
    """Tests for build_sukuk_model."""

    def test_ijara_cash_flows(self):
        """Ijara: periodic rentals + face at maturity."""
        from rag.tools.financial_modeling import build_sukuk_model
        db = MagicMock()
        result = json.loads(build_sukuk_model(
            db, face_value=1000, profit_rate=0.08, periods=5,
            sukuk_type="ijara",
        ))
        assert result["model_type"] == "sukuk"
        assert result["sukuk_type"] == "ijara"
        # First 4 periods: 80 each, last: 80 + 1000 = 1080
        assert len(result["cash_flows"]) == 5
        assert result["cash_flows"][0] == pytest.approx(80, rel=1e-3)
        assert result["cash_flows"][-1] == pytest.approx(1080, rel=1e-3)
        assert result["total_payments"] == pytest.approx(4 * 80 + 1080, rel=1e-3)

    def test_murabaha_equal_installments(self):
        """Murabaha: equal installments summing to cost + markup."""
        from rag.tools.financial_modeling import build_sukuk_model
        db = MagicMock()
        result = json.loads(build_sukuk_model(
            db, face_value=1000, profit_rate=0.10, periods=4,
            sukuk_type="murabaha",
        ))
        assert result["sukuk_type"] == "murabaha"
        # Total = 1000 + 100 = 1100, installment = 275
        assert all(cf == pytest.approx(275, rel=1e-3) for cf in result["cash_flows"])
        assert result["total_payments"] == pytest.approx(1100, rel=1e-3)

    def test_musharaka_declining(self):
        """Musharaka: declining balance payments."""
        from rag.tools.financial_modeling import build_sukuk_model
        db = MagicMock()
        result = json.loads(build_sukuk_model(
            db, face_value=1000, profit_rate=0.10, periods=4,
            sukuk_type="musharaka",
        ))
        assert result["sukuk_type"] == "musharaka"
        # Period 1: buyback=250, profit=1000*0.10=100, total=350
        assert result["cash_flows"][0] == pytest.approx(350, rel=1e-3)
        # Period 2: buyback=250, remaining=750, profit=75, total=325
        assert result["cash_flows"][1] == pytest.approx(325, rel=1e-3)
        # Payments should decrease
        assert result["cash_flows"][0] > result["cash_flows"][-1]

    def test_pricing_at_higher_yield(self):
        """When market_yield > profit_rate, price should be below face value (discount)."""
        from rag.tools.financial_modeling import build_sukuk_model
        db = MagicMock()
        result = json.loads(build_sukuk_model(
            db, face_value=1000, profit_rate=0.06, periods=5,
            sukuk_type="ijara", market_yield=0.08,
        ))
        assert "price" in result
        assert result["price"] < 1000  # discount
        assert result["premium_discount"] < 0

    def test_duration_present(self):
        """Macaulay duration should be present."""
        from rag.tools.financial_modeling import build_sukuk_model
        db = MagicMock()
        result = json.loads(build_sukuk_model(
            db, face_value=1000, profit_rate=0.08, periods=5,
            sukuk_type="ijara",
        ))
        assert "macaulay_duration" in result
        assert result["macaulay_duration"] > 0
        # Duration should be less than periods for coupon-bearing instrument
        assert result["macaulay_duration"] < 5

    def test_error_invalid_type(self):
        from rag.tools.financial_modeling import build_sukuk_model
        db = MagicMock()
        result = json.loads(build_sukuk_model(
            db, face_value=1000, profit_rate=0.08, periods=5,
            sukuk_type="invalid",
        ))
        assert "error" in result


class TestMurabaha:
    """Tests for build_murabaha_schedule."""

    def test_basic_schedule(self):
        """Basic murabaha schedule without grace period."""
        from rag.tools.financial_modeling import build_murabaha_schedule
        db = MagicMock()
        result = json.loads(build_murabaha_schedule(
            db, cost_price=100000, markup_rate=0.20, installments=12,
        ))
        assert result["model_type"] == "murabaha_schedule"
        assert result["profit_amount"] == pytest.approx(20000, rel=1e-3)
        assert result["total_price"] == pytest.approx(120000, rel=1e-3)
        assert result["installment_amount"] == pytest.approx(10000, rel=1e-3)
        assert len(result["schedule"]) == 12
        # Last payment should bring remaining to 0
        assert result["schedule"][-1]["remaining"] == pytest.approx(0, abs=1)

    def test_with_grace_period(self):
        """Grace months should have payment=0."""
        from rag.tools.financial_modeling import build_murabaha_schedule
        db = MagicMock()
        result = json.loads(build_murabaha_schedule(
            db, cost_price=100000, markup_rate=0.15, installments=10,
            grace_months=3,
        ))
        assert result["grace_months"] == 3
        # Total schedule: 3 grace + 10 installment = 13
        assert len(result["schedule"]) == 13
        # First 3 have payment=0
        for i in range(3):
            assert result["schedule"][i]["payment"] == 0.0
        # Period 4 onward: regular payments
        assert result["schedule"][3]["payment"] > 0

    def test_error_zero_installments(self):
        from rag.tools.financial_modeling import build_murabaha_schedule
        db = MagicMock()
        result = json.loads(build_murabaha_schedule(
            db, cost_price=100000, markup_rate=0.10, installments=0,
        ))
        assert "error" in result


class TestIjara:
    """Tests for build_ijara_model."""

    def test_basic_yield(self):
        """Net yield should be positive for reasonable inputs."""
        from rag.tools.financial_modeling import build_ijara_model
        db = MagicMock()
        result = json.loads(build_ijara_model(
            db, asset_value=1000000, lease_term_months=60,
            monthly_rent=15000, transfer_price=100000,
        ))
        assert result["model_type"] == "ijara"
        # total_rental = 15000 * 60 = 900000
        assert result["total_rental"] == pytest.approx(900000, rel=1e-3)
        assert result["net_yield"] > 0
        assert result["effective_annual_rate"] > 0

    def test_schedule_length(self):
        """Schedule should have correct number of entries (capped at 12 in output)."""
        from rag.tools.financial_modeling import build_ijara_model
        db = MagicMock()
        result = json.loads(build_ijara_model(
            db, asset_value=500000, lease_term_months=24,
            monthly_rent=8000, transfer_price=50000,
        ))
        # schedule_length should be 24 (full term)
        assert result["schedule_length"] == 24
        # But schedule output is capped at 12 for brevity
        assert len(result["schedule"]) == 12
        # Last entry in full schedule (not shown) has transfer
        # First entries are rent-only
        assert result["schedule"][0]["type"] == "rent"

    def test_maintenance_cost(self):
        """Maintenance reduces net rental."""
        from rag.tools.financial_modeling import build_ijara_model
        db = MagicMock()
        result = json.loads(build_ijara_model(
            db, asset_value=1000000, lease_term_months=12,
            monthly_rent=10000, transfer_price=0,
            maintenance_pct=0.02,
        ))
        # maintenance = 1000000 * 0.02 * (12/12) = 20000
        assert result["maintenance"] == pytest.approx(20000, rel=1e-3)
        # net_rental = 120000 - 20000 = 100000
        assert result["net_rental"] == pytest.approx(100000, rel=1e-3)


class TestInflationAdjusted:
    """Tests for compute_inflation_adjusted_valuation."""

    def test_cpi_based_deflation(self):
        """Deflation using CPI values."""
        from rag.tools.financial_modeling import compute_inflation_adjusted_valuation
        db = MagicMock()
        result = json.loads(compute_inflation_adjusted_valuation(
            db,
            nominal_values=[
                {"year": 2020, "value": 100},
                {"year": 2021, "value": 130},
                {"year": 2022, "value": 180},
            ],
            base_year=2020,
            cpi_values=[
                {"year": 2020, "cpi": 100},
                {"year": 2021, "cpi": 140},
                {"year": 2022, "cpi": 200},
            ],
        ))
        assert result["model_type"] == "inflation_adjusted"
        vals = result["adjusted_values"]
        # 2020: 100 * (100/100) = 100
        assert vals[0]["real"] == pytest.approx(100, rel=1e-3)
        # 2021: 130 * (100/140) = 92.857
        assert vals[1]["real"] == pytest.approx(92.857, rel=1e-2)
        # 2022: 180 * (100/200) = 90
        assert vals[2]["real"] == pytest.approx(90, rel=1e-3)

    def test_inflation_rate_based(self):
        """Build CPI from inflation rates and deflate."""
        from rag.tools.financial_modeling import compute_inflation_adjusted_valuation
        db = MagicMock()
        result = json.loads(compute_inflation_adjusted_valuation(
            db,
            nominal_values=[
                {"year": 2020, "value": 100},
                {"year": 2021, "value": 150},
                {"year": 2022, "value": 200},
            ],
            base_year=2020,
            inflation_rates=[
                {"year": 2020, "rate": 0.30},
                {"year": 2021, "rate": 0.25},
            ],
        ))
        assert result["model_type"] == "inflation_adjusted"
        vals = result["adjusted_values"]
        # Base year real = nominal
        assert vals[0]["real"] == pytest.approx(100, rel=1e-3)
        # 2021 CPI = 100 * 1.30 = 130; real = 150 * (100/130) ≈ 115.38
        assert vals[1]["real"] == pytest.approx(115.38, rel=1e-1)

    def test_cagr_computation(self):
        """Nominal and real CAGR should be computed."""
        from rag.tools.financial_modeling import compute_inflation_adjusted_valuation
        db = MagicMock()
        result = json.loads(compute_inflation_adjusted_valuation(
            db,
            nominal_values=[
                {"year": 2020, "value": 100},
                {"year": 2023, "value": 200},
            ],
            base_year=2020,
            cpi_values=[
                {"year": 2020, "cpi": 100},
                {"year": 2023, "cpi": 180},
            ],
        ))
        assert result["nominal_cagr"] is not None
        assert result["real_cagr"] is not None
        # Nominal CAGR: (200/100)^(1/3) - 1 ≈ 0.2599
        assert result["nominal_cagr"] == pytest.approx(0.2599, rel=1e-2)
        # Real values: 100, 200*(100/180)=111.11
        # Real CAGR: (111.11/100)^(1/3) - 1 ≈ 0.0357
        assert result["real_cagr"] == pytest.approx(0.0357, rel=5e-2)
        # Inflation impact should be significant
        assert result["inflation_impact_pct"] is not None
        assert result["inflation_impact_pct"] > 0.5

    def test_error_no_inflation_data(self):
        from rag.tools.financial_modeling import compute_inflation_adjusted_valuation
        db = MagicMock()
        result = json.loads(compute_inflation_adjusted_valuation(
            db,
            nominal_values=[{"year": 2020, "value": 100}],
            base_year=2020,
        ))
        assert "error" in result


class TestTehranHousing:
    """Tests for build_tehran_housing_model."""

    def test_basic_yields(self):
        """Gross and net yields should be computed correctly."""
        from rag.tools.financial_modeling import build_tehran_housing_model
        db = MagicMock()
        result = json.loads(build_tehran_housing_model(
            db, area_sqm=100, price_per_sqm=80_000_000,
            monthly_rent_per_sqm=400_000,
            annual_appreciation_pct=0.25,
        ))
        assert result["model_type"] == "tehran_housing"
        # property_value = 100 * 80M = 8B
        assert result["property_value"] == pytest.approx(8_000_000_000, rel=1e-3)
        # annual_rent = 400K * 100 * 12 = 480M
        assert result["annual_rent"] == pytest.approx(480_000_000, rel=1e-3)
        # gross_yield = 480M / 8B = 0.06
        assert result["gross_yield"] == pytest.approx(0.06, rel=1e-3)
        # net_yield slightly less due to maintenance
        assert result["net_yield"] < result["gross_yield"]
        assert result["net_yield"] > 0
        # 5yr total return should be positive with 25% appreciation
        assert result["total_return_5yr"] > 0

    def test_with_mortgage(self):
        """Mortgage analysis: monthly_payment and total_interest computed."""
        from rag.tools.financial_modeling import build_tehran_housing_model
        db = MagicMock()
        result = json.loads(build_tehran_housing_model(
            db, area_sqm=80, price_per_sqm=60_000_000,
            monthly_rent_per_sqm=350_000,
            annual_appreciation_pct=0.20,
            mortgage_amount=2_000_000_000,
            mortgage_rate=0.18,
            mortgage_term_months=120,
        ))
        assert "monthly_payment" in result
        assert result["monthly_payment"] > 0
        assert "total_interest" in result
        assert result["total_interest"] > 0
        # Monthly payment should be larger than principal / months (due to interest)
        assert result["monthly_payment"] > 2_000_000_000 / 120

    def test_vacancy_reduces_rent(self):
        """Vacancy months should reduce annual rent."""
        from rag.tools.financial_modeling import build_tehran_housing_model
        db = MagicMock()
        no_vacancy = json.loads(build_tehran_housing_model(
            db, area_sqm=100, price_per_sqm=50_000_000,
            monthly_rent_per_sqm=300_000,
            annual_appreciation_pct=0.15,
            vacancy_months_per_year=0,
        ))
        with_vacancy = json.loads(build_tehran_housing_model(
            db, area_sqm=100, price_per_sqm=50_000_000,
            monthly_rent_per_sqm=300_000,
            annual_appreciation_pct=0.15,
            vacancy_months_per_year=2,
        ))
        assert with_vacancy["annual_rent"] < no_vacancy["annual_rent"]
        assert with_vacancy["gross_yield"] < no_vacancy["gross_yield"]

    def test_breakeven_years(self):
        """Buy vs rent breakeven should be present."""
        from rag.tools.financial_modeling import build_tehran_housing_model
        db = MagicMock()
        result = json.loads(build_tehran_housing_model(
            db, area_sqm=100, price_per_sqm=80_000_000,
            monthly_rent_per_sqm=400_000,
            annual_appreciation_pct=0.25,
        ))
        # With 25% appreciation, breakeven should exist and be reasonable
        assert "buy_vs_rent_breakeven_years" in result


class TestComputeDupont:
    def test_3_factor(self):
        """3-factor DuPont: PM x AT x EM = ROE."""
        from rag.tools.financial_modeling import compute_dupont
        db = MagicMock()
        # NI=50, Sales=500, Assets=1000, Equity=400
        # PM=0.1, AT=0.5, EM=2.5, ROE=0.125
        result = json.loads(compute_dupont(db, net_income=50, sales=500, total_assets=1000, total_equity=400))
        assert result["model_type"] == "dupont"
        assert result["mode"] == "3_factor"
        assert result["roe"] == pytest.approx(0.125, rel=1e-3)
        assert result["components"]["profit_margin"] == pytest.approx(0.1, rel=1e-3)
        assert result["components"]["asset_turnover"] == pytest.approx(0.5, rel=1e-3)
        assert result["components"]["equity_multiplier"] == pytest.approx(2.5, rel=1e-3)

    def test_5_factor(self):
        """5-factor DuPont with EBIT and EBT."""
        from rag.tools.financial_modeling import compute_dupont
        db = MagicMock()
        # NI=40, Sales=500, Assets=1000, Equity=400, EBIT=100, EBT=60
        # tax_burden=40/60=0.6667, interest_burden=60/100=0.6, ebit_margin=100/500=0.2
        # AT=0.5, EM=2.5, ROE=0.6667*0.6*0.2*0.5*2.5=0.1
        result = json.loads(compute_dupont(
            db, net_income=40, sales=500, total_assets=1000, total_equity=400,
            ebit=100, ebt=60,
        ))
        assert result["model_type"] == "dupont"
        assert result["mode"] == "5_factor"
        assert result["roe"] == pytest.approx(0.1, rel=1e-3)
        assert result["components"]["tax_burden"] == pytest.approx(40/60, rel=1e-3)
        assert result["components"]["interest_burden"] == pytest.approx(0.6, rel=1e-3)

    def test_zero_denominator(self):
        """Should return error when sales/assets/equity is zero."""
        from rag.tools.financial_modeling import compute_dupont
        db = MagicMock()
        result = json.loads(compute_dupont(db, net_income=50, sales=0, total_assets=1000, total_equity=400))
        assert "error" in result

    def test_negative_ebt_allowed(self):
        """Negative EBT should be allowed (not zero)."""
        from rag.tools.financial_modeling import compute_dupont
        db = MagicMock()
        result = json.loads(compute_dupont(
            db, net_income=-30, sales=500, total_assets=1000, total_equity=400,
            ebit=80, ebt=-40,
        ))
        assert result["model_type"] == "dupont"
        assert result["mode"] == "5_factor"


class TestComputeBrinsonAttribution:
    def test_three_sectors(self):
        """Brinson with 3 sectors, verify totals."""
        from rag.tools.financial_modeling import compute_brinson_attribution
        db = MagicMock()
        sectors = [
            {"name": "Tech", "portfolio_weight": 0.4, "benchmark_weight": 0.3, "portfolio_return": 0.15, "benchmark_return": 0.10},
            {"name": "Health", "portfolio_weight": 0.35, "benchmark_weight": 0.4, "portfolio_return": 0.08, "benchmark_return": 0.12},
            {"name": "Energy", "portfolio_weight": 0.25, "benchmark_weight": 0.3, "portfolio_return": 0.05, "benchmark_return": 0.06},
        ]
        result = json.loads(compute_brinson_attribution(db, sectors=sectors))
        assert result["model_type"] == "brinson_attribution"
        totals = result["totals"]
        # active_return should equal allocation + selection + interaction
        assert totals["active_return"] == pytest.approx(
            totals["allocation"] + totals["selection"] + totals["interaction"], abs=1e-6
        )
        assert len(result["sectors"]) == 3

    def test_weight_warning(self):
        """Should warn when weights don't sum to 1."""
        from rag.tools.financial_modeling import compute_brinson_attribution
        db = MagicMock()
        sectors = [
            {"name": "A", "portfolio_weight": 0.5, "benchmark_weight": 0.5, "portfolio_return": 0.1, "benchmark_return": 0.08},
            {"name": "B", "portfolio_weight": 0.4, "benchmark_weight": 0.4, "portfolio_return": 0.06, "benchmark_return": 0.05},
        ]
        # Portfolio weights sum to 0.9, benchmark weights sum to 0.9 — should warn
        result = json.loads(compute_brinson_attribution(db, sectors=sectors))
        assert result.get("weight_warning") is not None

    def test_empty_sectors(self):
        """Empty sectors should return error."""
        from rag.tools.financial_modeling import compute_brinson_attribution
        db = MagicMock()
        result = json.loads(compute_brinson_attribution(db, sectors=[]))
        assert "error" in result


class TestComputeBlackLitterman:
    def test_two_asset_one_view(self):
        """2-asset BL with 1 absolute view."""
        from rag.tools.financial_modeling import compute_black_litterman
        db = MagicMock()
        result = json.loads(compute_black_litterman(
            db,
            market_caps=[500, 500],
            covariance_matrix=[[0.04, 0.01], [0.01, 0.09]],
            risk_aversion=2.5,
            tau=0.05,
            views=[{"assets": [0], "weights": [1.0], "expected_return": 0.10}],
            view_confidences=[0.8],
        ))
        assert result["model_type"] == "black_litterman"
        assert result["n_assets"] == 2
        assert result["n_views"] == 1
        assert len(result["bl_returns"]) == 2
        assert len(result["bl_weights"]) == 2
        # BL returns should differ from implied equilibrium returns
        assert result["bl_returns"] != result["implied_returns"]
        # Weights should sum to ~1
        assert sum(result["bl_weights"]) == pytest.approx(1.0, abs=0.01)

    def test_too_many_assets(self):
        """Should reject >10 assets."""
        from rag.tools.financial_modeling import compute_black_litterman
        db = MagicMock()
        n = 11
        cov = [[0.01 if i == j else 0.001 for j in range(n)] for i in range(n)]
        result = json.loads(compute_black_litterman(
            db,
            market_caps=[100] * n,
            covariance_matrix=cov,
            risk_aversion=2.5,
            tau=0.05,
            views=[{"assets": [0], "weights": [1.0], "expected_return": 0.10}],
            view_confidences=[0.8],
        ))
        assert "error" in result


class TestComputePeFundMetrics:
    def test_basic_multiples(self):
        """TVPI, DPI, RVPI calculations."""
        from rag.tools.financial_modeling import compute_pe_fund_metrics
        db = MagicMock()
        result = json.loads(compute_pe_fund_metrics(
            db,
            contributions=[100, 50, 50],  # paid_in = 200
            distributions=[80, 60, 40],    # total_dist = 180
            nav=100,
        ))
        assert result["model_type"] == "pe_fund_metrics"
        assert result["paid_in_capital"] == pytest.approx(200)
        assert result["total_distributed"] == pytest.approx(180)
        assert result["tvpi"] == pytest.approx(1.4, rel=1e-3)   # (180+100)/200
        assert result["dpi"] == pytest.approx(0.9, rel=1e-3)    # 180/200
        assert result["rvpi"] == pytest.approx(0.5, rel=1e-3)   # 100/200

    def test_with_dates_triggers_irr(self):
        """When dates provided, mwr should be computed."""
        from rag.tools.financial_modeling import compute_pe_fund_metrics
        db = MagicMock()
        result = json.loads(compute_pe_fund_metrics(
            db,
            contributions=[100, 50],
            distributions=[60, 40],
            nav=80,
            dates=["2020-01-01", "2021-01-01", "2022-01-01"],
        ))
        assert result["model_type"] == "pe_fund_metrics"
        assert result["mwr"] is not None

    def test_zero_contributions(self):
        """Zero paid-in capital should return error."""
        from rag.tools.financial_modeling import compute_pe_fund_metrics
        db = MagicMock()
        result = json.loads(compute_pe_fund_metrics(
            db, contributions=[], distributions=[100], nav=50,
        ))
        assert "error" in result


class TestComputeOmegaRatio:
    def test_known_returns(self):
        """Omega ratio with known returns."""
        from rag.tools.financial_modeling import compute_omega_ratio
        db = MagicMock()
        returns = [0.05, 0.10, -0.03, 0.08, -0.01, 0.12, -0.05, 0.07]
        result = json.loads(compute_omega_ratio(db, returns=returns, threshold=0.0))
        assert result["model_type"] == "omega_ratio"
        assert result["omega"] > 1.0  # More gains than losses
        assert result["n_periods"] == 8
        assert 0.0 <= result["pct_above"] <= 1.0
        assert 0.0 <= result["pct_below"] <= 1.0

    def test_all_above_threshold(self):
        """When all returns are above threshold, omega should be capped."""
        from rag.tools.financial_modeling import compute_omega_ratio
        db = MagicMock()
        returns = [0.05, 0.10, 0.03, 0.08]
        result = json.loads(compute_omega_ratio(db, returns=returns, threshold=0.0))
        assert result["omega"] == pytest.approx(9999.99)

    def test_too_few_returns(self):
        """Should require at least 2 returns."""
        from rag.tools.financial_modeling import compute_omega_ratio
        db = MagicMock()
        result = json.loads(compute_omega_ratio(db, returns=[0.05]))
        assert "error" in result


class TestComputeCreditRisk:
    def test_basic_el_ul(self):
        """Basic expected loss and unexpected loss."""
        from rag.tools.financial_modeling import compute_credit_risk
        db = MagicMock()
        # EAD=1000, PD=0.02, LGD=0.45
        # EL = 1000*0.02*0.45 = 9.0
        # UL = 1000*sqrt(0.02*0.98)*0.45 = 1000*0.14*0.45 = 63.0 approx
        result = json.loads(compute_credit_risk(db, ead=1000, pd=0.02, lgd=0.45))
        assert result["model_type"] == "credit_risk"
        assert result["expected_loss"] == pytest.approx(9.0, rel=1e-3)
        assert result["unexpected_loss"] > 0
        assert result["credit_var_99"] > result["unexpected_loss"]

    def test_merton_model(self):
        """Merton structural model with known inputs."""
        from rag.tools.financial_modeling import compute_credit_risk
        db = MagicMock()
        result = json.loads(compute_credit_risk(
            db, ead=1000, pd=0.02, lgd=0.45,
            asset_value=150, debt_face=100, asset_volatility=0.3,
            time_horizon=1.0, risk_free_rate=0.05,
        ))
        assert result["model_type"] == "credit_risk"
        assert "distance_to_default" in result
        assert "pd_merton" in result
        assert 0 <= result["pd_merton"] <= 1
        assert result["distance_to_default"] > 0  # V > D, so positive D2D

    def test_invalid_pd(self):
        """PD outside 0-1 should return error."""
        from rag.tools.financial_modeling import compute_credit_risk
        db = MagicMock()
        result = json.loads(compute_credit_risk(db, ead=1000, pd=1.5, lgd=0.45))
        assert "error" in result


class TestComputeForwardRates:
    def test_forward_from_spots(self):
        """Forward rates derived from spot rates."""
        from rag.tools.financial_modeling import compute_forward_rates
        db = MagicMock()
        # Spots: 1yr=5%, 2yr=6%, 3yr=6.5%
        result = json.loads(compute_forward_rates(
            db, spot_rates=[0.05, 0.06, 0.065],
        ))
        assert result["model_type"] == "forward_rates"
        assert result["mode"] == "forward"
        assert len(result["forward_rates"]) == 2  # 2 forward rates from 3 spots
        # f(1,2) = ((1.06)^2 / (1.05)^1)^(1/1) - 1 ~ 0.07009
        assert result["forward_rates"][0] == pytest.approx(0.07009, rel=1e-2)

    def test_bootstrap_from_par(self):
        """Bootstrap spot rates from par rates."""
        from rag.tools.financial_modeling import compute_forward_rates
        db = MagicMock()
        result = json.loads(compute_forward_rates(
            db, par_rates=[0.04, 0.05, 0.055],
        ))
        assert result["model_type"] == "forward_rates"
        assert result["mode"] == "bootstrap"
        assert len(result["spot_rates"]) == 3
        # First spot rate should equal first par rate
        assert result["spot_rates"][0] == pytest.approx(0.04, rel=1e-3)

    def test_z_spread(self):
        """Z-spread solve for known bond."""
        from rag.tools.financial_modeling import compute_forward_rates
        db = MagicMock()
        # Spots at 4%, 5%, 5.5% for 3 years
        # Bond pays 6% coupon annually, face 100
        # Cash flows: [6, 6, 106]
        # Fair price with zero spread: 6/1.04 + 6/1.05^2 + 106/1.055^3
        spot_rates = [0.04, 0.05, 0.055]
        cash_flows = [6, 6, 106]
        # Compute fair price first
        fair_price = 6/1.04 + 6/1.05**2 + 106/1.055**3
        # Use a lower price to get positive z-spread
        result = json.loads(compute_forward_rates(
            db, spot_rates=spot_rates, cash_flows=cash_flows, price=fair_price - 2,
        ))
        assert result["model_type"] == "forward_rates"
        assert result["mode"] == "z_spread"
        assert result["z_spread"] is not None
        assert result["z_spread"] > 0  # Price below fair -> positive spread

    def test_no_inputs_error(self):
        """Should return error when neither spot_rates nor par_rates provided."""
        from rag.tools.financial_modeling import compute_forward_rates
        db = MagicMock()
        result = json.loads(compute_forward_rates(db))
        assert "error" in result


class TestToolDefinitions:
    def test_tool_definitions_count(self):
        from rag.tools.financial_modeling import TOOL_DEFINITIONS
        assert len(TOOL_DEFINITIONS) == 60   # 53 existing + 7 Phase 10

    def test_tool_dispatch_count(self):
        from rag.tools.financial_modeling import TOOL_DISPATCH
        assert len(TOOL_DISPATCH) == 60   # 53 existing + 7 Phase 10

    def test_tool_names_match(self):
        from rag.tools.financial_modeling import TOOL_DEFINITIONS, TOOL_DISPATCH
        def_names = {d["function"]["name"] for d in TOOL_DEFINITIONS}
        dispatch_names = set(TOOL_DISPATCH.keys())
        assert def_names == dispatch_names
