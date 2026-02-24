"""Download endpoint for generated Excel financial models."""
import re

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from config.settings import EXCEL_MODELS_DIR

router = APIRouter(prefix="/api/financial-modeling", tags=["financial_modeling"])

_UUID4_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
)


@router.get("/download/{file_id}")
async def download_model(file_id: str):
    """Stream a generated .xlsx financial model file."""
    if not _UUID4_RE.match(file_id):
        raise HTTPException(status_code=400, detail="Invalid file ID")

    resolved_dir = EXCEL_MODELS_DIR.resolve()
    file_path = (EXCEL_MODELS_DIR / f"{file_id}.xlsx").resolve()

    if not file_path.is_relative_to(resolved_dir):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Model file not found")

    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="financial_model.xlsx",
        headers={"Content-Disposition": 'attachment; filename="financial_model.xlsx"'},
    )
