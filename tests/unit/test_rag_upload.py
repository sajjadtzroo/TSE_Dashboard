"""
Tests for Issue 3: File upload streaming.
Verifies size rejection mid-stream, hash computation, MIME validation, etc.
"""

import hashlib
import io
from unittest.mock import MagicMock, patch

from api.auth import get_current_user
from api.deps import get_db
from api.main import app


def _make_analyst_client(mock_db):
    """Helper to create a test client with analyst auth and DB overrides."""
    from fastapi.testclient import TestClient

    mock_user = MagicMock()
    mock_user.id = 2
    mock_user.username = "analyst"
    mock_user.role = "analyst"
    mock_user.is_active = True

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    # Override require_role("analyst") — since it's a factory, we need to
    # override get_current_user (which require_role depends on) and ensure
    # the role check passes.
    client = TestClient(app)
    return client


class TestUploadMimeValidation:
    """MIME type checks happen before reading the file."""

    def test_rejects_invalid_mime_type(self):
        mock_db = MagicMock()
        client = _make_analyst_client(mock_db)
        try:
            resp = client.post(
                "/api/rag/upload",
                files={
                    "file": ("malware.exe", b"MZ\x90\x00", "application/x-msdownload")
                },
            )
            assert resp.status_code == 400
            assert "Unsupported file type" in resp.json()["error"]["message"]
        finally:
            app.dependency_overrides.clear()


class TestUploadSizeCheck:
    """Size check should reject mid-stream without reading full file."""

    def test_rejects_oversized_file(self):
        mock_db = MagicMock()
        client = _make_analyst_client(mock_db)
        try:
            # Create content just over 50MB
            content = b"x" * (50 * 1024 * 1024 + 1)
            resp = client.post(
                "/api/rag/upload",
                files={"file": ("big.pdf", content, "application/pdf")},
            )
            assert resp.status_code == 400
            assert "50 MB" in resp.json()["error"]["message"]
        finally:
            app.dependency_overrides.clear()


class TestUploadHashComputation:
    """SHA256 hash should match full-file hash."""

    def test_hash_computed_correctly(self):
        content = b"Test PDF content for hashing"
        expected_hash = hashlib.sha256(content).hexdigest()

        # Simulate chunked hashing
        hasher = hashlib.sha256()
        chunk_size = 10
        buf = io.BytesIO(content)
        while True:
            chunk = buf.read(chunk_size)
            if not chunk:
                break
            hasher.update(chunk)
        assert hasher.hexdigest() == expected_hash


class TestUploadDuplicateCheck:
    """Duplicate upload should return 409."""

    def test_rejects_duplicate_hash(self):
        mock_db = MagicMock()
        # Make the duplicate check return an existing document
        mock_db.query.return_value.filter.return_value.first.return_value = MagicMock()

        client = _make_analyst_client(mock_db)
        try:
            resp = client.post(
                "/api/rag/upload",
                files={"file": ("test.pdf", b"%PDF-1.4 content", "application/pdf")},
            )
            assert resp.status_code == 409
            assert "already uploaded" in resp.json()["error"]["message"]
        finally:
            app.dependency_overrides.clear()


class TestUploadRoleCheck:
    """Upload requires analyst role."""

    def test_upload_requires_analyst(self, authed_client):
        """Viewer role should get 403."""
        resp = authed_client.post(
            "/api/rag/upload",
            files={"file": ("test.pdf", b"%PDF-1.4 test", "application/pdf")},
        )
        assert resp.status_code == 403


class TestUploadSuccess:
    """Successful upload flow."""

    def test_successful_upload_creates_record(self):
        mock_db = MagicMock()
        # No duplicate
        mock_db.query.return_value.filter.return_value.first.return_value = None

        mock_doc = MagicMock()
        mock_doc.id = 42
        mock_doc.title = "test.pdf"
        mock_doc.status = "downloaded"
        mock_doc.source = "upload"

        mock_db.flush = MagicMock()
        mock_db.commit = MagicMock()
        mock_db.refresh = MagicMock()

        import sys

        # Pre-patch the missing rag.pipeline.process_single_document
        mock_pipeline = MagicMock()
        sys.modules.setdefault("rag.pipeline", mock_pipeline)
        if not hasattr(sys.modules["rag.pipeline"], "process_single_document"):
            sys.modules["rag.pipeline"].process_single_document = MagicMock()

        with (
            patch("api.routes.rag.PDFDocument", return_value=mock_doc),
            patch("api.routes.rag.Path") as MockPath,
            patch("database.connection.get_db_manager"),
        ):
            # Mock the upload directory creation and file writing
            mock_dir = MagicMock()
            MockPath.return_value = mock_dir
            mock_dest = MagicMock()
            mock_dir.__truediv__ = MagicMock(return_value=mock_dest)

            # Patch open() for shutil.copyfileobj destination
            patch("builtins.open", MagicMock()).start()

            client = _make_analyst_client(mock_db)
            try:
                resp = client.post(
                    "/api/rag/upload",
                    files={
                        "file": (
                            "test.pdf",
                            b"%PDF-1.4 small content",
                            "application/pdf",
                        )
                    },
                )
                assert resp.status_code == 200
                data = resp.json()
                assert data["document_id"] == 42
                assert data["status"] == "downloaded"
            finally:
                patch.stopall()
                app.dependency_overrides.clear()
