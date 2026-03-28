export const DERIBIT_WS_URL = 'wss://www.deribit.com/ws/api/v2';
export const DERIBIT_REST_BASE = 'https://www.deribit.com/api/v2';
// Private channel access token — read from VITE_DERIBIT_ACCESS_TOKEN env var
// Never hardcode credentials in source; set this in .env.local
export const DERIBIT_ACCESS_TOKEN = import.meta.env.VITE_DERIBIT_ACCESS_TOKEN ?? '';

export const DERIBIT_COINS = [
  { symbol: 'BTC',  index: 'btc_usd',  perpetual: 'BTC-PERPETUAL',  name_fa: 'بیت‌کوین' },
  { symbol: 'ETH',  index: 'eth_usd',  perpetual: 'ETH-PERPETUAL',  name_fa: 'اتریوم' },
  { symbol: 'SOL',  index: 'sol_usd',  perpetual: 'SOL-PERPETUAL',  name_fa: 'سولانا' },
  { symbol: 'XRP',  index: 'xrp_usd',  perpetual: 'XRP-PERPETUAL',  name_fa: 'ریپل' },
  { symbol: 'BNB',  index: 'bnb_usd',  perpetual: 'BNB-PERPETUAL',  name_fa: 'بایننس‌کوین' },
  { symbol: 'MATIC', index: 'matic_usd', perpetual: 'MATIC-PERPETUAL', name_fa: 'ماتیک' },
];

/**
 * Call a Deribit public REST endpoint.
 * @param {string} method  e.g. 'public/get_instruments'
 * @param {object} params  query string parameters
 * @returns {Promise<any>} result field from JSON response
 */
export async function deribitRest(method, params = {}) {
  const url = new URL(`${DERIBIT_REST_BASE}/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Deribit REST error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'Deribit API error');
  return json.result;
}

/**
 * Fetch OHLCV candlestick data for any Deribit instrument.
 * @param {string} instrument  e.g. 'BTC-PERPETUAL', 'BTC-28MAR25'
 * @param {string} resolution  '1'|'3'|'5'|'10'|'15'|'30'|'60'|'120'|'180'|'360'|'720'|'1D'
 * @param {number} days        lookback window in calendar days
 */
export async function deribitOHLCV(instrument, resolution = '1D', days = 90) {
  const end = Date.now();
  const start = end - days * 86_400_000;
  return deribitRest('public/get_tradingview_chart_data', {
    instrument_name: instrument,
    start_timestamp: start,
    end_timestamp: end,
    resolution,
  });
}

/**
 * Fetch the historical Deribit Volatility Index (DVOL) for BTC or ETH.
 * @param {string} currency   'BTC' | 'ETH'
 * @param {string} resolution '60'|'3600'|'43200'|'86400'
 * @param {number} days       lookback in days
 */
export async function deribitIVIndex(currency = 'BTC', resolution = '86400', days = 90) {
  const end = Date.now();
  const start = end - days * 86_400_000;
  return deribitRest('public/get_volatility_index_data', {
    currency,
    start_timestamp: start,
    end_timestamp: end,
    resolution,
  });
}

/**
 * Fetch the most recent trades for a specific option contract.
 * @param {string} instrument  e.g. 'BTC-28MAR25-80000-C'
 * @param {number} count       max trades (1–1000)
 */
export async function deribitOptionTrades(instrument, count = 50) {
  return deribitRest('public/get_last_trades_by_instrument', {
    instrument_name: instrument,
    count,
    sorting: 'desc',
  });
}

/**
 * Fetch funding rate history for a perpetual instrument.
 * @param {string} instrument  e.g. 'BTC-PERPETUAL'
 * @param {number} days        lookback window in calendar days
 */
export async function deribitFundingHistory(instrument, days = 30) {
  const end = Date.now();
  const start = end - days * 86_400_000;
  return deribitRest('public/get_funding_rate_history', {
    instrument_name: instrument,
    start_timestamp: start,
    end_timestamp: end,
  });
}
