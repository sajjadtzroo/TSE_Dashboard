"""
Aggregated tool definitions and dispatch map across all tool modules.

Usage:
    from rag.tools import TOOL_DEFINITIONS, TOOL_DISPATCH
    from rag.tools import ALL_TOOL_DEFINITIONS, ALL_TOOL_DISPATCH  # same as above
    from rag.tools import select_tools  # pick a subset by name

Per-module access:
    from rag.tools import market, documents, technical, comparison, loans, crypto, cfa
"""

from rag.tools.cfa import TOOL_DEFINITIONS as CFA_TOOL_DEFINITIONS
from rag.tools.cfa import TOOL_DISPATCH as CFA_TOOL_DISPATCH
from rag.tools.comparison import TOOL_DEFINITIONS as COMPARISON_TOOL_DEFINITIONS
from rag.tools.comparison import TOOL_DISPATCH as COMPARISON_TOOL_DISPATCH
from rag.tools.crypto import TOOL_DEFINITIONS as CRYPTO_TOOL_DEFINITIONS
from rag.tools.crypto import TOOL_DISPATCH as CRYPTO_TOOL_DISPATCH
from rag.tools.documents import TOOL_DEFINITIONS as DOCUMENT_TOOL_DEFINITIONS
from rag.tools.documents import TOOL_DISPATCH as DOCUMENT_TOOL_DISPATCH
from rag.tools.loans import TOOL_DEFINITIONS as LOAN_TOOL_DEFINITIONS
from rag.tools.loans import TOOL_DISPATCH as LOAN_TOOL_DISPATCH
from rag.tools.market import TOOL_DEFINITIONS as MARKET_TOOL_DEFINITIONS
from rag.tools.market import TOOL_DISPATCH as MARKET_TOOL_DISPATCH
from rag.tools.portfolio import TOOL_DEFINITIONS as PORTFOLIO_TOOL_DEFINITIONS
from rag.tools.portfolio import TOOL_DISPATCH as PORTFOLIO_TOOL_DISPATCH
from rag.tools.technical import TOOL_DEFINITIONS as TECHNICAL_TOOL_DEFINITIONS
from rag.tools.technical import TOOL_DISPATCH as TECHNICAL_TOOL_DISPATCH
from rag.tools.web import TOOL_DEFINITIONS as WEB_TOOL_DEFINITIONS
from rag.tools.web import TOOL_DISPATCH as WEB_TOOL_DISPATCH

# Aggregate all
ALL_TOOL_DEFINITIONS = (
    MARKET_TOOL_DEFINITIONS
    + DOCUMENT_TOOL_DEFINITIONS
    + CFA_TOOL_DEFINITIONS
    + TECHNICAL_TOOL_DEFINITIONS
    + COMPARISON_TOOL_DEFINITIONS
    + LOAN_TOOL_DEFINITIONS
    + CRYPTO_TOOL_DEFINITIONS
    + WEB_TOOL_DEFINITIONS
    + PORTFOLIO_TOOL_DEFINITIONS
)

ALL_TOOL_DISPATCH = {
    **MARKET_TOOL_DISPATCH,
    **DOCUMENT_TOOL_DISPATCH,
    **CFA_TOOL_DISPATCH,
    **TECHNICAL_TOOL_DISPATCH,
    **COMPARISON_TOOL_DISPATCH,
    **LOAN_TOOL_DISPATCH,
    **CRYPTO_TOOL_DISPATCH,
    **WEB_TOOL_DISPATCH,
    **PORTFOLIO_TOOL_DISPATCH,
}

# Backward-compatible aliases
TOOL_DEFINITIONS = ALL_TOOL_DEFINITIONS
TOOL_DISPATCH = ALL_TOOL_DISPATCH


def select_tools(
    names: set[str], definitions: list[dict], dispatch: dict
) -> tuple[list[dict], dict]:
    """Pick a subset of tools by name."""
    defs = [d for d in definitions if d["function"]["name"] in names]
    disp = {k: v for k, v in dispatch.items() if k in names}
    return defs, disp
