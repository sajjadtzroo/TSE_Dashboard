# Chatbot Web Search + UI Improvements — Design

**Date**: 2026-02-19
**Status**: Approved
**Author**: Claude Code

---

## Problem Statement

The TSE Dashboard chat system has 23 database-backed tools across 7 specialized agents, but **no access to external/real-time information**. Users asking about recent news, current events outside trading hours, or topics outside the internal DB get incomplete answers. Additionally, the chat source UI does not distinguish between uploaded PDFs and internet results.

---

## Goals

1. Add **Tavily web search** as a tool available to all 7 agents (AI decides when to call it)
2. Display **web search results** as distinct source cards (globe icon, clickable URL, domain badge)
3. Update **ThinkingIndicator** to show a web-search-specific stage message
4. Secure API key only in `.env` (never committed)

---

## Non-Goals

- Per-user toggle for web search (future)
- Caching Tavily results in Redis (future)
- New `web_search` router intent (not needed with global tool approach)
- Displaying the raw search query to the user

---

## Architecture

### Approach: Global Tool (Approach A)

A single `web_search` tool is added to every agent's `tool_definitions` and `tool_dispatch`. The LLM autonomously decides when to call it — no router changes needed.

```
User query
  ↓
Router → any agent (market_data / general / etc.)
  ↓
LLM receives tools including web_search
LLM calls web_search("query") if it judges external info needed
  ↓
BaseAgent → rag/tools/web.py → Tavily API → structured results
  ↓
Sources with type="web" appended to response
  ↓
Frontend: teal badge + web source cards with globe icon + clickable URL
```

---

## Backend Changes

### 1. `rag/tools/web.py` (new file)

```python
def web_search(query: str, max_results: int = 5) -> str:
    # TavilyClient(api_key=settings.TAVILY_API_KEY).search(...)
    # Returns JSON: {"results": [{"title", "url", "content", "score"}, ...]}
    # Graceful fallback if key missing or rate-limited
```

- Tool definition follows existing pattern (function name, description, parameters schema)
- Returns string (JSON) consistent with all other tools

### 2. `rag/tools/__init__.py`

- Add `web_search` to `TOOL_DEFINITIONS` list
- Add `"web_search": web_search` to `TOOL_DISPATCH` dict

### 3. All 7 Agent Configs

Files: `market_data.py`, `document_qa.py`, `technical_analysis.py`, `comparison.py`, `loan_advisor.py`, `crypto.py`, `general.py`

Each gets:
- `web_search` tool definition added to `tool_definitions`
- `"web_search": web_search` added to `tool_dispatch`
- System prompt updated: add one line instructing when to use web search

### 4. `rag/agents/base.py`

- `_collect_tool_result()`: extend to handle `tool_name == "web_search"` — parse Tavily results into `sources` with `type="web"`, `source_url=url`, `title`, `content_preview`

### 5. `config/settings.py`

```python
TAVILY_API_KEY: str = ""
```

### 6. `.env.template`

Add under External API Keys section:
```
TAVILY_API_KEY=your_tavily_api_key_here
```

---

## Frontend Changes

### 1. `frontend/src/constants/chat.js`

```javascript
TOOL_LABELS: { web_search: 'جستجوی اینترنت' }
TOOL_CATEGORIES: { web_search: 'teal' }
```

### 2. `frontend/src/features/chat/components/SourceItem.jsx`

Add `type` prop (default `"document"`):

| Prop value | Icon | URL | Similarity | Pages |
|------------|------|-----|-----------|-------|
| `"document"` | IconFileText | no | yes | yes |
| `"web"` | IconWorld | yes (new tab) | no | no |

Web variant: title is a clickable link, domain extracted from URL shown as badge.

### 3. `frontend/src/features/chat/components/MessageBubble.jsx`

Pass `type={src.type || "document"}` to each `<SourceItem>`. No structural changes.

### 4. `frontend/src/features/chat/components/ThinkingIndicator.jsx`

Add web search icon/message for when `activeTool === "web_search"`:
- Icon: `IconWorld`
- Text: "در حال جستجوی اینترنت..."

---

## Data Contract

### Tool Result (from `web_search`)

```json
{
  "results": [
    {
      "title": "فولاد مبارکه رکورد تولید زد",
      "url": "https://example.ir/news/123",
      "content": "شرکت فولاد مبارکه اصفهان در نیمه اول سال...",
      "score": 0.92
    }
  ]
}
```

### Source Object (in API response `sources[]`)

```json
{
  "type": "web",
  "title": "فولاد مبارکه رکورد تولید زد",
  "source_url": "https://example.ir/news/123",
  "content_preview": "شرکت فولاد مبارکه اصفهان در نیمه اول سال...",
  "symbol": "",
  "page_numbers": "",
  "similarity": 0.92
}
```

Existing document sources use `type: "document"` (or omit `type` and default to document rendering).

---

## Security

- `TAVILY_API_KEY` lives only in `.env` (git-ignored)
- `.env.template` documents the variable name with placeholder value
- `settings.py` declares it as optional (`str = ""`) — app starts without it, tool returns error message if called without key
- API key is never logged or returned to frontend

---

## Files Changed

| File | Change |
|------|--------|
| `rag/tools/web.py` | NEW — Tavily wrapper function + tool definition |
| `rag/tools/__init__.py` | Add web_search to exports |
| `rag/agents/base.py` | Extend `_collect_tool_result` for web sources |
| `rag/agents/market_data.py` | Add web_search tool |
| `rag/agents/document_qa.py` | Add web_search tool |
| `rag/agents/technical_analysis.py` | Add web_search tool |
| `rag/agents/comparison.py` | Add web_search tool |
| `rag/agents/loan_advisor.py` | Add web_search tool |
| `rag/agents/crypto.py` | Add web_search tool |
| `rag/agents/general.py` | Add web_search tool |
| `config/settings.py` | Add TAVILY_API_KEY setting |
| `.env.template` | Document TAVILY_API_KEY |
| `.env` | Add actual API key (not committed) |
| `frontend/src/constants/chat.js` | Add web_search label + category |
| `frontend/src/features/chat/components/SourceItem.jsx` | type prop, web variant |
| `frontend/src/features/chat/components/MessageBubble.jsx` | Pass type to SourceItem |
| `frontend/src/features/chat/components/ThinkingIndicator.jsx` | Web search stage |
