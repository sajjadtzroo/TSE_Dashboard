"""
Tests for Issue 2: RAG documents endpoint authentication.
Verifies all RAG endpoints enforce auth correctly.
"""
import pytest
from unittest.mock import MagicMock, patch

from api.main import app
from api.deps import get_db
from api.auth import get_current_user, require_role


class TestRagDocumentsAuth:
    """GET /api/rag/documents now requires authentication."""

    def test_documents_rejects_unauthenticated(self, unauthed_client):
        """Unauthenticated request to /api/rag/documents should fail."""
        resp = unauthed_client.get("/api/rag/documents")
        assert resp.status_code in (401, 403)

    def test_documents_accepts_authenticated_viewer(self, authed_client, mock_db):
        """Authenticated viewer should get 200 from /api/rag/documents."""
        mock_db.query.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
        resp = authed_client.get("/api/rag/documents")
        assert resp.status_code == 200
        assert resp.json() == []


class TestRagUploadAuth:
    """POST /api/rag/upload requires analyst role."""

    def test_upload_rejects_viewer(self, authed_client):
        """Viewer role should be rejected from upload (403)."""
        resp = authed_client.post(
            "/api/rag/upload",
            files={"file": ("test.pdf", b"%PDF-1.4 test", "application/pdf")},
        )
        assert resp.status_code == 403

    def test_upload_not_forbidden_for_analyst(self, analyst_client):
        """Analyst role should not get 403 from upload endpoint."""
        resp = analyst_client.post(
            "/api/rag/upload",
            files={"file": ("test.pdf", b"%PDF-1.4 test", "application/pdf")},
        )
        # May fail due to DB/processing issues, but should NOT be 403
        assert resp.status_code != 403


class TestRagDeleteAuth:
    """DELETE /api/rag/documents/{id} requires analyst role."""

    def test_delete_rejects_viewer(self, authed_client):
        """Viewer role should be rejected from delete (403)."""
        resp = authed_client.delete("/api/rag/documents/1")
        assert resp.status_code == 403


class TestRagSearchChatAuth:
    """Search and chat endpoints require auth."""

    def test_search_requires_auth(self, unauthed_client):
        """POST /api/rag/search without token should fail."""
        resp = unauthed_client.post(
            "/api/rag/search",
            json={"query": "test", "top_k": 5},
        )
        assert resp.status_code in (401, 403)

    def test_chat_requires_auth(self, unauthed_client):
        """POST /api/rag/chat without token should fail."""
        resp = unauthed_client.post(
            "/api/rag/chat",
            json={"message": "test"},
        )
        assert resp.status_code in (401, 403)
