"""
RAG Pipeline Orchestrator — scan, download, extract, chunk, embed, store.
"""

import logging
from pathlib import Path

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from database.models import DocumentChunk, PDFDocument
from rag.chunker import create_chunks
from rag.downloader import download_pending, scan_new_announcements
from rag.embedder import embed_query, embed_texts
from rag.extractor import extract_text, get_page_count

logger = logging.getLogger(__name__)


def _extract_one(doc: PDFDocument, session: Session) -> int:
    """Extract text from a single downloaded PDF and create chunks.

    Returns 1 on success, 0 on failure. Sets doc.status accordingly.
    """
    doc.status = "extracting"
    session.flush()

    try:
        pages = extract_text(doc.file_path)
        if not pages:
            doc.status = "failed"
            doc.error_message = "No text extracted from PDF"
            return 0

        doc.page_count = get_page_count(doc.file_path)
        chunks = create_chunks(pages, source_file=Path(doc.file_path).name)
        if not chunks:
            doc.status = "failed"
            doc.error_message = "No chunks created from text"
            return 0

        for chunk_data in chunks:
            session.add(
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=chunk_data["chunk_index"],
                    content=chunk_data["text"],
                    content_tokens=len(chunk_data["text"]),
                    page_numbers=chunk_data["page_numbers"],
                )
            )

        doc.status = "extracted"
        logger.info(f"Extracted doc {doc.id}: {len(chunks)} chunks")
        return 1

    except Exception as e:
        doc.status = "failed"
        doc.error_message = f"Extraction error: {e}"
        logger.error(f"Extraction failed for doc {doc.id}: {e}")
        return 0


def _embed_one(doc: PDFDocument, session: Session) -> int:
    """Generate and store embeddings for a single extracted document.

    Returns 1 on success, 0 on failure. Sets doc.status accordingly.
    """
    doc.status = "embedding"
    session.flush()

    try:
        chunks = (
            session.query(DocumentChunk)
            .filter(DocumentChunk.document_id == doc.id)
            .order_by(DocumentChunk.chunk_index)
            .all()
        )
        if not chunks:
            doc.status = "failed"
            doc.error_message = "No chunks found for embedding"
            return 0

        texts = [c.content for c in chunks]
        embeddings = embed_texts(texts)
        for chunk, emb in zip(chunks, embeddings, strict=True):
            chunk.embedding = emb.tolist()

        doc.status = "embedded"
        logger.info(f"Embedded doc {doc.id}: {len(chunks)} chunks")
        return 1

    except Exception as e:
        doc.status = "failed"
        doc.error_message = f"Embedding error: {e}"
        logger.error(f"Embedding failed for doc {doc.id}: {e}")
        return 0


def _extract_documents(session: Session, batch_size: int = 10) -> int:
    """Extract text from downloaded PDFs."""
    docs = (
        session.query(PDFDocument)
        .filter(PDFDocument.status == "downloaded")
        .order_by(PDFDocument.id)
        .limit(batch_size)
        .all()
    )
    if not docs:
        return 0

    count = sum(_extract_one(doc, session) for doc in docs)
    session.flush()
    logger.info(f"Extracted {count}/{len(docs)} documents")
    return count


def _embed_documents(session: Session, batch_size: int = 5) -> int:
    """Generate and store embeddings for extracted documents."""
    docs = (
        session.query(PDFDocument)
        .filter(PDFDocument.status == "extracted")
        .order_by(PDFDocument.id)
        .limit(batch_size)
        .all()
    )
    if not docs:
        return 0

    count = sum(_embed_one(doc, session) for doc in docs)
    session.flush()
    logger.info(f"Embedded {count}/{len(docs)} documents")
    return count


def process_new_documents(session: Session, batch_size: int = 20) -> dict:
    """
    Full pipeline: scan -> download -> extract -> chunk -> embed -> store.
    Returns stats dict.
    """
    stats = {"scanned": 0, "downloaded": 0, "extracted": 0, "embedded": 0}

    # 1. Scan for new announcements
    new_docs = scan_new_announcements(session, batch_size=batch_size)
    stats["scanned"] = len(new_docs)
    session.commit()

    # 2. Download pending PDFs
    stats["downloaded"] = download_pending(session, batch_size=batch_size)
    session.commit()

    # 3. Extract text and create chunks
    stats["extracted"] = _extract_documents(session, batch_size=batch_size)
    session.commit()

    # 4. Generate embeddings
    stats["embedded"] = _embed_documents(session, batch_size=batch_size)
    session.commit()

    logger.info(f"Pipeline complete: {stats}")
    return stats


