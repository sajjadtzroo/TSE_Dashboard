/**
 * Type definitions for TSE market data structures.
 * Matches the Pydantic schemas in api/schemas.py.
 */

// ── Market Overview ──────────────────────────────────────────────────────────

export interface MarketOverviewItem {
  ins_code: number | null;
  symbol: string;
  name_fa: string | null;
  sector_name_fa: string | null;
  date: string | null;
  close: number | null;
  last: number | null;
  close_change: number | null;
  close_change_pct: number | null;
  volume: number;
  value: number;
  trades: number;
  low: number | null;
  high: number | null;
  pe_ratio: number | null;
  eps: number | null;
  market_cap: number | null;
}

// ── Security ─────────────────────────────────────────────────────────────────

export type MarketType = 'tse' | 'gold' | 'currency' | 'commodity' | 'crypto';

export interface Security {
  ins_code: number | null;
  symbol: string;
  name_fa: string | null;
  name_en: string | null;
  isin: string | null;
  type: string | null;
  market_type: MarketType;
  sector_name_fa: string | null;
  sector_name_en: string | null;
  base_volume: number | null;
  total_shares: number | null;
  is_active: boolean;
}

// ── Daily OHLCV ──────────────────────────────────────────────────────────────

export interface DailyOHLCV {
  security_id: number;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  last: number | null;
  volume: number | null;
  value: number | null;
  trades: number | null;
  adj_close: number | null;
  price_yesterday: number | null;
  close_change: number | null;
  close_change_pct: number | null;
  last_change: number | null;
  last_change_pct: number | null;
  threshold_min: number | null;
  threshold_max: number | null;
  eps: number | null;
  pe_ratio: number | null;
  market_cap: number | null;
  nav: number | null;
  estimated_eps: number | null;
  real_buy_count: number | null;
  real_buy_volume: number | null;
  real_sell_count: number | null;
  real_sell_volume: number | null;
  legal_buy_count: number | null;
  legal_buy_volume: number | null;
  legal_sell_count: number | null;
  legal_sell_volume: number | null;
}

// ── Stock Detail ─────────────────────────────────────────────────────────────

export interface StockDetail {
  security: Security;
  latest_ohlcv: DailyOHLCV | null;
}

// ── Order Book ───────────────────────────────────────────────────────────────

export interface OrderBookLevel {
  bid_price: number | null;
  bid_vol: number | null;
  bid_count: number | null;
  ask_price: number | null;
  ask_vol: number | null;
  ask_count: number | null;
}

export interface OrderBookSnapshot {
  snapshot_time: string;
  levels: OrderBookLevel[];
}

// ── Market Index ─────────────────────────────────────────────────────────────

export interface MarketIndex {
  id: number;
  date: string;
  time: string | null;
  name: string;
  index_value: number | null;
  index_change: number | null;
  index_change_pct: number | null;
  min_value: number | null;
  max_value: number | null;
  market_value: number | null;
  trades: number | null;
  volume: number | null;
  value: number | null;
  state: string | null;
}

export interface MarketIndexHistoryItem {
  date: string;
  index_value: number | null;
  index_change_pct: number | null;
}

// ── Client Type ──────────────────────────────────────────────────────────────

export interface ClientTypeItem extends MarketOverviewItem {
  real_buy_count: number | null;
  real_buy_volume: number | null;
  real_sell_count: number | null;
  real_sell_volume: number | null;
  legal_buy_count: number | null;
  legal_buy_volume: number | null;
  legal_sell_count: number | null;
  legal_sell_volume: number | null;
}

/** Enriched with computed net flows (frontend-only) */
export interface ClientTypeEnriched extends ClientTypeItem {
  net_real_flow: number;
  net_legal_flow: number;
}

// ── Market Stats ─────────────────────────────────────────────────────────────

export interface MarketStats {
  total_securities: number;
  securities_with_data_today: number;
  latest_date: string | null;
  total_volume_today: number;
  total_value_today: number;
}

// ── ETF NAV ──────────────────────────────────────────────────────────────────

export interface ETFNav {
  id: number;
  security_id: number;
  date: string;
  time: string | null;
  symbol: string | null;
  name_fa: string | null;
  nav_issuance: number | null;
  nav_redemption: number | null;
  last_price: number | null;
  bubble_pct: number | null;
  fund_type: string | null;
}

// ── Market Prices ────────────────────────────────────────────────────────────

export interface MarketPrice {
  id: number;
  security_id: number;
  date: string;
  time: string | null;
  symbol: string | null;
  name_fa: string | null;
  market_type: string | null;
  price: number | null;
  price_toman: number | null;
  change_value: number | null;
  change_pct: number | null;
  unit: string | null;
  market_cap: number | null;
  icon_url: string | null;
}

// ── Shareholders ─────────────────────────────────────────────────────────────

export interface Shareholder {
  id: number;
  security_id: number;
  date: string;
  shareholder_id: string | null;
  name: string | null;
  volume: number | null;
  percent: number | null;
  change: number | null;
}

// ── Tick Trades ──────────────────────────────────────────────────────────────

export interface TickTrade {
  id: number;
  security_id: number;
  date: string;
  row_num: number;
  time: string | null;
  price: number | null;
  volume: number | null;
  canceled: boolean;
}

// ── Codal ────────────────────────────────────────────────────────────────────

export interface CodalAnnouncement {
  id: number;
  security_id: number | null;
  symbol: string | null;
  title: string | null;
  sent_date_time: string | null;
  publish_date_time: string | null;
  category: string | null;
  letter_type: string | null;
  is_estimate: boolean;
  url: string | null;
  excel_url: string | null;
  pdf_url: string | null;
  attachment_url: string | null;
}

// ── Chart / Utility Types ────────────────────────────────────────────────────

export interface ChartPoint {
  x: string;
  y: number;
}
