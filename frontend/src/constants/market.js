export const TEDPIX_NAMES = ['شاخص كل', 'شاخص کل', 'TEDPIX'];

// Column accessors that use range (numeric) filters in market tables
export const MARKET_RANGE_FILTER_COLS = ['close', 'close_change_pct', 'volume', 'trades', 'eps'];

// Tehran trading hours
export const TEHRAN_OFFSET_MINUTES = 3.5 * 60; // UTC+3:30
export const MARKET_OPEN_MINUTES = 9 * 60; // 09:00
export const MARKET_CLOSE_MINUTES = 12 * 60 + 30; // 12:30
export const TRADING_DAYS = [0, 1, 2, 3, 6]; // Sun, Mon, Tue, Wed, Sat
