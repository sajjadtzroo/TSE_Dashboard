"""FinancialAnalysisAgent — CFA L1/L2/L3 structured financial analysis."""

import json

from rag.agents.base import AgentConfig

SYSTEM_PROMPT = """You are a CFA Level III financial analyst. You analyze Tehran Stock Exchange (TSE) companies.

CRITICAL: You MUST call the tool `get_multi_statement_data` first to get data. NEVER respond without calling a tool first.

## Step 1 — Data Collection (MANDATORY)
Call `get_multi_statement_data` with the symbol to get all three statements at once.

## Step 2 — Analysis
Respond in Persian (Farsi) with the following structured analysis.

## قالب خروجی (Markdown)

### ۱. خلاصه اجرایی (Executive Summary)
[۳–۴ جمله: نتیجه کلی + مهم‌ترین نقطه قوت + مهم‌ترین ریسک + توصیه]

### ۲. تحلیل سودآوری (CFA L1: Profitability)
| شاخص | آخرین دوره | دوره قبل | تغییر | میانگین ۵ دوره |
|------|-----------|---------|-------|---------------|
| حاشیه ناخالص | x٪ | x٪ | ↑/↓ | x٪ |
| حاشیه عملیاتی | x٪ | x٪ | ↑/↓ | x٪ |
| حاشیه سود خالص | x٪ | x٪ | ↑/↓ | x٪ |
| ROA | x٪ | x٪ | ↑/↓ | x٪ |
| ROE | x٪ | x٪ | ↑/↓ | x٪ |

- CAGR درآمد (n دوره): x٪
- CAGR سود خالص (n دوره): x٪

### ۳. تجزیه DuPont (CFA L2: Equity Analysis)
```
ROE = حاشیه سود × گردش دارایی × ضریب مالکانه
ROE = (سود خالص/درآمد) × (درآمد/دارایی) × (دارایی/حقوق مالکانه)
```
| جزء | آخرین دوره | دوره قبل | تفسیر |
|-----|-----------|---------|-------|
| حاشیه سود خالص | x | x | [آیا سودآوری محرک ROE است؟] |
| گردش دارایی‌ها | x | x | [آیا کارایی محرک ROE است؟] |
| ضریب مالکانه | x | x | [آیا اهرم محرک ROE است؟] |
| **ROE ترکیبی** | **x٪** | **x٪** | |

### ۴. تحلیل نقدینگی و پوشش (CFA L1: Liquidity)
| شاخص | مقدار | وضعیت |
|------|-------|-------|
| نسبت بدهی به دارایی | x٪ | 🟢/🟡/🔴 |
| نسبت بدهی به حقوق مالکانه | x | 🟢/🟡/🔴 |
| نسبت حقوق مالکانه | x٪ | 🟢/🟡/🔴 |

### ۵. کیفیت سود (CFA L2: Quality of Earnings)
- نسبت جریان نقد عملیاتی به سود خالص: x (اگر < ۱ هشدار)
- نسبت تعهدات (Accruals Ratio): [محاسبه اگر داده موجود]
- آیا سود نقدی است یا صرفاً حسابداری؟

### ۶. روند رشد
| شاخص | YoY آخرین دوره | CAGR |
|------|---------------|------|
| درآمد | x٪ | x٪ |
| سود ناخالص | x٪ | x٪ |
| سود عملیاتی | x٪ | x٪ |
| سود خالص | x٪ | x٪ |
| دارایی‌ها | x٪ | x٪ |

### ۷. ارزیابی ریسک (CFA L3: Risk)
**ریسک‌های شناسایی‌شده:**
- [فهرست ریسک‌ها بر اساس داده‌ها]

**سیگنال‌های هشدار:**
- 🔴 اگر حاشیه سود کاهشی / ROE کاهشی / بدهی بالا / جریان نقد منفی
- 🟡 اگر رشد کندشونده / اهرم افزایشی
- 🟢 اگر همه شاخص‌ها مثبت

### ۸. جمع‌بندی و امتیاز
| بُعد | امتیاز (۱-۵) | توضیح |
|------|-------------|-------|
| سودآوری | ⭐⭐⭐ | |
| رشد | ⭐⭐⭐ | |
| ساختار مالی | ⭐⭐⭐ | |
| کیفیت سود | ⭐⭐⭐ | |
| **مجموع** | **x/20** | |

## قوانین محاسبه
- حاشیه ناخالص = سود ناخالص / درآمد × ۱۰۰
- حاشیه عملیاتی = سود عملیاتی / درآمد × ۱۰۰
- حاشیه خالص = سود خالص / درآمد × ۱۰۰
- ROA = سود خالص / میانگین دارایی × ۱۰۰
- ROE = سود خالص / میانگین حقوق مالکانه × ۱۰۰
- گردش دارایی = درآمد / میانگین دارایی
- ضریب مالکانه = میانگین دارایی / میانگین حقوق مالکانه
- CAGR = (مقدار نهایی / مقدار اولیه)^(1/n) - 1
- YoY = (مقدار فعلی - مقدار قبلی) / |مقدار قبلی| × ۱۰۰

## نکات مهم
- همیشه هر سه صورت مالی را دریافت کن (صورت سود و زیان + ترازنامه + جریان وجوه نقد)
- تمام اعداد را با واحد میلیون ریال نمایش بده
- برای محاسبه ROA و ROE از میانگین دو دوره استفاده کن
- اگر داده‌ای موجود نیست، صادقانه بگو و محاسبه نکن
- از line_items برای جزئیات بیشتر استفاده کن
- تحلیل را کاملاً به فارسی ارائه بده"""


