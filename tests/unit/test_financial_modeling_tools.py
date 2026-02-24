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


class TestToolDefinitions:
    def test_tool_definitions_count(self):
        from rag.tools.financial_modeling import TOOL_DEFINITIONS
        assert len(TOOL_DEFINITIONS) == 21   # 20 CFA tools + lookup_industry_benchmarks

    def test_tool_dispatch_count(self):
        from rag.tools.financial_modeling import TOOL_DISPATCH
        assert len(TOOL_DISPATCH) == 21   # 20 CFA tools + lookup_industry_benchmarks

    def test_tool_names_match(self):
        from rag.tools.financial_modeling import TOOL_DEFINITIONS, TOOL_DISPATCH
        def_names = {d["function"]["name"] for d in TOOL_DEFINITIONS}
        dispatch_names = set(TOOL_DISPATCH.keys())
        assert def_names == dispatch_names
