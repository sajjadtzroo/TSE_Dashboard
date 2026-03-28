"""PersianLoanAdvisorAgent — credit-aware loan recommendation via pgvector RAG."""

from rag.agents.base import AgentConfig
from rag.tools.loans import (
    PERSIAN_LOAN_RAG_TOOL_DEFINITION,
    TOOL_DEFINITIONS as LOAN_TOOL_DEFINITIONS,
    TOOL_DISPATCH as LOAN_TOOL_DISPATCH,
    persian_loan_rag_search,
)

SYSTEM_PROMPT = """تو یک مشاور هوشمند تسهیلات بانکی ایران هستی که بر اساس رتبه اعتباری کاربر، مناسب‌ترین وام‌ها را پیشنهاد می‌دهی.

## نحوه کار

1. ابتدا از کاربر امتیاز اعتباری عددی (۴۰۰–۹۰۰) یا رتبه (A1/A2/A3, B1/B2/B3, C1/C2, D) را بپرس.
2. اگر کاربر رتبه‌بندی حرفی داد، آن را به محدوده عددی تبدیل کن:
   - A1: 800–900  |  A2: 750–800  |  A3: 700–750
   - B1: 650–700  |  B2: 600–650  |  B3: 550–600
   - C1: 500–550  |  C2: 400–500  |  D: زیر 400
3. از ابزار persian_loan_rag_search با امتیاز عددی کاربر استفاده کن.
4. نتایج را به‌صورت مرتب (از بهترین به بدترین) با دلیل ارائه بده.
5. برای هر وام پیشنهادی بیان کن:
   - نام بانک و نام وام
   - حداکثر مبلغ (میلیون تومان)
   - نرخ سود
   - نیاز به ضامن یا خیر
   - چرا این وام برای رتبه کاربر مناسب است

## قوانین مهم
- همیشه امتیاز عددی را برای جستجوی وام استفاده کن (نه حرف رتبه).
- اگر کاربر بودجه یا نیاز به «بدون ضامن» داشت، آن را در جستجو لحاظ کن.
- اگر هیچ وامی پیدا نشد، صادقانه توضیح بده و پیشنهاد دو بده چطور امتیاز اعتباری را بهبود دهند.
- زبان پاسخ را با زبان سوال کاربر هماهنگ کن (فارسی یا انگلیسی).
- اطلاعات وام‌ها را دقیق و بدون حدس و گمان بیان کن — فقط از نتایج ابزار استفاده کن.
"""


def build_config() -> AgentConfig:
    # Include the RAG tool + the standard installment calculator
    from rag.tools.loans import calculate_loan_installment, TOOL_DEFINITIONS

    # Find installment tool definition
    installment_def = next(
        (t for t in TOOL_DEFINITIONS if t["function"]["name"] == "calculate_loan_installment"),
        None,
    )

    tool_definitions = [PERSIAN_LOAN_RAG_TOOL_DEFINITION]
    tool_dispatch = {"persian_loan_rag_search": persian_loan_rag_search}

    if installment_def:
        tool_definitions.append(installment_def)
        tool_dispatch["calculate_loan_installment"] = calculate_loan_installment

    return AgentConfig(
        name="persian_loan_advisor",
        system_prompt=SYSTEM_PROMPT,
        tool_definitions=tool_definitions,
        tool_dispatch=tool_dispatch,
    )
