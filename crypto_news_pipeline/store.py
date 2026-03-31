"""
Storage layer — MinIO for raw article text, PostgreSQL + pgvector for chunks and embeddings.
Standalone: uses its own MinIO client and DB session (same pattern as the main app).
"""

import gzip
import hashlib
import io
import logging
import time
from datetime import UTC, datetime, timedelta

from minio import Minio
from minio.error import S3Error
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    create_engine,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .config import (
    DATABASE_URL,
    MINIO_ACCESS_KEY,
    MINIO_BUCKET,
    MINIO_ENDPOINT,
    MINIO_NEWS_PREFIX,
    MINIO_SECRET_KEY,
    MINIO_SECURE,
    OPENAI_EMBEDDING_DIMENSIONS,
)

logger = logging.getLogger(__name__)

# ── pgvector support ─────────────────────────────────────────────────────────

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None
    logger.warning("pgvector not installed — embeddings stored as JSONB fallback")

Base = declarative_base()


# ── ORM Models ───────────────────────────────────────────────────────────────


def _utcnow():
    return datetime.now(UTC)


class CryptoNewsArticle(Base):
    """Article-level metadata + MinIO reference for raw text."""

    __tablename__ = "crypto_news_articles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    url = Column(String(500), nullable=False, unique=True)
    url_hash = Column(String(64), nullable=False, unique=True, index=True)
    title = Column(Text, nullable=False)
    source = Column(String(100), nullable=False)
    source_tier = Column(SmallInteger, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=False)
    fetched_at = Column(DateTime(timezone=True), default=_utcnow)
    minio_key = Column(Text, nullable=True, comment="MinIO key for gzipped raw text")

    # Article-level sentiment (aggregated from chunks)
    article_score = Column(Float, nullable=True)
    article_confidence = Column(Float, nullable=True)
    cryptopanic_sentiment = Column(String(20), nullable=True)
    n_chunks = Column(Integer, nullable=True)

    __table_args__ = (
        Index("idx_cna_published", "published_at", postgresql_using="brin"),
        Index("idx_cna_source", "source"),
    )


class CryptoNewsChunk(Base):
    """Chunk with embedding, sentiment scores, and coin mentions."""

    __tablename__ = "crypto_news_chunks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    url_hash = Column(String(64), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    total_chunks = Column(Integer, nullable=False)

    # Metadata
    source = Column(String(100), nullable=False)
    source_tier = Column(SmallInteger, nullable=False)
    title = Column(Text, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=False)
    coins_mentioned = Column(JSONB, default=list)

    # Sentiment
    raw_positive = Column(Float, nullable=True)
    raw_negative = Column(Float, nullable=True)
    raw_neutral = Column(Float, nullable=True)
    sentiment_score = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    low_confidence = Column(Boolean, nullable=True)
    model_used = Column(String(20), nullable=True)
    source_weight = Column(Float, nullable=True)
    weighted_score = Column(Float, nullable=True)

    # Embedding (pgvector or JSONB fallback)
    embedding = (
        Column(Vector(OPENAI_EMBEDDING_DIMENSIONS))
        if Vector
        else Column(JSONB, nullable=True)
    )

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        Index("idx_cnc_url_chunk", "url_hash", "chunk_index", unique=True),
        Index("idx_cnc_published", "published_at", postgresql_using="brin"),
        Index("idx_cnc_source", "source"),
        Index("idx_cnc_coins", "coins_mentioned", postgresql_using="gin"),
        *(
            [
                Index(
                    "idx_cnc_embedding_hnsw",
                    "embedding",
                    postgresql_using="hnsw",
                    postgresql_with={"m": 16, "ef_construction": 64},
                    postgresql_ops={"embedding": "vector_cosine_ops"},
                ),
            ]
            if Vector
            else []
        ),
    )


# ── MinIO client (standalone, mirrors main app pattern) ──────────────────────


