/**
 * Type definitions for TSE options (equity options) data structures.
 * Matches the Pydantic schemas in api/schemas.py.
 */

// ── Options Chain ────────────────────────────────────────────────────────────

export type OptionType = 'call' | 'put';

export interface OptionsChainUnderlying {
  underlying: string;
  security_id: number | null;
  name_fa: string | null;
  type: string | null;
  sector_name_fa: string | null;
}

export interface OptionsChainItem {
  id: number;
  ins_code: number;
  symbol: string;
  name_fa: string | null;
  option_type: OptionType;
  underlying: string;
  strike_price: number | null;
  expiry_date: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  last: number | null;
  close_change: number | null;
  volume: number | null;
  value: number | null;
  trades: number | null;
  bid_price_1: number | null;
  ask_price_1: number | null;
}

export interface OptionsChain {
  underlying_info: OptionsChainUnderlying | null;
  data_date: string | null;
  expiry_dates: string[];
  options: OptionsChainItem[];
}

// ── Full Option ──────────────────────────────────────────────────────────────

export interface Option {
  id: number;
  ins_code: number;
  isin: string | null;
  symbol: string;
  name_fa: string | null;
  option_type: OptionType;
  underlying: string | null;
  strike_price: number | null;
  expiry_date: string | null;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  last: number | null;
  yesterday: number | null;
  close_change: number | null;
  volume: number | null;
  value: number | null;
  trades: number | null;
  threshold_min: number | null;
  threshold_max: number | null;
  base_volume: number | null;
  bid_price_1: number | null;
  bid_vol_1: number | null;
  bid_count_1: number | null;
  ask_price_1: number | null;
  ask_vol_1: number | null;
  ask_count_1: number | null;
}

// ── Options Calculator (frontend-only) ───────────────────────────────────────

export interface OptionLeg {
  type: OptionType;
  strike: number;
  premium: number;
  quantity: number;
  position: 'long' | 'short';
}

export interface GreeksResult {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface PayoffPoint {
  price: number;
  payoff: number;
}

export interface StrategyConfig {
  name: string;
  label: string;
  legs: OptionLeg[];
}
