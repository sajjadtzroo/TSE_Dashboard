"""
Tools endpoints: Codal announcements
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from api.deps import get_db
from database.models import CodalAnnouncement
from api.schemas import CodalAnnouncementSchema

router = APIRouter(prefix="/api", tags=["tools"])


@router.get("/codal", response_model=List[CodalAnnouncementSchema])
def get_codal(
    symbol: Optional[str] = None,
    category: Optional[int] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get Codal announcements, paginated"""
    try:
        query = db.query(CodalAnnouncement)
        if symbol:
            query = query.filter(CodalAnnouncement.symbol == symbol)
        if category is not None:
            query = query.filter(CodalAnnouncement.category == category)

        query = query.order_by(CodalAnnouncement.id.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        return query.all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch Codal announcements") from e
