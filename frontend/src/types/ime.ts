/**
 * Type definitions for Iran Mercantile Exchange (IME) data structures.
 * Matches the Pydantic schemas in api/schemas.py.
 *
 * Note: IME prices are integer Rials (BigInteger in DB), not floats.
 */

// ── IME Options ──────────────────────────────────────────────────────────────

export interface IMEOption {
  id: number;
  date: string;
  date_shamsi: string | null;
  contract_category: string | null;
  contract_category_sub: string | null;
  commodity: string | null;
  option_type: 'call' | 'put';
  price_strike: number | null;
  level_strike: number | null;
  contract_id: number | null;
  contract_code: string;
  contract_description: string | null;
  contract_size: number | null;
  date_end: string | null;
  day_remain: number | null;
  margin_initial: number | null;
  margin_required: number | null;
  interest_open: number | null;
  interest_open_change: number | null;
  interest_open_change_pct: number | null;
  settlement_price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  last: number | null;
  last_change: number | null;
  last_change_pct: number | null;
  trades: number | null;
  volume: number | null;
  value: number | null;
  bid_price_1: number | null;
  bid_vol_1: number | null;
  ask_price_1: number | null;
  ask_vol_1: number | null;
  bid_price_2: number | null;
  bid_vol_2: number | null;
  ask_price_2: number | null;
  ask_vol_2: number | null;
  bid_price_3: number | null;
  bid_vol_3: number | null;
  ask_price_3: number | null;
  ask_vol_3: number | null;
}

// ── IME Futures ──────────────────────────────────────────────────────────────

export interface IMEFuture {
  id: number;
  date: string;
  date_shamsi: string | null;
  contract_code: string;
  contract_description: string | null;
  contract_size: number | null;
  contract_size_unit: string | null;
  date_end: string | null;
  day_remain: number | null;
  margin_initial: number | null;
  margin_maintenance: number | null;
  interest_open: number | null;
  interest_open_change: number | null;
  interest_open_change_pct: number | null;
  settlement_price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  last: number | null;
  last_change: number | null;
  last_change_pct: number | null;
  instant_settlement: number | null;
  trades: number | null;
  volume: number | null;
  value: number | null;
  real_buy_count: number | null;
  legal_buy_count: number | null;
  real_sell_count: number | null;
  legal_sell_count: number | null;
  bid_price_1: number | null;
  bid_vol_1: number | null;
  ask_price_1: number | null;
  ask_vol_1: number | null;
  bid_price_2: number | null;
  bid_vol_2: number | null;
  ask_price_2: number | null;
  ask_vol_2: number | null;
  bid_price_3: number | null;
  bid_vol_3: number | null;
  ask_price_3: number | null;
  ask_vol_3: number | null;
}

// ── IME Certificates ─────────────────────────────────────────────────────────

export interface IMECertificate {
  id: number;
  date: string;
  date_shamsi: string | null;
  cert_type: number;
  commodity: string | null;
  contract_code: string;
  contract_description: string | null;
  contract_size: number | null;
  contract_size_unit: string | null;
  isin: string | null;
  symbol: string | null;
  name: string | null;
  settlement_price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  last: number | null;
  last_change: number | null;
  last_change_pct: number | null;
  close: number | null;
  trades: number | null;
  volume: number | null;
  value: number | null;
  bid_price_1: number | null;
  bid_vol_1: number | null;
  ask_price_1: number | null;
  ask_vol_1: number | null;
}

// ── IME Funds ────────────────────────────────────────────────────────────────

export interface IMEFund {
  id: number;
  date: string;
  date_shamsi: string | null;
  isin: string;
  symbol: string | null;
  name: string | null;
  settlement_price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  last: number | null;
  last_change: number | null;
  last_change_pct: number | null;
  close: number | null;
  trades: number | null;
  volume: number | null;
  value: number | null;
  bid_price_1: number | null;
  bid_vol_1: number | null;
  ask_price_1: number | null;
  ask_vol_1: number | null;
}

// ── IME Forwards ─────────────────────────────────────────────────────────────

export interface IMEForward {
  id: number;
  date: string;
  date_shamsi: string | null;
  isin: string;
  symbol: string | null;
  name: string | null;
  settlement_price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  last: number | null;
  last_change: number | null;
  last_change_pct: number | null;
  close: number | null;
  trades: number | null;
  volume: number | null;
  value: number | null;
  bid_price_1: number | null;
  bid_vol_1: number | null;
  ask_price_1: number | null;
  ask_vol_1: number | null;
}

// ── IME Physical Trades ──────────────────────────────────────────────────────

export interface IMEPhysicalTrade {
  id: number;
  date_trade: string;
  date_trade_shamsi: string | null;
  symbol: string | null;
  name: string | null;
  code_offer: string;
  market_hall: string | null;
  producer: string | null;
  supplier: string | null;
  broker: string | null;
  contract_type: string | null;
  settlement_type: string | null;
  price_base_offer: number | null;
  price_min: number | null;
  price_max: number | null;
  price_last: number | null;
  volume_offer: number | null;
  volume_contract: number | null;
  demand: number | null;
  value: number | null;
  unit: string | null;
}
