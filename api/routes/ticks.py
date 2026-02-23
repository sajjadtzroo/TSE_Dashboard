"""
Real-time tick data endpoints — powered by TimescaleDB hypertable.

REST endpoints
--------------
GET /api/ticks/snapshot            — latest price per active symbol
GET /api/ticks/{symbol}            — last N raw ticks (default 200)
GET /api/ticks/{symbol}/ohlcv      — OHLCV bars from continuous aggregates

WebSocket
---------
WS  /ws/ticks                      — live push via tse:live:ticks Redis channel
"""

import logging
import datetime as _dt

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.auth import authenticate_ws
from api.deps import get_db
from api.routes.ws import ConnectionManager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ticks"])

# Dedicated manager — subscribes to the channel published by tick_ingestor
ticks_manager = ConnectionManager("tse:live:ticks", "Ticks WS")

# Map of allowed OHLCV interval strings → continuous aggregate view names
_OHLCV_VIEWS = {
    "1min": "ohlcv_1min",
    "5min": "ohlcv_5min",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _resolve_security(db: Session, symbol: str) -> int:
    """Return security_id for an active symbol, or raise 404."""
    row = db.execute(
        text(
            "SELECT security_id FROM securities "
            "WHERE symbol = :sym AND is_active = TRUE LIMIT 1"
        ),
        {"sym": symbol.upper()},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found")
    return row.security_id


# ── REST endpoints ────────────────────────────────────────────────────────────

@router.get("/api/ticks/snapshot")
def get_tick_snapshot(db: Session = Depends(get_db)):
    """
    Latest tick per active TSE symbol — queries the hypertable directly.
    Returns an empty list outside market hours when no ticks exist today.
    """
    sql = text("""
        SELECT
            s.symbol,
            t.price,
            t.volume,
            t.tick_time
        FROM (
            SELECT DISTINCT ON (security_id)
                security_id, price, volume, tick_time
            FROM tick_trades
            WHERE tick_time >= NOW() - INTERVAL '1 day'
              AND NOT canceled
            ORDER BY security_id, tick_time DESC
        ) t
        JOIN securities s ON s.security_id = t.security_id
        WHERE s.is_active = TRUE
        ORDER BY s.symbol
    """)
    rows = db.execute(sql).fetchall()
    return [
        {
            "symbol": r.symbol,
            "price": float(r.price) if r.price is not None else None,
            "volume": r.volume,
            "tick_time": r.tick_time,
        }
        for r in rows
    ]


@router.get("/api/ticks/{symbol}")
def get_ticks(
    symbol: str,
    limit: int = Query(default=200, ge=1, le=5000),
    trade_date: _dt.date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Last N raw ticks for a symbol from the TimescaleDB hypertable.
    Defaults to the most recent trading date with data.
    """
    sec_id = _resolve_security(db, symbol)

    if trade_date is None:
        date_row = db.execute(
            text("SELECT MAX(date) FROM tick_trades WHERE security_id = :sid"),
            {"sid": sec_id},
        ).fetchone()
        trade_date = date_row[0] if date_row else None

    if trade_date is None:
        return []

    rows = db.execute(
        text("""
            SELECT row_num, time, tick_time, price, volume, canceled
            FROM tick_trades
            WHERE security_id = :sid
              AND date = :dt
            ORDER BY tick_time DESC
            LIMIT :lim
        """),
        {"sid": sec_id, "dt": trade_date, "lim": limit},
    ).fetchall()

    return [
        {
            "row_num": r.row_num,
            "time": r.time,
            "tick_time": r.tick_time,
            "price": float(r.price) if r.price is not None else None,
            "volume": r.volume,
            "canceled": r.canceled,
        }
        for r in rows
    ]


@router.get("/api/ticks/{symbol}/ohlcv")
def get_tick_ohlcv(
    symbol: str,
    interval: str = Query(default="1min", pattern="^(1min|5min)$"),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    OHLCV candlestick bars from TimescaleDB continuous aggregates.
    interval: '1min' (default) or '5min'
    Returns bars in descending order (most recent first).
    """
    sec_id = _resolve_security(db, symbol)
    view = _OHLCV_VIEWS.get(interval)
    if view is None:
        raise HTTPException(status_code=400, detail=f"Unknown interval: {interval}")

    rows = db.execute(
        text(f"""
            SELECT bucket, open, high, low, close, volume, trades
            FROM {view}
            WHERE security_id = :sid
            ORDER BY bucket DESC
            LIMIT :lim
        """),
        {"sid": sec_id, "lim": limit},
    ).fetchall()

    return [
        {
            "bucket": r.bucket,
            "open": float(r.open) if r.open is not None else None,
            "high": float(r.high) if r.high is not None else None,
            "low": float(r.low) if r.low is not None else None,
            "close": float(r.close) if r.close is not None else None,
            "volume": r.volume,
            "trades": r.trades,
        }
        for r in rows
    ]


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws/ticks")
async def websocket_ticks(websocket: WebSocket, token: str = Query(default="")):
    """
    WebSocket endpoint for live tick data.
    Clients receive JSON messages published by tick_ingestor to tse:live:ticks.
    Message shape: { event, date, new_ticks, symbols, ts }
    """
    if await authenticate_ws(websocket, token) is None:
        return

    await ticks_manager.connect(websocket)
    try:
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
    except Exception as e:
        logger.debug(f"Ticks WebSocket error: {e}")
    finally:
        ticks_manager.disconnect(websocket)
