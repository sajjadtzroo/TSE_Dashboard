"""
RAG & Chat endpoints: search, chat, status, process, upload, documents
Protected: search/chat require viewer, upload/process/delete require analyst, admin
"""
import hashlib
import shutil
import tempfile
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from api.deps import get_db
from api.auth import get_current_user, require_role
from database.models import PDFDocument, DocumentChunk
from fastapi.responses import StreamingResponse
from api.schemas import (
    RAGSearchRequest, RAGSearchResponse, RAGSearchResult,
    RAGChatRequest, RAGChatResponse,
    RAGStatusResponse, RAGProcessResponse, RAGUploadResponse,
    RAGDocumentSchema,
    ChatRequest, ChatResponse, ModelsResponse, ModelInfo,
    ChatSessionCreate, ChatSessionOut, ChatSessionDetail, ChatMessageOut,
)

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
    try:
        from rag.pipeline import search
        results = await asyncio.to_thread(search, db, query=req.query, top_k=req.top_k, symbol=req.symbol)
        return RAGSearchResponse(
            query=req.query,
            results=[RAGSearchResult(**r) for r in results],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="RAG search failed") from e


@router.post("/api/rag/chat", response_model=RAGChatResponse)
async def rag_chat(
    req: RAGChatRequest,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """RAG chat: retrieve context + LLM answer with source citations (authenticated)"""
    try:
        from rag.chat import async_chat
        result = await async_chat(db, message=req.message, symbol=req.symbol, top_k=req.top_k)
        return RAGChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail="RAG chat failed") from e


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
    _user=Depends(require_role("analyst")),
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
    title: Optional[str] = Form(None),
    symbol: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    _user=Depends(require_role("analyst")),
):
    """Upload a document (PDF, TXT, etc.) for RAG processing (analyst+ only)"""
    CHUNK_SIZE = 65536  # 64 KB
    MAX_SIZE = 50 * 1024 * 1024  # 50 MB

    # MIME type validation
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, TXT, DOCX",
        )

    # Stream file in chunks: check size incrementally, compute hash incrementally
    hasher = hashlib.sha256()
    total_size = 0
    tmp = tempfile.SpooledTemporaryFile(max_size=1024 * 1024)  # spool up to 1MB in memory
    try:
        while True:
            chunk = await file.read(CHUNK_SIZE)
            if not chunk:
                break
            total_size += len(chunk)
            if total_size > MAX_SIZE:
                tmp.close()
                raise HTTPException(status_code=400, detail="File exceeds 50 MB limit")
            hasher.update(chunk)
            tmp.write(chunk)

        file_hash = hasher.hexdigest()
        existing = db.query(PDFDocument).filter(PDFDocument.download_hash == file_hash).first()
        if existing:
            tmp.close()
            raise HTTPException(status_code=409, detail="Document already uploaded")

        doc_title = title or file.filename or "Untitled"
        upload_source_url = f"upload://{file.filename}"
        doc = PDFDocument(
            title=doc_title,
            symbol=symbol,
            status="pending",
            download_hash=file_hash,
            source_url=upload_source_url,
            source="upload",
        )
        db.add(doc)
        db.flush()

        upload_dir = Path("data/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        # Sanitize filename to prevent path traversal
        safe_name = Path(file.filename).name if file.filename else "upload"
        dest = upload_dir / f"{doc.id}_{safe_name}"
        # Verify resolved path stays within upload_dir
        if not dest.resolve().is_relative_to(upload_dir.resolve()):
            raise HTTPException(status_code=400, detail="Invalid filename")
        tmp.seek(0)
        with open(dest, "wb") as f_out:
            shutil.copyfileobj(tmp, f_out)
        tmp.close()

        doc.file_path = str(dest)
        doc.status = "downloaded"
        db.commit()
        db.refresh(doc)
    except HTTPException:
        raise
    except Exception as e:
        tmp.close()
        raise HTTPException(status_code=500, detail="Upload failed") from e

    def _process(doc_id: int):
        from database.connection import get_db_manager
        from rag.pipeline import process_single_document
        mgr = get_db_manager()
        with mgr.get_session() as session:
            process_single_document(session, doc_id)

    background_tasks.add_task(_process, doc.id)
    return RAGUploadResponse(
        document_id=doc.id,
        title=doc.title,
        status=doc.status,
        message="Document uploaded and queued for processing.",
    )


@router.get("/api/rag/documents", response_model=List[RAGDocumentSchema])
async def rag_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """List all RAG documents with pagination"""
    try:
        docs = db.query(PDFDocument).order_by(PDFDocument.id.desc()).offset(skip).limit(limit).all()
        return [
            RAGDocumentSchema(
                id=doc.id,
                title=doc.title,
                symbol=doc.symbol,
                status=doc.status,
                page_count=doc.page_count,
                created_at=doc.created_at,
                source=doc.source if doc.source else "codal",
            )
            for doc in docs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch documents") from e


@router.delete("/api/rag/documents/{doc_id}")
async def rag_delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    _user=Depends(require_role("analyst")),
):
    """Delete an uploaded RAG document (analyst+ only, upload source only)"""
    doc = db.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.source != "upload":
        raise HTTPException(status_code=403, detail="Only uploaded documents can be deleted")
    try:
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).delete()
        db.delete(doc)
        db.commit()
        return {"status": "deleted", "document_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete document") from e


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
    """Multi-turn chat with tool calling and live database access (authenticated)"""
    try:
        from rag.tool_executor import async_run_chat_with_tools
        messages = [{"role": m.role, "content": m.content or ""} for m in req.messages]
        result = await async_run_chat_with_tools(
            db=db,
            messages=messages,
            model=req.model,
            symbol=req.symbol,
            top_k=req.top_k,
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
    """Streaming chat with SSE events (non-streaming agent, SSE-wrapped response)."""
    import json as _json
    from rag.tool_executor import async_run_chat_with_tools

    async def _generate():
        messages = [{"role": m.role, "content": m.content or ""} for m in req.messages]
        result = await async_run_chat_with_tools(
            db=db, messages=messages, model=req.model,
            symbol=req.symbol, top_k=req.top_k,
        )
        yield f"event: token\ndata: {_json.dumps({'content': result['answer']})}\n\n"
        yield f"event: done\ndata: {_json.dumps({'sources': result.get('sources', []), 'tools_used': result.get('tools_used', []), 'model': result.get('model', '')})}\n\n"

    return StreamingResponse(_generate(), media_type="text/event-stream")


# ── Chat Session Management ──────────────────────────────────────────────────

@router.get("/api/chat/sessions", response_model=List[ChatSessionOut])
async def list_chat_sessions(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """List chat sessions for the current user"""
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
async def create_chat_session(
    req: ChatSessionCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a new chat session"""
    from database.models import ChatSession
    session = ChatSession(
        user_id=user.id,
        title=req.title or 'New Chat',
        model=req.model,
        symbol=req.symbol,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/api/chat/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get a chat session with messages"""
    from database.models import ChatSession
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Delete a chat session"""
    from database.models import ChatSession
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"status": "deleted", "session_id": session_id}
