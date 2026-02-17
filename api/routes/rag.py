"""
RAG & Chat endpoints: search, chat, status, process, upload, documents
"""
import hashlib
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from api.deps import get_db
from database.models import PDFDocument, DocumentChunk
from api.schemas import (
    RAGSearchRequest, RAGSearchResponse, RAGSearchResult,
    RAGChatRequest, RAGChatResponse,
    RAGStatusResponse, RAGProcessResponse, RAGUploadResponse,
    RAGDocumentSchema,
    ChatRequest, ChatResponse, ModelsResponse, ModelInfo,
)

router = APIRouter(tags=["rag"])


# ── RAG Search & Chat ────────────────────────────────────────────────────────

@router.post("/api/rag/search", response_model=RAGSearchResponse)
def rag_search(req: RAGSearchRequest, db: Session = Depends(get_db)):
    """Semantic search over embedded financial report chunks"""
    try:
        from rag.pipeline import search
        results = search(db, query=req.query, top_k=req.top_k, symbol=req.symbol)
        return RAGSearchResponse(
            query=req.query,
            results=[RAGSearchResult(**r) for r in results],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="RAG search failed") from e


@router.post("/api/rag/chat", response_model=RAGChatResponse)
def rag_chat(req: RAGChatRequest, db: Session = Depends(get_db)):
    """RAG chat: retrieve context + LLM answer with source citations"""
    try:
        from rag.chat import chat
        result = chat(db, message=req.message, symbol=req.symbol, top_k=req.top_k)
        return RAGChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail="RAG chat failed") from e


@router.get("/api/rag/status", response_model=RAGStatusResponse)
def rag_status(db: Session = Depends(get_db)):
    """Get RAG pipeline status and statistics"""
    try:
        from rag.pipeline import get_status
        return RAGStatusResponse(**get_status(db))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch RAG status") from e


@router.post("/api/rag/process", response_model=RAGProcessResponse)
def rag_process(background_tasks: BackgroundTasks):
    """Trigger RAG pipeline manually (runs in background)"""

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
def rag_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    symbol: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Upload a document (PDF, TXT, etc.) for RAG processing"""
    MAX_SIZE = 50 * 1024 * 1024  # 50 MB

    content = file.file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50 MB limit")

    file_hash = hashlib.sha256(content).hexdigest()
    existing = db.query(PDFDocument).filter(PDFDocument.download_hash == file_hash).first()
    if existing:
        raise HTTPException(status_code=409, detail="Document already uploaded")

    try:
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
        dest = upload_dir / f"{doc.id}_{file.filename}"
        dest.write_bytes(content)
        doc.file_path = str(dest)
        doc.status = "downloaded"
        db.commit()
        db.refresh(doc)
    except HTTPException:
        raise
    except Exception as e:
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
def rag_documents(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
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
def rag_delete_document(doc_id: int, db: Session = Depends(get_db)):
    """Delete an uploaded RAG document (upload source only)"""
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
def get_chat_models():
    """Get available LLM models for chat"""
    from config.settings import AVAILABLE_MODELS, RAG_CHAT_MODEL
    return ModelsResponse(
        models=[ModelInfo(**m) for m in AVAILABLE_MODELS],
        default=RAG_CHAT_MODEL,
    )


@router.post("/api/chat", response_model=ChatResponse)
def chat_with_tools(req: ChatRequest, db: Session = Depends(get_db)):
    """Multi-turn chat with tool calling and live database access"""
    try:
        from rag.tool_executor import run_chat_with_tools
        messages = [{"role": m.role, "content": m.content or ""} for m in req.messages]
        result = run_chat_with_tools(
            db=db,
            messages=messages,
            model=req.model,
            symbol=req.symbol,
            top_k=req.top_k,
        )
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Chat failed") from e
