export interface CryptoTicker {
  symbol: string;
  name_fa: string;
  name_en: string;
  last_price: number;
  price_change_24h: number | null;
  price_change_pct_24h: number | null;
  high_24h: number | null;
  low_24h: number | null;
  volume_24h: number | null;
  turnover_24h: number | null;
  best_bid: number | null;
  best_ask: number | null;
  market_cap_usd: number | null;
  price_toman: number | null;
  snapshot_time: string;
}

export interface CryptoOHLCV {
  security_id: number;
  interval: string;
  open_time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  turnover: number | null;
}

export interface CryptoDetail extends CryptoTicker {
  sparkline_24h: number[];
}

export interface CryptoGlobalStats {
  date: string;
  total_market_cap_usd: number | null;
  total_volume_24h_usd: number | null;
  btc_dominance_pct: number | null;
  eth_dominance_pct: number | null;
  active_coins: number | null;
  fear_greed_value: number | null;
  fear_greed_label: string | null;
}

export interface CryptoMovers {
  gainers: CryptoTicker[];
  losers: CryptoTicker[];
}

export interface CryptoOrderBookEntry {
  price: number;
  size: number;
}

export interface CryptoTrade {
  price: number;
  size: number;
  side: string;
  time: string;
}
