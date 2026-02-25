"""FinancialAnalysisAgent — CFA-style structured financial analysis for a single symbol."""

import json

from rag.agents.base import AgentConfig

SYSTEM_PROMPT = """شما یک تحلیلگر مالی حرفه‌ای با تخصص CFA هستید که صورت‌های مالی شرکت‌های بورس تهران را تحلیل می‌کنید.

وظیفه شما:
۱. دریافت داده‌های صورت مالی آخرین ۵ دوره
۲. محاسبه نرخ رشد سال‌به‌سال، حاشیه‌های سود، و CAGR
۳. شناسایی نقاط قوت، ضعف، و هشدارهای مالی
۴. ارائه تحلیل ساختاریافته به فارسی

قالب خروجی (Markdown):
## خلاصه تحلیل
[۲–۳ جمله کلیدی]

## روند رشد
- درآمد: [رشد YoY آخرین دوره]٪ / CAGR [n] دوره: [x]٪
- سود ناخالص: [روند]
- سود خالص: [روند]

## حاشیه‌های سود
| شاخص | آخرین دوره | میانگین |
|------|-----------|---------|
| حاشیه ناخالص | x٪ | x٪ |
| حاشیه عملیاتی | x٪ | x٪ |
| حاشیه خالص | x٪ | x٪ |

## نقاط قوت و ضعف
**نقاط قوت:** ...
**ریسک‌ها و هشدارها:** ...

## نتیجه‌گیری
[یک پاراگراف جمع‌بندی]

قوانین:
- همیشه از ابزار get_financial_statements_summary برای دریافت داده استفاده کن
- تمام اعداد را با واحد میلیون ریال نمایش بده
- نرخ رشد منفی را با علامت منفی و رنگ هشدار نشان بده
- در صورت کمبود داده برای محاسبه، صادقانه اعلام کن"""


def _get_financial_statements_summary(db, symbol: str, statement_type: str = "income_statement", limit: int = 5) -> str:
    """Fetch the last N periods of a financial statement for a symbol."""
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

        # Return in chronological order (oldest first)
        rows = list(reversed(rows))

        periods = []
        for r in rows:
            period = {
                "period": r.period_end_jalali,
                "is_audited": r.is_audited,
                "is_consolidated": r.is_consolidated,
                "period_months": r.period_months,
            }
            # Include non-null hot fields
            for field in ("revenue", "cost_of_revenue", "gross_profit", "operating_income", "net_income", "total_assets", "total_liabilities", "total_equity", "eps"):
                val = getattr(r, field, None)
                if val is not None:
                    period[field] = int(val) if hasattr(val, '__int__') else float(val)
            periods.append(period)

        return json.dumps({
            "symbol": symbol,
            "statement_type": statement_type,
            "periods": periods,
            "count": len(periods),
        }, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})


TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_financial_statements_summary",
            "description": "دریافت خلاصه صورت‌های مالی چند دوره برای یک نماد بورسی. داده‌ها شامل درآمد، سود ناخالص، سود خالص و سایر شاخص‌های کلیدی است.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "نماد بورسی (مثال: فولاد، خودرو)",
                    },
                    "statement_type": {
                        "type": "string",
                        "enum": ["income_statement", "balance_sheet", "cash_flow", "comprehensive_income", "equity_changes"],
                        "description": "نوع صورت مالی",
                        "default": "income_statement",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "تعداد دوره‌های مورد بررسی (پیش‌فرض: ۵)",
                        "default": 5,
                    },
                },
                "required": ["symbol"],
            },
        },
    }
]

TOOL_DISPATCH = {
    "get_financial_statements_summary": _get_financial_statements_summary,
}


def build_config() -> AgentConfig:
    return AgentConfig(
        name="financial_analysis",
        system_prompt=SYSTEM_PROMPT,
        tool_definitions=TOOL_DEFINITIONS,
        tool_dispatch=TOOL_DISPATCH,
        max_tool_rounds=3,
        temperature=0.2,
        max_tokens=2000,
    )