class NewsMinIOClient:
    """Thin MinIO wrapper for the news pipeline. Non-fatal on all failures."""

    def __init__(self):
        self._client: Minio | None = None

    def _get_client(self) -> Minio:
        if self._client is None:
            if not MINIO_ACCESS_KEY or not MINIO_SECRET_KEY:
                raise ValueError("MINIO_ACCESS_KEY / MINIO_SECRET_KEY required")
            self._client = Minio(
                MINIO_ENDPOINT,
                access_key=MINIO_ACCESS_KEY,
                secret_key=MINIO_SECRET_KEY,
                secure=MINIO_SECURE,
            )
        return self._client

    def ensure_bucket(self):
        try:
            client = self._get_client()
            if not client.bucket_exists(MINIO_BUCKET):
                client.make_bucket(MINIO_BUCKET)
                logger.info(f"Created MinIO bucket: {MINIO_BUCKET}")
        except Exception as exc:
            logger.warning(f"MinIO bucket check failed: {exc}")

    def upload_raw_text(self, source: str, url_hash: str, raw_text: str) -> str | None:
        """Gzip and upload raw article text. Returns MinIO key or None."""
        key = f"{MINIO_NEWS_PREFIX}/{source}/{url_hash}.txt.gz"
        try:
            client = self._get_client()
            data = gzip.compress(raw_text.encode("utf-8"))
            client.put_object(
                MINIO_BUCKET,
                key,
                io.BytesIO(data),
                length=len(data),
                content_type="application/gzip",
            )
            logger.debug(f"MinIO: uploaded {key} ({len(data)} bytes)")
            return key
        except Exception as exc:
            logger.warning(f"MinIO upload failed for {key}: {exc}")
            return None

    def download_raw_text(self, minio_key: str) -> str | None:
        """Download and decompress raw article text."""
        try:
            client = self._get_client()
            resp = client.get_object(MINIO_BUCKET, minio_key)
            data = gzip.decompress(resp.read())
            resp.close()
            return data.decode("utf-8")
        except Exception as exc:
            logger.warning(f"MinIO download failed for {minio_key}: {exc}")
            return None

    def exists(self, key: str) -> bool:
        try:
            client = self._get_client()
            client.stat_object(MINIO_BUCKET, key)
            return True
        except S3Error as exc:
            if exc.code == "NoSuchKey":
                return False
            return False
        except Exception:
            return False


# ── Database session factory ─────────────────────────────────────────────────


