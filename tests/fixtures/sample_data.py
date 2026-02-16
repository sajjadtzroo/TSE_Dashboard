"""
Sample data generators for testing.
"""
from datetime import date, timedelta
from typing import List

from database.models import Security, DailyOHLCV


def create_test_securities(session) -> List[Security]:
    """
    Create a set of test securities in the database.
    """
    securities = [
        Security(
            ins_code="1234567890123456" + str(i),
            symbol=f"TEST{i}",
            name_fa=f"شرکت تست {i}",
            name_en=f"Test Company {i}",
            type="stock",
            sector_name_fa="فناوری اطلاعات" if i % 2 == 0 else "صنعت",
            market_type="stock_exchange",
            is_active=True,
        )
        for i in range(1, 6)
    ]

    for sec in securities:
        session.add(sec)

    session.flush()  # Get IDs assigned
    return securities


def create_test_ohlcv_data(
    session,
    securities: List[Security],
    days: int = 30
) -> List[DailyOHLCV]:
    """
    Create OHLCV data for test securities.
    """
    records = []
    base_date = date.today() - timedelta(days=days)

    for sec in securities:
        base_price = 1000 * (sec.security_id)

        for day_offset in range(days):
            current_date = base_date + timedelta(days=day_offset)
            price = base_price + (day_offset * 10)

            record = DailyOHLCV(
                security_id=sec.security_id,
                date=current_date,
                open=price,
                high=price * 1.05,
                low=price * 0.95,
                close=price,
                last=price,
                close_change=10.0,
                close_change_pct=1.0,
                volume=1000000 + (day_offset * 1000),
                value=price * (1000000 + (day_offset * 1000)),
                trades=5000 + (day_offset * 10),
            )
            records.append(record)
            session.add(record)

    session.flush()
    return records
