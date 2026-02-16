"""
Order book parser utilities.
Replaces 4-5 duplicate order book level extraction patterns.
"""
import logging
from typing import Dict, Any, Optional
from .type_converters import safe_float, safe_int

logger = logging.getLogger(__name__)


def extract_order_book_levels(
    data: Dict[str, Any],
    max_levels: int = 5,
    key_format: str = "brsapi"
) -> Dict[str, Any]:
    """
    Extract bid/ask order book levels from raw data.

    Supports two formats:
    - BrsApi format: bid_price1, bid_vol1, ask_price1, ask_vol1, etc.
    - TSETMC format: ZD1, QTitD1, ZO1, QTitO1, etc.

    Args:
        data: Raw data containing order book fields
        max_levels: Maximum number of levels to extract (3 or 5)
        key_format: Format of keys - "brsapi" or "tsetmc"

    Returns:
        Dictionary with normalized order book levels:
        {
            'bid_price_1': float, 'bid_vol_1': int, 'bid_count_1': int,
            'ask_price_1': float, 'ask_vol_1': int, 'ask_count_1': int,
            ...
        }

    Examples:
        >>> data = {"bid_price1": "1000", "bid_vol1": "5000", "ask_price1": "1100"}
        >>> result = extract_order_book_levels(data, max_levels=3)
        >>> result['bid_price_1']
        1000.0
    """
    result = {}

    if key_format == "brsapi":
        # BrsApi format: bid_price1, bid_vol1, ask_price1, ask_vol1
        for level in range(1, max_levels + 1):
            # Bid side
            bid_price_key = f'bid_price{level}'
            bid_vol_key = f'bid_vol{level}'
            bid_count_key = f'bid_count{level}'

            result[f'bid_price_{level}'] = safe_float(data.get(bid_price_key))
            result[f'bid_vol_{level}'] = safe_int(data.get(bid_vol_key))
            result[f'bid_count_{level}'] = safe_int(data.get(bid_count_key))

            # Ask side
            ask_price_key = f'ask_price{level}'
            ask_vol_key = f'ask_vol{level}'
            ask_count_key = f'ask_count{level}'

            result[f'ask_price_{level}'] = safe_float(data.get(ask_price_key))
            result[f'ask_vol_{level}'] = safe_int(data.get(ask_vol_key))
            result[f'ask_count_{level}'] = safe_int(data.get(ask_count_key))

    elif key_format == "tsetmc":
        # TSETMC format: ZD1 (demand price), QTitD1 (demand quantity),
        #                 ZO1 (supply price), QTitO1 (supply quantity)
        for level in range(1, max_levels + 1):
            # Demand side (bid)
            result[f'bid_price_{level}'] = safe_float(data.get(f'ZD{level}'))
            result[f'bid_vol_{level}'] = safe_int(data.get(f'QTitD{level}'))
            result[f'bid_count_{level}'] = safe_int(data.get(f'QD{level}'))

            # Supply side (ask)
            result[f'ask_price_{level}'] = safe_float(data.get(f'ZO{level}'))
            result[f'ask_vol_{level}'] = safe_int(data.get(f'QTitO{level}'))
            result[f'ask_count_{level}'] = safe_int(data.get(f'QO{level}'))

    else:
        logger.error(f"Unknown key_format: {key_format}")

    return result


def extract_client_type_data(
    data: Dict[str, Any],
    key_format: str = "brsapi"
) -> Dict[str, Any]:
    """
    Extract real/legal buyer/seller breakdown (client type data).

    Args:
        data: Raw data containing client type fields
        key_format: Format of keys - "brsapi" or "tsetmc"

    Returns:
        Dictionary with client type data:
        {
            'real_buy_count': int,
            'real_buy_volume': int,
            'real_sell_count': int,
            'real_sell_volume': int,
            'legal_buy_count': int,
            'legal_buy_volume': int,
            'legal_sell_count': int,
            'legal_sell_volume': int,
        }

    Examples:
        >>> data = {"real_buyer_count": "100", "real_buyer_volume": "50000"}
        >>> result = extract_client_type_data(data)
        >>> result['real_buy_count']
        100
    """
    result = {}

    if key_format == "brsapi":
        # BrsApi field names
        result['real_buy_count'] = safe_int(data.get('real_buyer_count'))
        result['real_buy_volume'] = safe_int(data.get('real_buyer_volume'))
        result['real_sell_count'] = safe_int(data.get('real_seller_count'))
        result['real_sell_volume'] = safe_int(data.get('real_seller_volume'))

        result['legal_buy_count'] = safe_int(data.get('legal_buyer_count'))
        result['legal_buy_volume'] = safe_int(data.get('legal_buyer_volume'))
        result['legal_sell_count'] = safe_int(data.get('legal_seller_count'))
        result['legal_sell_volume'] = safe_int(data.get('legal_seller_volume'))

    elif key_format == "tsetmc":
        # TSETMC field names (different abbreviations)
        result['real_buy_count'] = safe_int(data.get('buy_CountI'))
        result['real_buy_volume'] = safe_int(data.get('buy_I_Volume'))
        result['real_sell_count'] = safe_int(data.get('sell_CountI'))
        result['real_sell_volume'] = safe_int(data.get('sell_I_Volume'))

        result['legal_buy_count'] = safe_int(data.get('buy_CountN'))
        result['legal_buy_volume'] = safe_int(data.get('buy_N_Volume'))
        result['legal_sell_count'] = safe_int(data.get('sell_CountN'))
        result['legal_sell_volume'] = safe_int(data.get('sell_N_Volume'))

    else:
        logger.error(f"Unknown key_format: {key_format}")

    return result


def calculate_order_book_imbalance(order_book: Dict[str, Any]) -> float:
    """
    Calculate order book imbalance ratio.

    Formula: (total_bid_volume - total_ask_volume) / (total_bid_volume + total_ask_volume)

    Args:
        order_book: Order book data with bid_vol_N and ask_vol_N fields

    Returns:
        Imbalance ratio between -1.0 (all asks) and 1.0 (all bids)

    Examples:
        >>> ob = {'bid_vol_1': 1000, 'ask_vol_1': 500}
        >>> calculate_order_book_imbalance(ob)
        0.333...
    """
    total_bid = 0
    total_ask = 0

    # Sum all bid and ask volumes
    for level in range(1, 6):
        bid_vol = order_book.get(f'bid_vol_{level}', 0) or 0
        ask_vol = order_book.get(f'ask_vol_{level}', 0) or 0
        total_bid += bid_vol
        total_ask += ask_vol

    # Calculate imbalance
    total_volume = total_bid + total_ask
    if total_volume == 0:
        return 0.0

    imbalance = (total_bid - total_ask) / total_volume
    return imbalance
