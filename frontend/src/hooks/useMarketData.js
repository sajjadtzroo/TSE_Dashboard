/**
 * TanStack Query hooks for market data endpoints.
 * Replaces raw useApiData calls with automatic caching, deduplication, and background refetching.
 */
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// ── Market ──────────────────────────────────────────────────────────────────

export function useMarketOverview({ sector, limit } = {}) {
  return useQuery({
    queryKey: ['market-overview', sector, limit],
    queryFn: () => api.get('/market-overview', { params: { sector, limit } }).then(r => r.data),
    staleTime: 2 * 60 * 1000, // 2 min during trading
  });
}

export function useClientType({ sector, limit } = {}) {
  return useQuery({
    queryKey: ['client-type', sector, limit],
    queryFn: () => api.get('/client-type', { params: { sector, limit } }).then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCompanies({ active_only = true, sector, type, market_type, limit } = {}) {
  return useQuery({
    queryKey: ['companies', active_only, sector, type, market_type, limit],
    queryFn: () => api.get('/companies', { params: { active_only, sector, type, market_type, limit } }).then(r => r.data),
    staleTime: 15 * 60 * 1000, // 15 min
  });
}

export function useMarketStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSectors() {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: () => api.get('/sectors').then(r => r.data),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ── Market Indices ──────────────────────────────────────────────────────────

export function useMarketIndices({ date } = {}) {
  return useQuery({
    queryKey: ['market-indices', date],
    queryFn: () => api.get('/market/indices', { params: { date } }).then(r => r.data),
    staleTime: 3 * 60 * 1000,
  });
}

export function useMarketIndexHistory(name, { days = 365 } = {}) {
  return useQuery({
    queryKey: ['market-index-history', name, days],
    queryFn: () => api.get(`/market/indices/${encodeURIComponent(name)}/history`, { params: { days } }).then(r => r.data),
    enabled: !!name,
    staleTime: 10 * 60 * 1000,
  });
}

// ── ETF NAV ─────────────────────────────────────────────────────────────────

export function useETFNav({ symbol, fund_type, date } = {}) {
  return useQuery({
    queryKey: ['etf-nav', symbol, fund_type, date],
    queryFn: () => api.get('/market/etf-nav', { params: { symbol, fund_type, date } }).then(r => r.data),
    staleTime: 3 * 60 * 1000,
  });
}

// ── Market Prices ───────────────────────────────────────────────────────────

export function useMarketPrices({ market_type, date } = {}) {
  return useQuery({
    queryKey: ['market-prices', market_type, date],
    queryFn: () => api.get('/market/prices', { params: { market_type, date } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

// ── Stocks ──────────────────────────────────────────────────────────────────

export function useStockDetail(symbol) {
  return useQuery({
    queryKey: ['stock-detail', symbol],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}`).then(r => r.data),
    enabled: !!symbol,
    staleTime: 2 * 60 * 1000,
  });
}

export function useStockHistory(symbol, { days = 30 } = {}) {
  return useQuery({
    queryKey: ['stock-history', symbol, days],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}/history`, { params: { days } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrderBook(symbol, { limit = 1 } = {}) {
  return useQuery({
    queryKey: ['orderbook', symbol, limit],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}/orderbook`, { params: { limit } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 60 * 1000, // 1 min
  });
}

export function useShareholders(symbol, { date } = {}) {
  return useQuery({
    queryKey: ['shareholders', symbol, date],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}/shareholders`, { params: { date } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000,
  });
}

export function useTickTrades(symbol, { date } = {}) {
  return useQuery({
    queryKey: ['tick-trades', symbol, date],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}/tick-trades`, { params: { date } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Options ─────────────────────────────────────────────────────────────────

export function useOptionsUnderlyings() {
  return useQuery({
    queryKey: ['options-underlyings'],
    queryFn: () => api.get('/options/underlyings').then(r => r.data),
    staleTime: 3 * 60 * 1000,
  });
}

export function useOptionsChain(underlying, { expiry_date } = {}) {
  return useQuery({
    queryKey: ['options-chain', underlying, expiry_date],
    queryFn: () => api.get('/options/chain', { params: { underlying, expiry_date } }).then(r => r.data),
    enabled: !!underlying,
    staleTime: 3 * 60 * 1000,
  });
}

// ── IME ─────────────────────────────────────────────────────────────────────

export function useIMEOptions({ commodity, option_type, limit } = {}) {
  return useQuery({
    queryKey: ['ime-options', commodity, option_type, limit],
    queryFn: () => api.get('/ime/options', { params: { commodity, option_type, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useIMEFutures({ limit } = {}) {
  return useQuery({
    queryKey: ['ime-futures', limit],
    queryFn: () => api.get('/ime/futures', { params: { limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useIMECertificates({ cert_type, date, limit } = {}) {
  return useQuery({
    queryKey: ['ime-certificates', cert_type, date, limit],
    queryFn: () => api.get('/ime/certificates', { params: { cert_type, date, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useIMEFunds({ date, limit } = {}) {
  return useQuery({
    queryKey: ['ime-funds', date, limit],
    queryFn: () => api.get('/ime/funds', { params: { date, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useIMEForwards({ date, limit } = {}) {
  return useQuery({
    queryKey: ['ime-forwards', date, limit],
    queryFn: () => api.get('/ime/forwards', { params: { date, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useIMEPhysical({ date_start, date_end, limit } = {}) {
  return useQuery({
    queryKey: ['ime-physical', date_start, date_end, limit],
    queryFn: () => api.get('/ime/physical', { params: { date_start, date_end, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

// ── Codal ───────────────────────────────────────────────────────────────────

export function useCodal({ symbol, category, page = 1, per_page = 50 } = {}) {
  return useQuery({
    queryKey: ['codal', symbol, category, page, per_page],
    queryFn: () => api.get('/codal', { params: { symbol, category, page, per_page } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Health ───────────────────────────────────────────────────────────────────

export function useHealthDeep() {
  return useQuery({
    queryKey: ['health-deep'],
    queryFn: () => axios.get('/health/deep').then(r => r.data),
    staleTime: 30 * 1000,
  });
}

export function useCacheStats() {
  return useQuery({
    queryKey: ['cache-stats'],
    queryFn: () => axios.get('/cache/stats').then(r => r.data),
    staleTime: 10 * 1000,
  });
}
