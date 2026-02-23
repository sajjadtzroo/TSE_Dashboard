"""
MinIO object storage service.
Thin wrapper around the minio Python client with key-naming helpers
for all file types in the TSE Dashboard (Codal, RAG PDFs, uploads).
"""

import io
import logging
from datetime import timedelta

from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)

# Codal letter_type values that represent financial statements
FINANCIAL_LETTER_TYPES = {6, 56, 57, 130}


# ── Key helpers ──────────────────────────────────────────────────────────────

def codal_file_key(symbol: str, letter_type: int, letter_serial: str, ext: str) -> str:
    """
    Key for a Codal announcement file (PDF or Excel).
    e.g. codal/IKCO/financial/12345678901234567890.pdf
    """
    folder = "financial" if letter_type in FINANCIAL_LETTER_TYPES else "disclosure"
    safe = _safe(letter_serial)
    return f"codal/{symbol}/{folder}/{safe}.{ext}"


def codal_raw_key(symbol: str, letter_serial: str, ext: str = "html.gz") -> str:
    """
    Key for a raw Codal HTML snapshot.
    e.g. codal/IKCO/raw/12345678901234567890.html.gz
    """
    safe = _safe(letter_serial)
    return f"codal/{symbol}/raw/{safe}.{ext}"


def rag_pdf_key(symbol: str, hash16: str) -> str:
    """
    Key for a RAG pipeline PDF.
    e.g. rag/pdfs/IKCO/a1b2c3d4e5f6g7h8.pdf
    """
    return f"rag/pdfs/{symbol or 'unknown'}/{hash16}.pdf"


def upload_key(doc_id: str, filename: str) -> str:
    """
    Key for a user-uploaded document (loan OCR, RAG upload, etc.).
    e.g. rag/uploads/abc123_statement.pdf
    """
    safe = _safe(filename, allow_dots=True)
    return f"rag/uploads/{doc_id}_{safe}"


def _safe(name: str, allow_dots: bool = False) -> str:
    """Replace filesystem-unsafe chars, keep only alphanumeric + safe set."""
    import re
    pattern = r"[^a-zA-Z0-9_\-.]" if allow_dots else r"[^a-zA-Z0-9_\-]"
    return re.sub(pattern, "_", str(name))


# ── Storage client ───────────────────────────────────────────────────────────

class MinIOStorage:
    """
    Lazy-connecting MinIO client.  All methods are safe to call even when
    MinIO is unavailable — failures are logged as warnings, not raised, so
    the rest of the application keeps working.
    """

    def __init__(self):
        self._client: Minio | None = None
        self._bucket: str | None = None

    def _get_client(self) -> tuple[Minio, str]:
        if self._client is None:
            from config.settings import (
                MINIO_ACCESS_KEY,
                MINIO_BUCKET,
                MINIO_ENDPOINT,
                MINIO_SECRET_KEY,
                MINIO_SECURE,
            )
            self._client = Minio(
                MINIO_ENDPOINT,
                access_key=MINIO_ACCESS_KEY,
                secret_key=MINIO_SECRET_KEY,
                secure=MINIO_SECURE,
            )
            self._bucket = MINIO_BUCKET
        return self._client, self._bucket

    def ensure_bucket(self) -> None:
        """Create the bucket if it does not exist.  Call at app startup."""
        try:
            client, bucket = self._get_client()
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
                logger.info(f"MinIO: created bucket '{bucket}'")
            else:
                logger.info(f"MinIO: bucket '{bucket}' already exists")
        except Exception as exc:
            logger.warning(f"MinIO: could not ensure bucket — {exc}")

    def upload(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str | None:
        """
        Upload *data* bytes under *key*.
        Returns the key on success, None on failure.
        """
        try:
            client, bucket = self._get_client()
            client.put_object(
                bucket,
                key,
                io.BytesIO(data),
                length=len(data),
                content_type=content_type,
            )
            logger.debug(f"MinIO: uploaded {key} ({len(data)} bytes)")
            return key
        except Exception as exc:
            logger.warning(f"MinIO: upload failed for {key} — {exc}")
            return None

    def upload_file(self, key: str, file_path: str, content_type: str = "application/octet-stream") -> str | None:
        """
        Upload a file from disk under *key*.
        More efficient than upload() for large files — uses streaming.
        Returns the key on success, None on failure.
        """
        try:
            client, bucket = self._get_client()
            client.fput_object(bucket, key, file_path, content_type=content_type)
            logger.debug(f"MinIO: uploaded file {file_path} → {key}")
            return key
        except Exception as exc:
            logger.warning(f"MinIO: file upload failed for {key} — {exc}")
            return None

    def presigned_url(self, key: str, expires_seconds: int = 3600) -> str | None:
        """
        Generate a presigned GET URL valid for *expires_seconds*.
        Returns the URL string or None if the key doesn't exist / MinIO is down.
        """
        try:
            client, bucket = self._get_client()
            url = client.presigned_get_object(
                bucket,
                key,
                expires=timedelta(seconds=expires_seconds),
            )
            return url
        except Exception as exc:
            logger.warning(f"MinIO: presigned URL failed for {key} — {exc}")
            return None

    def delete(self, key: str) -> bool:
        """Delete an object.  Returns True on success."""
        try:
            client, bucket = self._get_client()
            client.remove_object(bucket, key)
            return True
        except Exception as exc:
            logger.warning(f"MinIO: delete failed for {key} — {exc}")
            return False

    def exists(self, key: str) -> bool:
        """Return True if the object exists in the bucket."""
        try:
            client, bucket = self._get_client()
            client.stat_object(bucket, key)
            return True
        except S3Error as exc:
            if exc.code == "NoSuchKey":
                return False
            logger.warning(f"MinIO: exists check failed for {key} — {exc}")
            return False
        except Exception as exc:
            logger.warning(f"MinIO: exists check failed for {key} — {exc}")
            return False


# Module-level singleton — import this everywhere
storage = MinIOStorage()
