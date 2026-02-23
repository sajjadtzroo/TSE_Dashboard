# Financial Modeling — Phase 1 Design

**Date**: 2026-02-23
**Branch**: feature/financial-modeling-phase1
**Status**: Approved

---

## Overview

Add a dedicated Financial Modeling section to TSE Dashboard. Users chat with an AI agent to build DCF, P&L, loan amortization, and bond pricing models. The agent optionally auto-fetches historical financials from CODAL/TSE data, builds the model, creates a Google Sheet, and returns a shareable link.

Phase 1 scope: chat-driven input, 4 model types, app-owned Google Sheets via service account, dedicated frontend page.

---

## Architecture

Approach A — extend the existing RAG agent system. The financial modeling agent slots into the same infrastructure as the 9 existing agents (market_data, cfa_finance, portfolio_advisor, etc.). No new API endpoints, no new streaming infrastructure. The dedicated frontend page reuses existing hooks.

```
User chat → /api/chat/stream (existing)
  → Router classifies intent: "financial_modeling"
  → financial_modeling agent (new)
      → tool: build_dcf_model / build_pl_model / build_loan_amortization / build_bond_model
          → fetches CODAL/TSE data (optional, if ticker given)
          → builds model numerics
          → creates Google Sheet via service account
          → returns { sheet_url, summary }
  → streams answer tokens to frontend
→ Frontend renders ModelResultCard inline in chat
```

---

## Backend

### New files

**`rag/tools/financial_modeling.py`**
Four tools following the existing `func(db, **kwargs) → str` pattern:

| Tool | Key inputs | Output |
|------|-----------|--------|
| `build_dcf_model` | ticker (opt), revenue, growth_rate, ebit_margin, wacc, years, tax_rate | 5-year FCF projection, terminal value, intrinsic value/share → Sheet |
| `build_pl_model` | ticker (opt), revenue, cogs_pct, opex_pct, years | Income statement projection → Sheet |
| `build_loan_amortization` | principal, annual_rate, years, frequency | Full amortization schedule → Sheet |
| `build_bond_model` | face_value, coupon_rate, maturity_years, discount_rate, frequency | Price, YTM, duration, convexity → Sheet |

Each tool:
1. If `ticker` provided, fetches last 3Y financials from existing market/CODAL data
2. Computes model numerics in Python (`numpy-financial`)
3. Creates a Google Sheet via `gspread` + service account
4. Sets sharing to "anyone with link can view"
5. Returns JSON string: `{ "sheet_url": "...", "summary": { ...key metrics... } }`

Shared internal helper (inside `financial_modeling.py`):
```python
def _create_sheet(title: str, worksheets: list[dict]) -> str:
    # authenticates via GOOGLE_SHEETS_CREDENTIALS_PATH
    # creates sheet, writes data, sets sharing, returns URL
```

**`rag/agents/financial_modeling.py`**
```python
SYSTEM_PROMPT = """You are a financial modeling assistant..."""

def build_config() -> AgentConfig:
    return AgentConfig(
        name="financial_modeling",
        system_prompt=SYSTEM_PROMPT,
        tool_definitions=TOOL_DEFINITIONS,
        tool_dispatch=TOOL_DISPATCH,
        max_tool_rounds=5,
        temperature=0.2,
        max_tokens=3000,
    )
```

### Modified files

**`rag/agents/router.py`**
Add `financial_modeling` intent with keywords:
- English: `dcf`, `discounted cash flow`, `valuation model`, `p&l`, `income statement projection`, `amortization`, `bond price`, `ytm`, `yield to maturity`, `financial model`, `build model`
- Persian: `مدل مالی`, `ارزش‌گذاری`, `جریان نقد آزاد`, `استهلاک وام`, `قیمت اوراق`

**`rag/agents/__init__.py`**
Register `financial_modeling` → `financial_modeling.build_config`

**`rag/tools/__init__.py`**
Include `financial_modeling` tools in `ALL_TOOL_DEFINITIONS` / `ALL_TOOL_DISPATCH`

**`config/settings.py`**
```python
GOOGLE_SHEETS_CREDENTIALS_PATH: str = "config/google_service_account.json"
GOOGLE_SHEETS_ENABLED: bool = True
```

### Dependencies to add
```
gspread
google-auth
numpy-financial
```

---

## Frontend