def process_single_document(session: Session, doc_id: int) -> dict:
    """Process a single document through extract -> chunk -> embed pipeline.

    Used by the upload endpoint to process a newly uploaded document.
    """
    doc = session.query(PDFDocument).filter(PDFDocument.id == doc_id).first()
    if not doc:
        logger.error(f"Document {doc_id} not found")
        return {"status": "error", "message": "Document not found"}

    stats = {"extracted": 0, "embedded": 0}

    if doc.status == "downloaded":
        stats["extracted"] = _extract_one(doc, session)
        session.commit()
        if doc.status == "failed":
            return {"status": "failed", "message": doc.error_message}

    if doc.status == "extracted":
        stats["embedded"] = _embed_one(doc, session)
        session.commit()
        if doc.status == "failed":
            return {"status": "failed", "message": doc.error_message}

    return {"status": doc.status, "stats": stats}


def search(
    session: Session, query: str, top_k: int = 5, symbol: str = None
) -> list[dict]:
    """
    Semantic search over document chunks using pgvector cosine distance.

    Returns list of {content, similarity, title, symbol, page_numbers, source_url, document_id}.
    """
    query_embedding = embed_query(query)

    # Build raw SQL for pgvector cosine distance search
    embedding_str = "[" + ",".join(str(x) for x in query_embedding.tolist()) + "]"

    symbol_filter = "AND pd.symbol = :symbol" if symbol else ""
    sql = text(
        "SELECT "
        "  dc.id, dc.content, dc.page_numbers, dc.chunk_index, "
        "  pd.id AS document_id, pd.title, pd.symbol, pd.source_url, "
        "  1 - (dc.embedding <=> CAST(:embedding AS vector)) AS similarity "
        "FROM document_chunks dc "
        "JOIN pdf_documents pd ON dc.document_id = pd.id "
        "WHERE pd.status = 'embedded' "
        "  AND dc.embedding IS NOT NULL "
        f"  {symbol_filter} "
        "ORDER BY dc.embedding <=> CAST(:embedding AS vector) "
        "LIMIT :top_k"
    )

    params = {"embedding": embedding_str, "top_k": top_k}
    if symbol:
        params["symbol"] = symbol

    rows = session.execute(sql, params).fetchall()

    results = []
    for row in rows:
        results.append(
            {
                "chunk_id": row.id,
                "content": row.content,
                "page_numbers": row.page_numbers,
                "chunk_index": row.chunk_index,
                "document_id": row.document_id,
                "title": row.title,
                "symbol": row.symbol,
                "source_url": row.source_url,
                "similarity": float(row.similarity) if row.similarity else 0,
            }
        )

    return results


def get_status(session: Session) -> dict:
    """Get pipeline statistics."""
    total = session.query(func.count(PDFDocument.id)).scalar() or 0
    by_status = dict(
        session.query(PDFDocument.status, func.count(PDFDocument.id))
        .group_by(PDFDocument.status)
        .all()
    )
    total_chunks = session.query(func.count(DocumentChunk.id)).scalar() or 0
    chunks_with_embedding = (
        session.query(func.count(DocumentChunk.id))
        .filter(DocumentChunk.embedding.isnot(None))
        .scalar()
        or 0
    )

    return {
        "total_documents": total,
        "pending": by_status.get("pending", 0),
        "downloading": by_status.get("downloading", 0),
        "downloaded": by_status.get("downloaded", 0),
        "extracting": by_status.get("extracting", 0),
        "extracted": by_status.get("extracted", 0),
        "embedding": by_status.get("embedding", 0),
        "embedded": by_status.get("embedded", 0),
        "failed": by_status.get("failed", 0),
        "total_chunks": total_chunks,
        "chunks_with_embedding": chunks_with_embedding,
    }
