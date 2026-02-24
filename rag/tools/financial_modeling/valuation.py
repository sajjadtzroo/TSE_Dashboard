"""Valuation tools — thin aggregator from domain submodules.

Each tool is implemented in a focused submodule:
  _workbooks/      — Excel workbook builders (DCF + P&L)
  cost_of_capital  — compute_wacc, compute_capm, compute_beta
  dcf              — build_dcf_model
  pl               — build_pl_model
  ddm              — build_ddm_model, build_residual_income_model
  multiples        — build_multiples_model, build_scenario_model
  equity_metrics   — compute_fcfe, compute_operating_leverage, compute_pvgo, compute_eva
"""
from __future__ import annotations

# ── Private helpers (re-exported for backward-compat) ─────────────────────────
from rag.tools.financial_modeling._workbooks.dcf_workbook import (  # noqa: F401
    _build_dcf_workbook,
    _compute_fcff,
)
from rag.tools.financial_modeling._workbooks.pl_workbook import _build_pl_workbook  # noqa: F401
from rag.tools.financial_modeling._fm_helpers import _save_excel  # noqa: F401

# ── Tool submodule imports ────────────────────────────────────────────────────
from rag.tools.financial_modeling.cost_of_capital import (
    TOOL_DEFINITIONS as _COC_TD,
    TOOL_DISPATCH as _COC_DISP,
    compute_beta,  # noqa: F401
    compute_capm,  # noqa: F401
    compute_wacc,  # noqa: F401
)
from rag.tools.financial_modeling.dcf import (
    TOOL_DEFINITIONS as _DCF_TD,
    TOOL_DISPATCH as _DCF_DISP,
    build_dcf_model,  # noqa: F401
)
from rag.tools.financial_modeling.ddm import (
    TOOL_DEFINITIONS as _DDM_TD,
    TOOL_DISPATCH as _DDM_DISP,
    build_ddm_model,  # noqa: F401
    build_residual_income_model,  # noqa: F401
)
from rag.tools.financial_modeling.equity_metrics import (
    TOOL_DEFINITIONS as _EM_TD,
    TOOL_DISPATCH as _EM_DISP,
    compute_eva,  # noqa: F401
    compute_fcfe,  # noqa: F401
    compute_operating_leverage,  # noqa: F401
    compute_pvgo,  # noqa: F401
)
from rag.tools.financial_modeling.multiples import (
    TOOL_DEFINITIONS as _MULTI_TD,
    TOOL_DISPATCH as _MULTI_DISP,
    build_multiples_model,  # noqa: F401
    build_scenario_model,  # noqa: F401
)
from rag.tools.financial_modeling.pl import (
    TOOL_DEFINITIONS as _PL_TD,
    TOOL_DISPATCH as _PL_DISP,
    build_pl_model,  # noqa: F401
)

# ── Aggregated definitions (preserve original ordering) ──────────────────────
TOOL_DEFINITIONS = (
    _DCF_TD
    + _PL_TD
    + _COC_TD
    + _DDM_TD
    + _MULTI_TD
    + _EM_TD
)

TOOL_DISPATCH = {
    **_DCF_DISP,
    **_PL_DISP,
    **_COC_DISP,
    **_DDM_DISP,
    **_MULTI_DISP,
    **_EM_DISP,
}
