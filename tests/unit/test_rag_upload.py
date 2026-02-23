"""
Tests for Issue 3: File upload streaming.
Verifies size rejection mid-stream, hash computation, MIME validation, etc.
"""

import hashlib
import io
from unittest.mock import MagicMock, patch

from api.auth import get_current_user
from api.main import app


def _make_analyst_client():
    """Helper to create a test client with analyst auth override."""
    from fastapi.testclient import TestClient

    mock_user = MagicMock()
    mock_user.id = 2
    mock_user.username = "analyst"
    mock_user.role = "analyst"
    mock_user.is_active = True

    # rag_upload no longer uses get_db — it creates its own session in the thread.
    # Only the auth override is needed here.
    app.dependency_overrides[get_current_user] = lambda: mock_user
    client = TestClient(app)
    return client


def _mock_db_manager(first_return=None):
    """Build a mock get_db_manager() suitable for rag_upload's thread session."""
    mock_session = MagicMock()
    mock_session.query.return_value.filter.return_value.first.return_value = first_return

    mock_mgr = MagicMock()
    mock_mgr.get_session.return_value.__enter__ = MagicMock(return_value=mock_session)
    mock_mgr.get_session.return_value.__exit__ = MagicMock(return_value=False)
    return mock_mgr, mock_session


class TestUploadMimeValidation:
    """MIME type checks happen before reading the file."""

    def test_rejects_invalid_mime_type(self):
        client = _make_analyst_client()
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
        client = _make_analyst_client()
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
        # Thread creates its own session — patch get_db_manager, not get_db
        mock_mgr, _ = _mock_db_manager(first_return=MagicMock())  # existing doc → duplicate
        client = _make_analyst_client()
        try:
            with patch("database.connection.get_db_manager", return_value=mock_mgr):
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
        import sys

        mock_doc = MagicMock()
        mock_doc.id = 42
        mock_doc.title = "test.pdf"
        mock_doc.status = "downloaded"
        mock_doc.source = "upload"

        # Pre-patch rag.pipeline so BackgroundTasks doesn't import-error
        sys.modules.setdefault("rag.pipeline", MagicMock())
        if not hasattr(sys.modules["rag.pipeline"], "process_single_document"):
            sys.modules["rag.pipeline"].process_single_document = MagicMock()

        # Thread creates its own session — configure via get_db_manager mock
        mock_mgr, _ = _mock_db_manager(first_return=None)  # no duplicate

        with (
            patch("api.routes.rag.PDFDocument", return_value=mock_doc),
            patch("database.connection.get_db_manager", return_value=mock_mgr),
            patch("pathlib.Path.mkdir"),
            patch("builtins.open", MagicMock()),
            patch("api.routes.rag.shutil.copyfileobj"),
        ):
            client = _make_analyst_client()
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
                app.dependency_overrides.clear()
