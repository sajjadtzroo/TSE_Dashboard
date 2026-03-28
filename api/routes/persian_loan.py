"""
Persian Loan RAG endpoints — credit-aware loan recommendation.

POST /api/persian-loan/chat       — RAG chat (viewer+)
GET  /api/persian-loan/credit-guide — explain the 9-tier credit system (public)
GET  /api/persian-loan/stats        — DB stats: total banks, products (public)
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.auth import get_current_user, require_role
from api.deps import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/persian-loan", tags=["persian-loan"])

# ── Credit rating reference ──────────────────────────────────────────────────

CREDIT_TIERS = [
    {"rating": "A1", "score_min": 800, "score_max": 900, "risk_fa": "بسیار ناچیز",
     "label_fa": "عالی", "description_fa": "خوش‌حساب‌ترین مشتریان؛ وام با کمترین وثیقه."},
    {"rating": "A2", "score_min": 750, "score_max": 800, "risk_fa": "بسیار پایین",
     "label_fa": "بسیار خوب", "description_fa": "سابقه درخشان؛ تایید سریع درخواست‌های اعتباری."},
    {"rating": "A3", "score_min": 700, "score_max": 750, "risk_fa": "پایین",
     "label_fa": "خوب", "description_fa": "مشتری معتبر؛ بدون سابقه چک برگشتی یا اقساط معوق."},
    {"rating": "B1", "score_min": 650, "score_max": 700, "risk_fa": "پایین تا متوسط",
     "label_fa": "قابل قبول", "description_fa": "سابقه مثبت، اما با نوسانات جزئی در پرداخت‌ها."},
    {"rating": "B2", "score_min": 600, "score_max": 650, "risk_fa": "متوسط",
     "label_fa": "متوسط", "description_fa": "احتمال نیاز به ضامن معتبرتر یا وثیقه نقدی."},
    {"rating": "B3", "score_min": 550, "score_max": 600, "risk_fa": "متوسط به بالا",
     "label_fa": "احتیاط", "description_fa": "وجود برخی تاخیرهای کوتاه در سوابق اخیر."},
    {"rating": "C1", "score_min": 500, "score_max": 550, "risk_fa": "بالا",
     "label_fa": "ضعیف", "description_fa": "سوابق منفی یا تعداد زیاد استعلام‌های ناموفق."},
    {"rating": "C2", "score_min": 400, "score_max": 500, "risk_fa": "بسیار بالا",
     "label_fa": "بسیار ضعیف", "description_fa": "احتمال رد درخواست وام بسیار بالاست."},
    {"rating": "D",  "score_min": 0,   "score_max": 399, "risk_fa": "بحرانی",
     "label_fa": "بحرانی", "description_fa": "دارای چک برگشتی رفع سوء‌اثر نشده یا معوقات سنگین."},
]

GROUPS = [
    {"group": "A", "score_min": 700, "score_max": 900,
     "label_fa": "عالی", "color": "#22C55E",
     "subtiers": ["A1", "A2", "A3"],
     "description_fa": "بهترین شرایط — حداکثر وام با کمترین محدودیت"},
    {"group": "B", "score_min": 550, "score_max": 700,
     "label_fa": "خوب", "color": "#3B82F6",
     "subtiers": ["B1", "B2", "B3"],
     "description_fa": "گزینه‌های خوب — ممکن است ضامن لازم باشد"},
    {"group": "C", "score_min": 400, "score_max": 550,
     "label_fa": "محدود", "color": "#F59E0B",
     "subtiers": ["C1", "C2"],
     "description_fa": "گزینه‌های محدود — نیاز به وثیقه یا ضامن قوی"},
    {"group": "D", "score_min": 0,   "score_max": 399,
     "label_fa": "بحرانی", "color": "#EF4444",
     "subtiers": ["D"],
     "description_fa": "دسترسی بسیار محدود — نیاز به اصلاح سابقه اعتباری"},
]


# ── Schemas ──────────────────────────────────────────────────────────────────

class PersianLoanChatRequest(BaseModel):
    credit_score: int = Field(..., ge=0, le=900, description="Numeric credit score 0–900")
    max_amount: float | None = Field(None, gt=0, description="Max loan amount in million toman")
    no_guarantor: bool = Field(False, description="Only return guarantor-free loans")
    message: str = Field("وام مناسب من کدام است؟", max_length=500)


class LoanResult(BaseModel):
    loan_name_fa: str
    bank_name_fa: str
    max_amount_million: float | None
    interest_rate_pct: float | None
    has_guarantor: bool
    calculation_method: str | None
    accepted_credit_ratings: list
    features: list
    repayment_periods_months: list
    relevance_score: float
    eligible: bool = True
    min_required_score: int | None = None


class PersianLoanChatResponse(BaseModel):
    credit_score: int
    credit_sub_tier: str
    results: list[LoanResult]
    answer: str
    tools_used: list[str]


# ── Score → sub-tier helper ──────────────────────────────────────────────────

def _score_to_subtier(score: int) -> str:
    for tier in CREDIT_TIERS:
        if score >= tier["score_min"]:
            return tier["rating"]
    return "D"


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/credit-guide")
def get_credit_guide():
    """Return the full 9-tier credit rating reference. Public endpoint."""
    return {
        "groups": GROUPS,
        "tiers": CREDIT_TIERS,
        "source": "سیستم رتبه‌بندی اعتباری ایران (معراج / ضمان / کارا)",
    }


@router.get("/stats")
def get_persian_loan_stats(db: Session = Depends(get_db)):
    """Return summary stats about the loan vector database. Public endpoint."""
    from database.models import LoanBank, LoanChunk, LoanProduct

    chunk_count = db.query(LoanChunk).count()
    bank_count = db.query(LoanBank).filter(LoanBank.is_active == True).count()
    product_count = db.query(LoanProduct).filter(LoanProduct.is_active == True).count()

    return {
        "embedded_loan_products": chunk_count,
        "active_banks": bank_count,
        "active_loan_products": product_count,
        "is_ready": chunk_count > 0,
        "message": (
            "وام‌یار آماده است" if chunk_count > 0
            else "جدول loan_chunks خالی است. لطفاً scripts/sync_persian_loan_vectors.py را اجرا کنید."
        ),
    }


@router.post("/chat", response_model=PersianLoanChatResponse)
async def persian_loan_chat(
    req: PersianLoanChatRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Credit-aware loan recommendation via pgvector RAG.
    Returns top-5 matching loans + an LLM-generated explanation.
    Requires authentication (viewer role or above).
    """
    from openai import OpenAI

    from config.settings import OPENROUTER_API_KEY, RAG_CHAT_MODEL
    from rag.tools.loans import persian_loan_rag_search

    sub_tier = _score_to_subtier(req.credit_score)

    # 1. Vector search
    raw_results = persian_loan_rag_search(
        db=db,
        credit_score=req.credit_score,
        max_amount_million=req.max_amount,
        no_guarantor=req.no_guarantor,
        preferences=req.message,
    )

    import json
    search_data = json.loads(raw_results)

    if "error" in search_data:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=search_data["error"])

    results = search_data.get("results", [])

    # 2. Generate Farsi explanation via LLM
    answer = ""
    if results and OPENROUTER_API_KEY:
        try:
            client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY)
            results_summary = json.dumps(results, ensure_ascii=False, indent=2)
            prompt = (
                f"کاربر امتیاز اعتباری {req.credit_score} (رتبه {sub_tier}) دارد.\n"
                f"درخواست: {req.message}\n\n"
                f"نتایج جستجوی وام:\n{results_summary}\n\n"
                "لطفاً در ۳–۵ جمله فارسی توضیح بده. "
                "وام‌هایی که eligible=true هستند مستقیماً قابل دریافت‌اند. "
                "وام‌هایی که eligible=false هستند نیاز به ارتقای رتبه اعتباری دارند — حتماً این را ذکر کن. "
                f"رتبه اعتباری کاربر {sub_tier} است، نه چیز دیگر."
            )
            resp = client.chat.completions.create(
                model=RAG_CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "تو یک مشاور تسهیلات بانکی هستی. پاسخ فارسی و مختصر بده."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=400,
            )
            answer = resp.choices[0].message.content or ""
        except Exception as e:
            logger.warning("LLM explanation failed (non-fatal): %s", e)
            answer = f"برای رتبه اعتباری {sub_tier} (امتیاز {req.credit_score})، {len(results)} وام مناسب یافت شد."

    if not answer:
        answer = f"برای رتبه اعتباری {sub_tier} (امتیاز {req.credit_score})، {len(results)} وام مناسب یافت شد."

    loan_results = [LoanResult(**r) for r in results]

    return PersianLoanChatResponse(
        credit_score=req.credit_score,
        credit_sub_tier=sub_tier,
        results=loan_results,
        answer=answer,
        tools_used=["persian_loan_rag_search"],
    )
