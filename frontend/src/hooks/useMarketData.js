/**
 * TanStack Query hooks for market data endpoints.
 * Replaces raw useApiData calls with automatic caching, deduplication, and background refetching.
 *
 * Each hook accepts endpoint-specific params plus optional TanStack Query options
 * (e.g. refetchInterval, staleTime, enabled) via rest spread.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import api from '../services/apiClient';

// axios is kept for health/cache endpoints that use absolute paths (no auth needed)

// ── Market ──────────────────────────────────────────────────────────────────

export function useMarketOverview({ sector, limit, ...options } = {}) {
  return useQuery({
    queryKey: ['market-overview', sector, limit],
    queryFn: () => api.get('/market-overview', { params: { sector, limit } }).then(r => r.data),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useClientType({ sector, limit, ...options } = {}) {
  return useQuery({
    queryKey: ['client-type', sector, limit],
    queryFn: () => api.get('/client-type', { params: { sector, limit } }).then(r => r.data),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useCompanies({
  active_only = true,
  sector,
  type,
  market_type,
  page = 1,
  perPage = 50,
  ...options
} = {}) {
  return useQuery({
    queryKey: ['companies', active_only, sector, type, market_type, page, perPage],
    queryFn: () =>
      api
        .get('/companies', { params: { active_only, sector, type, market_type, page, per_page: perPage } })
        .then((r) => r.data),
    staleTime: 15 * 60 * 1000,
    ...options,
  });
}

export function useMarketStats(options = {}) {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats').then(r => r.data),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useSectors(options = {}) {
  return useQuery({
    queryKey: ['sectors'],
    queryFn: () => api.get('/sectors').then(r => r.data),
    staleTime: 60 * 60 * 1000,
    ...options,
  });
}

// ── Market Indices ──────────────────────────────────────────────────────────

export function useMarketIndices({ date, ...options } = {}) {
  return useQuery({
    queryKey: ['market-indices', date],
    queryFn: () => api.get('/market/indices', { params: { date } }).then(r => r.data),
    staleTime: 3 * 60 * 1000,
    ...options,
  });
}

export function useMarketIndexHistory(name, { days = 365, ...options } = {}) {
  return useQuery({
    queryKey: ['market-index-history', name, days],
    queryFn: () => api.get(`/market/indices/${encodeURIComponent(name)}/history`, { params: { days } }).then(r => r.data),
    enabled: !!name,
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// ── ETF NAV ─────────────────────────────────────────────────────────────────

export function useETFNav({ symbol, fund_type, date, ...options } = {}) {
  return useQuery({
    queryKey: ['etf-nav', symbol, fund_type, date],
    queryFn: () => api.get('/market/etf-nav', { params: { symbol, fund_type, date } }).then(r => r.data),
    staleTime: 3 * 60 * 1000,
    ...options,
  });
}

export function useETFNavHistory(symbol, { days = 365, ...options } = {}) {
  return useQuery({
    queryKey: ['etf-nav-history', symbol, days],
    queryFn: () => api.get(`/market/etf-nav/${encodeURIComponent(symbol)}/history`, { params: { days } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ── Market Prices ───────────────────────────────────────────────────────────

export function useMarketPrices({ market_type, date, ...options } = {}) {
  return useQuery({
    queryKey: ['market-prices', market_type, date],
    queryFn: () => api.get('/market/prices', { params: { market_type, date } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// ── Stocks ──────────────────────────────────────────────────────────────────

export function useStockDetail(symbol, options = {}) {
  return useQuery({
    queryKey: ['stock-detail', symbol],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}`).then(r => r.data),
    enabled: !!symbol,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export function useStockHistory(symbol, { days = 30, ...options } = {}) {
  return useQuery({
    queryKey: ['stock-history', symbol, days],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}/history`, { params: { days } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useOrderBook(symbol, { limit = 1, ...options } = {}) {
  return useQuery({
    queryKey: ['orderbook', symbol, limit],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}/orderbook`, { params: { limit } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useShareholders(symbol, { date, ...options } = {}) {
  return useQuery({
    queryKey: ['shareholders', symbol, date],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}/shareholders`, { params: { date } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000,
    ...options,
  });
}

export function useTickTrades(symbol, { date, ...options } = {}) {
  return useQuery({
    queryKey: ['tick-trades', symbol, date],
    queryFn: () => api.get(`/stocks/${encodeURIComponent(symbol)}/tick-trades`, { params: { date } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ── Options ─────────────────────────────────────────────────────────────────

export function useOptionsUnderlyings(options = {}) {
  return useQuery({
    queryKey: ['options-underlyings'],
    queryFn: () => api.get('/options/underlyings').then(r => r.data),
    staleTime: 3 * 60 * 1000,
    ...options,
  });
}

export function useOptionsChain(underlying, { expiry_date, ...options } = {}) {
  return useQuery({
    queryKey: ['options-chain', underlying, expiry_date],
    queryFn: () => api.get('/options/chain', { params: { underlying, expiry_date } }).then(r => r.data),
    enabled: !!underlying,
    staleTime: 3 * 60 * 1000,
    ...options,
  });
}

// ── IME ─────────────────────────────────────────────────────────────────────

export function useIMEOptions({ commodity, option_type, limit, ...options } = {}) {
  return useQuery({
    queryKey: ['ime-options', commodity, option_type, limit],
    queryFn: () => api.get('/ime/options', { params: { commodity, option_type, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useIMEFutures({ limit, ...options } = {}) {
  return useQuery({
    queryKey: ['ime-futures', limit],
    queryFn: () => api.get('/ime/futures', { params: { limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useIMECertificates({ cert_type, date, limit, ...options } = {}) {
  return useQuery({
    queryKey: ['ime-certificates', cert_type, date, limit],
    queryFn: () => api.get('/ime/certificates', { params: { cert_type, date, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useIMEFunds({ date, limit, ...options } = {}) {
  return useQuery({
    queryKey: ['ime-funds', date, limit],
    queryFn: () => api.get('/ime/funds', { params: { date, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useIMEForwards({ date, limit, ...options } = {}) {
  return useQuery({
    queryKey: ['ime-forwards', date, limit],
    queryFn: () => api.get('/ime/forwards', { params: { date, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

export function useIMEPhysical({ date_start, date_end, limit, ...options } = {}) {
  return useQuery({
    queryKey: ['ime-physical', date_start, date_end, limit],
    queryFn: () => api.get('/ime/physical', { params: { date_start, date_end, limit } }).then(r => r.data),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
}

// ── Codal ───────────────────────────────────────────────────────────────────

export function useCodal({ symbol, category, page = 1, per_page = 50, ...options } = {}) {
  return useQuery({
    queryKey: ['codal', symbol, category, page, per_page],
    queryFn: () => api.get('/codal', { params: { symbol, category, page, per_page } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ── Financial Statements ─────────────────────────────────────────────────────

export function useFinancialStatements(symbol, { statement_type, period_months, is_audited, is_consolidated, per_page = 20, ...options } = {}) {
  return useQuery({
    queryKey: ['financial-statements', symbol, statement_type, period_months ?? null, is_audited ?? null, is_consolidated ?? null, per_page],
    queryFn: () => api.get('/codal/financials', {
      params: {
        symbol, statement_type, per_page,
        ...(period_months && { period_months }),
        ...(is_audited && { is_audited: true }),
        ...(is_consolidated && { is_consolidated: true }),
      },
    }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000, // immutable data — 1 hour
    ...options,
  });
}

export function useFinancialAnalysis(symbol) {
  return useMutation({
    mutationFn: ({ statement_type, period_months, is_audited, is_consolidated } = {}) =>
      api.post('/rag/financial-analysis', {
        symbol,
        statement_type,
        ...(period_months && { period_months }),
        ...(is_audited && { is_audited: true }),
        ...(is_consolidated && { is_consolidated: true }),
      }).then(r => r.data),
  });
}

export function useRatioExplain() {
  return useMutation({
    mutationFn: ({ ratio_name, ratio_name_en } = {}) =>
      api.post('/rag/ratio-explain', { ratio_name, ratio_name_en }).then(r => r.data),
  });
}

// ── Health ───────────────────────────────────────────────────────────────────

export function useHealthDeep(options = {}) {
  return useQuery({
    queryKey: ['health-deep'],
    queryFn: () => axios.get('/health/deep').then(r => r.data),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useCacheStats(options = {}) {
  return useQuery({
    queryKey: ['cache-stats'],
    queryFn: () => axios.get('/cache/stats').then(r => r.data),
    staleTime: 10 * 1000,
    ...options,
  });
}

export function useDollarRate(options = {}) {
  return useQuery({
    queryKey: ['dollar', 'latest'],
    queryFn: () => axios.get('/api/dollar/latest').then(r => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
    ...options,
  });
}

export function useGoldLatest(options = {}) {
  return useQuery({
    queryKey: ['gold', 'latest'],
    queryFn: () => axios.get('/api/gold/latest').then(r => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
    ...options,
  });
}

export function useDollarHistory(days = 7, options = {}) {
  return useQuery({
    queryKey: ['dollar', 'history', days],
    queryFn: () => axios.get(`/api/dollar/history?days=${days}`).then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
    ...options,
  });
}

export function useGoldHistory(days = 7, symbol = 'GOLD_18K', options = {}) {
  return useQuery({
    queryKey: ['gold', 'history', symbol, days],
    queryFn: () => axios.get(`/api/gold/history?symbol=${symbol}&days=${days}`).then(r => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
    ...options,
  });
}
