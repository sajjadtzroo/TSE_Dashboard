"""
RAG & Chat endpoints: search, chat, status, process, upload, documents
Protected: search/chat require trader, upload/process/delete require trader, admin
"""

import hashlib
import shutil
import tempfile
from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from pydantic import BaseModel
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy.orm import Session

from api.auth import get_current_user, get_current_user_optional, require_role
from api.deps import get_db
from api.schemas import (
    ChatMessageOut,
    ChatMessageSave,
    ChatRequest,
    ChatResponse,
    ChatSessionCreate,
    ChatSessionDetail,
    ChatSessionOut,
    ModelInfo,
    ModelsResponse,
    RAGChatRequest,
    RAGChatResponse,
    RAGDocumentSchema,
    RAGProcessResponse,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGSearchResult,
    RAGStatusResponse,
    RAGUploadResponse,
)
from database.models import DocumentChunk, PDFDocument

router = APIRouter(tags=["rag"])

# Allowed MIME types for upload
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


# ── RAG Search & Chat ────────────────────────────────────────────────────────


@router.post("/api/rag/search", response_model=RAGSearchResponse)
async def rag_search(
    req: RAGSearchRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Semantic search over embedded financial report chunks (authenticated)"""
    import asyncio
    import json as _json

    from api.cache import cache_manager

    # Check Redis cache
    params_hash = cache_manager.hash_params(query=req.query, top_k=req.top_k, symbol=req.symbol)
    if cache_manager.available:
        cached = cache_manager.get("rag", "search", params_hash)
        if cached is not None:
            try:
                data = _json.loads(cached)
                from fastapi.responses import JSONResponse
                return JSONResponse(content=data, headers={"X-Cache": "HIT"})
            except (ValueError, TypeError):
                pass

    try:
        from rag.pipeline import search

        results = await asyncio.to_thread(
            search, db, query=req.query, top_k=req.top_k, symbol=req.symbol
        )
        response = RAGSearchResponse(
            query=req.query,
            results=[RAGSearchResult(**r) for r in results],
        )

        # Store in Redis
        if cache_manager.available:
            try:
                ttl = cache_manager.get_dynamic_ttl(trading_ttl=300, off_hours_ttl=3600)
                cache_manager.set(
                    "rag", "search", params_hash,
                    _json.dumps(response.model_dump(), default=str),
                    ttl, tags=["rag_search"],
                )
            except Exception:
                pass

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail="RAG search failed") from e


@router.post("/api/rag/chat", response_model=RAGChatResponse)
async def rag_chat(
    req: RAGChatRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """RAG chat: retrieve context + LLM answer with source citations (public).
    Now routes through the multi-agent system instead of the legacy single-turn pipeline.
    """
    try:
        from rag.tool_executor import async_run_chat_with_tools

        messages = [{"role": "user", "content": req.message}]
        result = await async_run_chat_with_tools(
            db=db,
            messages=messages,
            symbol=req.symbol,
            top_k=req.top_k,
            user_id=_user.id if _user else None,
        )
        return RAGChatResponse(answer=result["answer"], sources=result.get("sources", []))
    except Exception as e:
        raise HTTPException(status_code=500, detail="RAG chat failed") from e


class _FinancialAnalysisRequest(BaseModel):
    symbol: str
    statement_type: str = "income_statement"
    period_months: int | None = None
    is_audited: bool = False
    is_consolidated: bool = False


class _FinancialAnalysisResponse(BaseModel):
    analysis: str
    data_points: dict
    model: str


@router.post("/api/rag/financial-analysis", response_model=_FinancialAnalysisResponse)
async def financial_analysis(
    req: _FinancialAnalysisRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Run CFA-style financial analysis for a symbol and statement type.

    Body: { symbol, statement_type?, period_months?, is_audited?, is_consolidated? }
    Returns: { analysis: str, data_points: dict, model: str }
    """
    try:
        from config.settings import FINANCIAL_ANALYSIS_MODEL
        from rag.agents import get_agent
        from rag.tool_executor import _get_async_client

        agent = get_agent("financial_analysis")
        client = _get_async_client()
        model = FINANCIAL_ANALYSIS_MODEL

        messages = [
            {
                "role": "user",
                "content": (
                    f"Analyze symbol: {req.symbol}"
                    + f" | statement_type: {req.statement_type}"
                    + (f" | period_months: {req.period_months}" if req.period_months else "")
                    + (f" | audited_only: true" if req.is_audited else "")
                    + (f" | consolidated: true" if req.is_consolidated else "")
                    + "\n\nCall get_multi_statement_data first, then provide full CFA analysis in Persian. "
                    + "If both consolidated and non-consolidated data exist, prefer consolidated (تلفیقی)."
                ),
            }
        ]

        result = await agent.arun(
            client=client,
            db=db,
            messages=messages,
            model=model,
            symbol=req.symbol,
        )

        return _FinancialAnalysisResponse(
            analysis=result.get("answer", ""),
            data_points={
                "tools_used": result.get("tools_used", []),
                "sources_count": len(result.get("sources", [])),
            },
            model=result.get("model", model),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Financial analysis failed") from e


class _RatioExplainRequest(BaseModel):
    ratio_name: str
    ratio_name_en: str


class _RatioExplainResponse(BaseModel):
    explanation: str
    sources: list[dict]


@router.post("/api/rag/ratio-explain", response_model=_RatioExplainResponse)
async def ratio_explain(
    req: _RatioExplainRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Explain a financial ratio using CFA curriculum documents from the vector DB.

    Body: { ratio_name: str (Persian), ratio_name_en: str (English) }
    Returns: { explanation: str, sources: list[{title, page_numbers}] }
    Cached in Redis for 86400s — ratio definitions don't change.
    """
    import asyncio
    import json as _json

    from api.cache import cache_manager

    cache_key = f"ratio:{req.ratio_name_en.lower().replace(' ', '_')}"

    if cache_manager.available:
        cached = cache_manager.get("rag", "ratio_explain", cache_key)
        if cached is not None:
            try:
                from fastapi.responses import JSONResponse
                return JSONResponse(content=_json.loads(cached), headers={"X-Cache": "HIT"})
            except (ValueError, TypeError):
                pass

    try:
        from rag.tools.cfa import search_cfa_documents
        from config.settings import FINANCIAL_ANALYSIS_MODEL
        from rag.tool_executor import _get_async_client

        query = f"{req.ratio_name_en} formula interpretation analysis CFA"
        raw_json = await asyncio.to_thread(search_cfa_documents, db, query, 3)
        results = _json.loads(raw_json).get("results", [])

        context_parts = [
            f"[{r['title']} — ص.{r['page_numbers']}]\n{r['content']}"
            for r in results
            if r.get("content")
        ]
        context = "\n\n".join(context_parts) if context_parts else ""

        client = _get_async_client()
        prompt = (
            f"نسبت مالی: {req.ratio_name} ({req.ratio_name_en})\n\n"
            f"بر اساس متون CFA زیر، یک توضیح مختصر (۳–۵ جمله) درباره این نسبت، فرمول محاسبه، "
            f"و کاربرد آن در تحلیل مالی ارائه بده. به فارسی پاسخ بده.\n\n"
            f"منابع CFA:\n{context if context else 'منبع مرتبطی یافت نشد.'}"
        )

        resp = await client.chat.completions.create(
            model=FINANCIAL_ANALYSIS_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.3,
        )
        explanation = resp.choices[0].message.content.strip()

        sources = [
            {"title": r.get("title", ""), "page_numbers": r.get("page_numbers", "")}
            for r in results
        ]

        result = {"explanation": explanation, "sources": sources}

        if cache_manager.available:
            try:
                cache_manager.set(
                    "rag", "ratio_explain", cache_key,
                    _json.dumps(result, ensure_ascii=False),
                    86400,
                    tags=["rag_ratio_explain"],
                )
            except Exception:
                pass

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail="Ratio explanation failed") from e


@router.get("/api/rag/status", response_model=RAGStatusResponse)
async def rag_status(db: Session = Depends(get_db)):
    """Get RAG pipeline status and statistics"""
    import asyncio

    try:
        from rag.pipeline import get_status

        status = await asyncio.to_thread(get_status, db)
        return RAGStatusResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch RAG status") from e


@router.post("/api/rag/process", response_model=RAGProcessResponse)
def rag_process(
    background_tasks: BackgroundTasks,
    _user=Depends(require_role("trader")),
):
    """Trigger RAG pipeline manually (analyst+ only)"""

    def _run_pipeline():
        from database.connection import get_db_manager
        from rag.pipeline import process_new_documents

        mgr = get_db_manager()
        with mgr.get_session() as session:
            process_new_documents(session)

    background_tasks.add_task(_run_pipeline)
    return RAGProcessResponse(
        status="started",
        message="RAG pipeline started in background.",
    )


# ── Document Upload & Management ─────────────────────────────────────────────


@router.post("/api/rag/upload", response_model=RAGUploadResponse)
async def rag_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(None),
    symbol: str | None = Form(None),
    doc_category: str = Form("codal"),
    _user=Depends(require_role("trader")),
):
    """Upload a document (PDF, TXT, etc.) for RAG processing (analyst+ only)"""
    import asyncio

    _VALID_CATEGORIES = {"codal", "cfa", "research", "other"}
    if doc_category not in _VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid doc_category: {doc_category}. Allowed: {', '.join(sorted(_VALID_CATEGORIES))}",
        )
    CHUNK_SIZE = 65536  # 64 KB
    MAX_SIZE = 50 * 1024 * 1024  # 50 MB

    # MIME type validation — reject missing or disallowed content types.
    # Note: content_type comes from the multipart part header set by the client;
    # if absent (None) we refuse rather than trust the file extension.
    if not file.content_type or file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type!r}. Allowed: PDF, TXT, DOCX",
        )

    # Sanitize filename before thread — Path.name strips any directory components
    safe_name = Path(file.filename).name if file.filename else "upload"

    # Stream file in chunks: check size incrementally, compute hash incrementally
    hasher = hashlib.sha256()
    total_size = 0
    tmp = tempfile.SpooledTemporaryFile(
        max_size=1024 * 1024
    )  # spool up to 1MB in memory
    result = None
    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_SIZE:
                raise HTTPException(status_code=400, detail="File exceeds 50 MB limit")
            hasher.update(chunk)
            tmp.write(chunk)

        file_hash = hasher.hexdigest()
        doc_title = title or file.filename or "Untitled"
        upload_source_url = f"upload://{file.filename}"

        def _sync_db_and_write():
            # Opens its own session — sync Session must not cross thread boundaries
            from database.connection import get_db_manager

            with get_db_manager().get_session() as session:
                existing = (
                    session.query(PDFDocument)
                    .filter(PDFDocument.download_hash == file_hash)
                    .first()
                )
                if existing:
                    return {"error": "duplicate"}

                new_doc = PDFDocument(
                    title=doc_title,
                    symbol=symbol,
                    status="pending",
                    download_hash=file_hash,
                    source_url=upload_source_url,
                    source="upload",
                    doc_category=doc_category,
                )
                session.add(new_doc)
                session.flush()  # assigns new_doc.id

                upload_dir = Path("data/uploads")
                upload_dir.mkdir(parents=True, exist_ok=True)
                dest = upload_dir / f"{new_doc.id}_{safe_name}"
                # Defense-in-depth: ensure dest stays within upload_dir
                if not dest.resolve().is_relative_to(upload_dir.resolve()):
                    raise ValueError("Invalid filename")
                tmp.seek(0)
                with open(dest, "wb") as f_out:
                    shutil.copyfileobj(tmp, f_out)

                new_doc.file_path = str(dest)
                new_doc.status = "downloaded"
                # Capture scalars before session expires them on commit
                return {"id": new_doc.id, "title": new_doc.title, "status": new_doc.status}
            # get_session() context manager commits + closes here

        try:
            result = await asyncio.to_thread(_sync_db_and_write)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Upload failed") from e

        if result.get("error") == "duplicate":
            raise HTTPException(status_code=409, detail="Document already uploaded")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Upload failed") from e
    finally:
        tmp.close()

    def _process(doc_id: int):
        from database.connection import get_db_manager
        from rag.pipeline import process_single_document

        mgr = get_db_manager()
        with mgr.get_session() as session:
            process_single_document(session, doc_id)

    background_tasks.add_task(_process, result["id"])
    return RAGUploadResponse(
        document_id=result["id"],
        title=result["title"],
        status=result["status"],
        message="Document uploaded and queued for processing.",
    )


@router.get("/api/rag/documents", response_model=list[RAGDocumentSchema])
def rag_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    doc_category: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """List all RAG documents with pagination and optional category filter"""
    try:
        q = db.query(PDFDocument)
        if doc_category:
            q = q.filter(PDFDocument.doc_category == doc_category)
        docs = q.order_by(PDFDocument.id.desc()).offset(skip).limit(limit).all()
        return docs
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch documents") from e


@router.delete("/api/rag/documents/{doc_id}")
def rag_delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_role("trader")),
):
    """Delete an uploaded RAG document (analyst+ only, upload source only)"""
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.source != "upload":
        raise HTTPException(
            status_code=403, detail="Only uploaded documents can be deleted"
        )
    try:
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).delete()
        db.delete(doc)
        db.commit()
        return {"status": "deleted", "document_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete document") from e


@router.get("/api/rag/documents/{doc_id}/download")
def rag_download_document(
    doc_id: int,
    expires: int = Query(default=3600, ge=60, le=86400),
    db: Session = Depends(get_db),
    _user=Depends(require_role("viewer")),
):
    """
    Generate a presigned MinIO URL for a RAG PDF document and redirect to it.
    expires: link lifetime in seconds (default 3600).
    """
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.minio_key:
        raise HTTPException(status_code=404, detail="Document not yet in object storage")

    from api.services_storage import storage
    url = storage.presigned_url(doc.minio_key, expires_seconds=expires)
    if not url:
        raise HTTPException(status_code=503, detail="Object storage unavailable")
    return RedirectResponse(url=url, status_code=302)


# ── Chat Endpoints ───────────────────────────────────────────────────────────


@router.get("/api/chat/models", response_model=ModelsResponse)
async def get_chat_models():
    """Get available LLM models for chat"""
    from config.settings import AVAILABLE_MODELS, RAG_CHAT_MODEL

    return ModelsResponse(
        models=[ModelInfo(**m) for m in AVAILABLE_MODELS],
        default=RAG_CHAT_MODEL,
    )


@router.post("/api/chat", response_model=ChatResponse)
async def chat_with_tools(
    req: ChatRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Multi-turn chat with tool calling and live database access"""
    try:
        from rag.tool_executor import async_run_chat_with_tools

        messages = [{"role": m.role, "content": m.content or ""} for m in req.messages]
        result = await async_run_chat_with_tools(
            db=db,
            messages=messages,
            model=req.model,
            symbol=req.symbol,
            top_k=req.top_k,
            user_id=_user.id if _user else None,
        )
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Chat failed") from e


@router.post("/api/chat/stream")
async def chat_stream(
    req: ChatRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Streaming chat with SSE progress events and final response."""
    import asyncio
    import json as _json

    from rag.tool_executor import async_run_chat_with_tools

    queue: asyncio.Queue = asyncio.Queue()

    async def _progress_callback(stage: str, data: dict):
        if stage == "token":
            # Forward streaming tokens directly
            await queue.put(("token", data))
        else:
            await queue.put(("status", {"stage": stage, **data}))

    async def _run_agent():
        try:
            messages = [
                {"role": m.role, "content": m.content or ""} for m in req.messages
            ]
            result = await async_run_chat_with_tools(
                db=db,
                messages=messages,
                model=req.model,
                symbol=req.symbol,
                top_k=req.top_k,
                progress_callback=_progress_callback,
                user_id=_user.id if _user else None,
            )
            # The answer has already been streamed token-by-token via progress_callback.
            # Send done event with metadata only.
            await queue.put(
                (
                    "done",
                    {
                        "sources": result.get("sources", []),
                        "tools_used": result.get("tools_used", []),
                        "model": result.get("model", ""),
                        "intent": result.get("intent"),
                        "confidence": result.get("confidence"),
                        "download_urls": result.get("download_urls", []),
                    },
                )
            )
        except Exception as e:
            await queue.put(("error", {"message": str(e)}))
        finally:
            await queue.put(None)  # sentinel

    async def _generate():
        task = asyncio.create_task(_run_agent())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                event_type, data = item
                yield f"event: {event_type}\ndata: {_json.dumps(data)}\n\n"
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Chat Session Management ──────────────────────────────────────────────────


@router.get("/api/chat/sessions", response_model=list[ChatSessionOut])
def list_chat_sessions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    """List chat sessions for the current user"""
    if not user:
        return []
    from database.models import ChatSession

    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id, ChatSession.is_active == True)
        .order_by(ChatSession.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return sessions


@router.post("/api/chat/sessions", response_model=ChatSessionOut)
def create_chat_session(
    req: ChatSessionCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    """Create a new chat session"""
    if not user:
        raise HTTPException(status_code=401, detail="Login required to save sessions")
    from database.models import ChatSession

    session = ChatSession(
        user_id=user.id,
        title=req.title or "New Chat",
        model=req.model,
        symbol=req.symbol,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/api/chat/sessions/{session_id}", response_model=ChatSessionDetail)
def get_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    """Get a chat session with messages"""
    if not user:
        raise HTTPException(status_code=401, detail="Login required to view sessions")
    from database.models import ChatSession

    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/api/chat/sessions/{session_id}")
def delete_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    """Delete a chat session"""
    if not user:
        raise HTTPException(status_code=401, detail="Login required to delete sessions")
    from database.models import ChatSession

    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "deleted", "session_id": session_id}


@router.post(
    "/api/chat/sessions/{session_id}/messages",
    response_model=list[ChatMessageOut],
)
def add_session_messages(
    session_id: int,
    msgs: list[ChatMessageSave],
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    """Save one or more messages to a chat session"""
    if not user:
        raise HTTPException(status_code=401, detail="Login required to save messages")
    from database.models import ChatMessage, ChatSession

    session = (
        db.query(ChatSession)
        .filter(
            ChatSession.id == session_id,
            ChatSession.user_id == user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    saved = []
    for m in msgs:
        msg = ChatMessage(
            session_id=session_id,
            role=m.role,
            content=m.content,
            sources=m.sources,
            tools_used=m.tools_used,
            model=m.model,
        )
        db.add(msg)
        saved.append(msg)

    db.commit()
    for msg in saved:
        db.refresh(msg)
    return saved
