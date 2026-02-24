"""Financial modeling tools — 60+ tools across 9 domain submodules."""

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

TOOL_DEFINITIONS = _V + _O + _FI + _D + _EQ + _P + _DR + _RE + _A

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
}
