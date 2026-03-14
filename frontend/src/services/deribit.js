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