### New route
`App.jsx`: `/financial-modeling` → `FinancialModelingPage` (lazy, standalone — no layout wrapper)

### New files
```
frontend/src/pages/FinancialModelingPage.jsx
frontend/src/features/financial-modeling/components/
  ├── ModelingLayout.jsx     — page shell: sidebar + chat area
  ├── ModelSidebar.jsx       — recent models (from useChatSessions) + template chips
  ├── ModelChatArea.jsx      — wraps useSSEChat + message list + input
  ├── ModelResultCard.jsx    — inline card: key metrics + Google Sheets link
  └── ModelEmptyState.jsx    — welcome state with 4 model-type quick-start chips
```

### Layout
```
┌─────────────────────────────────────────────────────┐
│  [← Back]  Financial Modeling                       │
├──────────────────┬──────────────────────────────────┤
│  SIDEBAR (300px) │  CHAT AREA                        │
│                  │                                   │
│  [+ New Model]   │  [EmptyState: pick a model type] │
│                  │                                   │
│  Recent Models   │  User: Build DCF for FOLD         │
│  ─ FOLD DCF      │                                   │
│  ─ Bond 18%      │  AI: Fetched 3Y data from CODAL.. │
│  ─ Loan 500M     │  ┌─────────────────────────────┐ │
│                  │  │  ModelResultCard             │ │
│  Templates       │  │  DCF — FOLD                  │ │
│  ─ DCF           │  │  Intrinsic value: 1,240 R    │ │
│  ─ P&L           │  │  Upside: +24%                │ │
│  ─ Loan          │  │  [Open in Google Sheets →]   │ │
│  ─ Bond          │  └─────────────────────────────┘ │
│                  │                                   │
│                  │  [Type your assumptions...]  [→]  │
└──────────────────┴──────────────────────────────────┘
```

### ModelResultCard
Rendered inline in the chat message list when the AI response JSON contains `sheet_url`. Displays:
- Model type badge (DCF / P&L / Loan / Bond)
- 3–4 key metrics from `summary`
- "Open in Google Sheets" button (external link)

### ModelEmptyState
4 clickable chips that pre-fill the chat input:
- **DCF Valuation** → "Build a DCF model for [ticker] with..."
- **P&L Projection** → "Build a P&L projection for..."
- **Loan Schedule** → "Build an amortization schedule for a loan of..."
- **Bond Pricing** → "Price a bond with face value..."

### Reused (no changes needed)
- `useSSEChat` — handles streaming, routing/tool_call/token events
- `useChatSessions` — session persistence; sidebar reads session titles as "Recent Models"

### Navigation
- Add "Financial Modeling" link to `MainLayout` sidebar nav
- Add entry to landing page features section

---

## Data Flow

```
1. User: "Build a DCF for FOLD"
2. POST /api/chat/stream → router → "financial_modeling"
   SSE: { type: "routing", intent: "financial_modeling" }
3. Agent calls build_dcf_model(db, ticker="FOLD")
   SSE: { type: "tool_call", name: "build_dcf_model" }
4. Tool fetches 3Y CODAL data, computes DCF, creates Sheet
   SSE: { type: "tool_result", name: "build_dcf_model" }
5. Agent streams final answer with embedded JSON block
   SSE: { type: "token", content: "..." } × N
6. SSE: { type: "done" }
7. Frontend parses sheet_url from response → renders ModelResultCard
```

---

## Error Handling

| Failure | Behavior |
|---------|----------|
| Google Sheets API down | Tool returns error → agent outputs key metrics as Markdown table instead |
| `GOOGLE_SHEETS_ENABLED=false` | Same graceful degradation — text output only |
| Ticker not in CODAL | Agent asks user to provide assumptions manually |
| Missing required assumptions | Agent asks follow-up questions before calling tool |
| LLM fails to extract assumptions | Agent returns clarifying question to user |

---

## Environment Setup

Add to `.env`:
```env
GOOGLE_SHEETS_CREDENTIALS_PATH=config/google_service_account.json
GOOGLE_SHEETS_ENABLED=true
```

Place Google service account JSON at `config/google_service_account.json` (gitignored).

---

## Out of Scope (Phase 2+)
- PDF/Excel document upload for financial data extraction
- Multi-stage DDM, residual income, LBO models
- Sensitivity tables / scenario analysis
- PDF tearsheet export
- Per-user Google Drive (OAuth)
- Model versioning