class NewsDB:
    """Standalone DB manager for the news pipeline."""

    def __init__(self, database_url: str | None = None):
        self._url = database_url or DATABASE_URL
        if not self._url:
            raise ValueError("DATABASE_URL required")
        self._engine = create_engine(
            self._url,
            pool_size=3,
            max_overflow=5,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        self._session_factory = sessionmaker(bind=self._engine)

    def create_tables(self):
        """Create pipeline-specific tables (safe to call multiple times)."""
        # Ensure pgvector extension exists
        with self._engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        Base.metadata.create_all(self._engine)
        logger.info("News pipeline tables created/verified")

    def session(self) -> Session:
        return self._session_factory()

    def close(self):
        self._engine.dispose()


# ── Store operations ─────────────────────────────────────────────────────────


class NewsStore:
    """High-level storage operations combining MinIO + PostgreSQL."""

    def __init__(self, db: NewsDB | None = None, minio: NewsMinIOClient | None = None):
        self.db = db or NewsDB()
        self.minio = minio or NewsMinIOClient()

    def init(self):
        """Ensure tables and bucket exist."""
        self.db.create_tables()
        self.minio.ensure_bucket()

    def get_seen_hashes(self) -> set[str]:
        """Return all url_hashes already in the database."""
        session = self.db.session()
        try:
            rows = session.query(CryptoNewsArticle.url_hash).all()
            return {r[0] for r in rows}
        finally:
            session.close()

    def upsert_article(self, article: dict, raw_text: str) -> CryptoNewsArticle | None:
        """Insert or skip an article. Uploads raw text to MinIO."""
        session = self.db.session()
        try:
            # Check if already exists
            exists = (
                session.query(CryptoNewsArticle.id)
                .filter(CryptoNewsArticle.url_hash == article["url_hash"])
                .first()
            )
            if exists:
                return None

            # Upload raw text to MinIO
            minio_key = self.minio.upload_raw_text(
                article["source"], article["url_hash"], raw_text
            )

            record = CryptoNewsArticle(
                url=article["url"],
                url_hash=article["url_hash"],
                title=article["title"],
                source=article["source"],
                source_tier=article["source_tier"],
                published_at=article["published_at"],
                minio_key=minio_key,
                cryptopanic_sentiment=article.get("cryptopanic_sentiment"),
            )
            session.add(record)
            session.commit()
            return record
        except Exception as exc:
            session.rollback()
            logger.error(f"Failed to upsert article {article.get('url', '?')}: {exc}")
            return None
        finally:
            session.close()

    def upsert_chunks(self, chunks: list[dict], vectors: list[list[float]] | None = None):
        """Insert scored chunks with optional embeddings. Skips existing."""
        if not chunks:
            return 0

        session = self.db.session()
        inserted = 0
        try:
            for i, chunk in enumerate(chunks):
                # Check if chunk already exists
                exists = (
                    session.query(CryptoNewsChunk.id)
                    .filter(
                        CryptoNewsChunk.url_hash == chunk["url_hash"],
                        CryptoNewsChunk.chunk_index == chunk["chunk_index"],
                    )
                    .first()
                )
                if exists:
                    continue

                embedding = vectors[i] if vectors and i < len(vectors) else None

                record = CryptoNewsChunk(
                    url_hash=chunk["url_hash"],
                    chunk_index=chunk["chunk_index"],
                    chunk_text=chunk["chunk_text"],
                    total_chunks=chunk["total_chunks"],
                    source=chunk["source"],
                    source_tier=chunk["source_tier"],
                    title=chunk["title"],
                    published_at=chunk["published_at"],
                    coins_mentioned=chunk.get("coins_mentioned", []),
                    raw_positive=chunk.get("raw_positive"),
                    raw_negative=chunk.get("raw_negative"),
                    raw_neutral=chunk.get("raw_neutral"),
                    sentiment_score=chunk.get("sentiment_score"),
                    confidence=chunk.get("confidence"),
                    low_confidence=chunk.get("low_confidence"),
                    model_used=chunk.get("model_used"),
                    source_weight=chunk.get("source_weight"),
                    weighted_score=chunk.get("weighted_score"),
                    embedding=embedding,
                )
                session.add(record)
                inserted += 1

            session.commit()
            logger.info(f"Inserted {inserted} chunks (skipped {len(chunks) - inserted} existing)")
        except Exception as exc:
            session.rollback()
            logger.error(f"Chunk upsert failed: {exc}")
        finally:
            session.close()
        return inserted

    def update_article_sentiment(self, url_hash: str, article_agg: dict):
        """Update article record with aggregated sentiment scores."""
        session = self.db.session()
        try:
            article = (
                session.query(CryptoNewsArticle)
                .filter(CryptoNewsArticle.url_hash == url_hash)
                .first()
            )
            if article:
                article.article_score = article_agg.get("article_score")
                article.article_confidence = article_agg.get("article_confidence")
                article.n_chunks = article_agg.get("n_chunks")
                session.commit()
        except Exception as exc:
            session.rollback()
            logger.error(f"Failed to update article sentiment: {exc}")
        finally:
            session.close()

    # ── Query functions ──────────────────────────────────────────────────────

    def query(self, query_text: str, embedder, top_k: int = 10) -> list[dict]:
        """Semantic search — embed query and find most similar chunks."""
        vector = embedder.embed_single(query_text)
        session = self.db.session()
        try:
            if Vector:
                results = (
                    session.query(CryptoNewsChunk)
                    .filter(CryptoNewsChunk.embedding.isnot(None))
                    .order_by(CryptoNewsChunk.embedding.cosine_distance(vector))
                    .limit(top_k)
                    .all()
                )
            else:
                # Fallback: recent chunks (no vector search without pgvector)
                logger.warning("pgvector not available — returning recent chunks")
                results = (
                    session.query(CryptoNewsChunk)
                    .order_by(CryptoNewsChunk.published_at.desc())
                    .limit(top_k)
                    .all()
                )

            return [
                {
                    "chunk_text": r.chunk_text,
                    "title": r.title,
                    "source": r.source,
                    "published_at": r.published_at.isoformat() if r.published_at else None,
                    "coins_mentioned": r.coins_mentioned or [],
                    "sentiment_score": r.sentiment_score,
                    "confidence": r.confidence,
                    "weighted_score": r.weighted_score,
                    "url_hash": r.url_hash,
                }
                for r in results
            ]
        finally:
            session.close()

    def query_coin_chunks(
        self, coin: str, hours: int = 4, top_k: int = 50
    ) -> list[dict]:
        """Get all chunks mentioning a coin within a time window."""
        cutoff = datetime.now(UTC) - timedelta(hours=hours)
        session = self.db.session()
        try:
            results = (
                session.query(CryptoNewsChunk)
                .filter(
                    CryptoNewsChunk.coins_mentioned.contains([coin]),
                    CryptoNewsChunk.published_at >= cutoff,
                )
                .order_by(CryptoNewsChunk.published_at.desc())
                .limit(top_k)
                .all()
            )
            return [
                {
                    "chunk_text": r.chunk_text,
                    "url": r.url_hash,
                    "url_hash": r.url_hash,
                    "title": r.title,
                    "source": r.source,
                    "published_at": r.published_at,
                    "coins_mentioned": r.coins_mentioned or [],
                    "sentiment_score": r.sentiment_score,
                    "confidence": r.confidence,
                    "weighted_score": r.weighted_score,
                    "chunk_index": r.chunk_index,
                    "total_chunks": r.total_chunks,
                }
                for r in results
            ]
        finally:
            session.close()

    def compute_coin_sentiment(self, coin: str, window_hours: int = 4) -> dict:
        """Full coin sentiment: query chunks then aggregate."""
        from .sentiment import compute_coin_sentiment

        chunks = self.query_coin_chunks(coin, hours=window_hours)
        return compute_coin_sentiment(chunks, coin, window_hours=window_hours)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    # Quick test: ensure tables exist
    store = NewsStore()
    store.init()
    print("Tables created successfully.")
    print(f"Seen hashes: {len(store.get_seen_hashes())}")
