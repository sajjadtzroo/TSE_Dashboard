"""Financial modeling tools — 60+ tools across 10 domain submodules."""

from rag.tools.financial_modeling.analytics import (
    TOOL_DEFINITIONS as _A,
    TOOL_DISPATCH as _AD,
)
from rag.tools.financial_modeling.deals import (
    TOOL_DEFINITIONS as _D,
    TOOL_DISPATCH as _DD,
)
from rag.tools.financial_modeling.derivatives import (
    TOOL_DEFINITIONS as _DR,
    TOOL_DISPATCH as _DRD,
)
from rag.tools.financial_modeling.earnings_quality import (
    TOOL_DEFINITIONS as _EQ,
    TOOL_DISPATCH as _EQD,
)
from rag.tools.financial_modeling.equity_valuation import (
    TOOL_DEFINITIONS as _EV,
    TOOL_DISPATCH as _EVD,
)
from rag.tools.financial_modeling.fixed_income import (
    TOOL_DEFINITIONS as _FI,
    TOOL_DISPATCH as _FID,
)
from rag.tools.financial_modeling.operational import (
    TOOL_DEFINITIONS as _O,
    TOOL_DISPATCH as _OD,
)
from rag.tools.financial_modeling.portfolio import (
    TOOL_DEFINITIONS as _P,
    TOOL_DISPATCH as _PD,
)
from rag.tools.financial_modeling.real_estate_islamic import (
    TOOL_DEFINITIONS as _RE,
    TOOL_DISPATCH as _RED,
)
from rag.tools.financial_modeling.valuation import (
    TOOL_DEFINITIONS as _V,
    TOOL_DISPATCH as _VD,
)

TOOL_DEFINITIONS = _V + _O + _FI + _D + _EQ + _P + _DR + _RE + _A + _EV

TOOL_DISPATCH = {
    **_VD,
    **_OD,
    **_FID,
    **_DD,
    **_EQD,
    **_PD,
    **_DRD,
    **_RED,
    **_AD,
    **_EVD,
}

# ── Backward-compatible re-exports ───────────────────────────────────────────
# Tests and external code may `from rag.tools.financial_modeling import <func>`.
# Re-export all public tool functions from TOOL_DISPATCH.
globals().update(TOOL_DISPATCH)

# Re-export private helpers accessed by tests.
from rag.tools.financial_modeling._fm_helpers import (  # noqa: E402, F401
    EXCEL_AVAILABLE,
    _auto_width,
    _get_excel_models_dir,
    _save_excel,
)
from rag.tools.financial_modeling.valuation import (  # noqa: E402, F401
    _build_dcf_workbook,
    _build_pl_workbook,
    _compute_fcff,
)