def _get_financial_data(db, symbol: str, statement_type: str = "income_statement", limit: int = 5) -> str:
    """Fetch the last N periods of a financial statement with full line_items."""
    try:
        from database.models import FinancialStatement

        rows = (
            db.query(FinancialStatement)
            .filter(
                FinancialStatement.symbol == symbol,
                FinancialStatement.statement_type == statement_type,
            )
            .order_by(FinancialStatement.period_end_date.desc())
            .limit(limit)
            .all()
        )

        if not rows:
            return json.dumps({"error": f"No {statement_type} data found for {symbol}"})

        # Chronological order (oldest first)
        rows = list(reversed(rows))

        HOT_FIELDS = (
            "revenue", "cost_of_revenue", "gross_profit",
            "operating_income", "net_income",
            "total_assets", "total_liabilities", "total_equity", "eps",
        )

        periods = []
        for r in rows:
            period = {
                "period": r.period_end_jalali,
                "period_end_date": str(r.period_end_date),
                "is_audited": r.is_audited,
                "is_consolidated": r.is_consolidated,
                "period_months": r.period_months,
            }
            for field in HOT_FIELDS:
                val = getattr(r, field, None)
                if val is not None:
                    period[field] = int(val) if hasattr(val, '__int__') else float(val)

            # Include line_items for deep analysis
            if r.line_items and isinstance(r.line_items, dict):
                for k, v in r.line_items.items():
                    if v is not None and k not in period:
                        try:
                            period[k] = int(v) if isinstance(v, (int, float)) and v == int(v) else float(v)
                        except (ValueError, TypeError):
                            period[k] = str(v)

            periods.append(period)

        return json.dumps({
            "symbol": symbol,
            "statement_type": statement_type,
            "periods": periods,
            "count": len(periods),
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


def _get_multi_statement_data(db, symbol: str, limit: int = 5) -> str:
    """Fetch income statement + balance sheet + cash flow in one call for ratio analysis."""
    results = {}
    for st in ("income_statement", "balance_sheet", "cash_flow"):
        raw = _get_financial_data(db, symbol, st, limit)
        parsed = json.loads(raw)
        results[st] = parsed.get("periods", [])

    return json.dumps({
        "symbol": symbol,
        "income_statement": results["income_statement"],
        "balance_sheet": results["balance_sheet"],
        "cash_flow": results["cash_flow"],
    }, ensure_ascii=False)


TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_financial_data",
            "description": "دریافت صورت مالی یک نوع خاص (صورت سود و زیان، ترازنامه، جریان وجوه نقد) شامل تمام اقلام ریز (line_items). برای تحلیل کامل، هر سه نوع صورت مالی را جداگانه دریافت کن.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "نماد بورسی (مثال: فولاد، خودرو)",
                    },
                    "statement_type": {
                        "type": "string",
                        "enum": ["income_statement", "balance_sheet", "cash_flow"],
                        "description": "نوع صورت مالی: income_statement (سود و زیان)، balance_sheet (ترازنامه)، cash_flow (جریان وجوه نقد)",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "تعداد دوره‌ها (پیش‌فرض: ۵)",
                        "default": 5,
                    },
                },
                "required": ["symbol", "statement_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_multi_statement_data",
            "description": "دریافت همزمان هر سه صورت مالی (سود و زیان + ترازنامه + جریان وجوه نقد) برای محاسبه نسبت‌های مالی و تحلیل DuPont. این ابزار برای تحلیل جامع توصیه می‌شود.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "نماد بورسی",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "تعداد دوره‌ها (پیش‌فرض: ۵)",
                        "default": 5,
                    },
                },
                "required": ["symbol"],
            },
        },
    },
]

TOOL_DISPATCH = {
    "get_financial_data": _get_financial_data,
    "get_multi_statement_data": _get_multi_statement_data,
    # Backward compatibility
    "get_financial_statements_summary": _get_financial_data,
}


def build_config() -> AgentConfig:
    return AgentConfig(
        name="financial_analysis",
        system_prompt=SYSTEM_PROMPT,
        tool_definitions=TOOL_DEFINITIONS,
        tool_dispatch=TOOL_DISPATCH,
        max_tool_rounds=5,
        temperature=0.15,
        max_tokens=4000,
    )
