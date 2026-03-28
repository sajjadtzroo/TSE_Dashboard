/**
 * TanStack Query hooks for commodity data endpoints.
 * Mirrors useCryptoData.js pattern.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../services/apiClient';

/** All commodity prices (latest snapshot) */
export function useCommodityPrices(options = {}) {
  return useQuery({
    queryKey: ['commodity-prices'],
    queryFn: () => api.get('/commodity/prices').then(r => r.data),
    staleTime: 30_000,
    ...options,
  });
}

/** Top movers (gainers/losers) */
export function useCommodityMovers(options = {}) {
  return useQuery({
    queryKey: ['commodity-movers'],
    queryFn: () => api.get('/commodity/movers').then(r => r.data),
    staleTime: 30_000,
    ...options,
  });
}

/** Single commodity detail */
export function useCommodityDetail(symbol, options = {}) {
  return useQuery({
    queryKey: ['commodity-detail', symbol],
    queryFn: () => api.get(`/commodity/${encodeURIComponent(symbol)}`).then(r => r.data),
    enabled: !!symbol,
    staleTime: 30_000,
    ...options,
  });
}

/** OHLCV history for a single commodity */
export function useCommodityHistory(symbol, { period = '6mo', interval = '1d', ...options } = {}) {
  return useQuery({
    queryKey: ['commodity-history', symbol, period, interval],
    queryFn: () => api.get(`/commodity/${encodeURIComponent(symbol)}/history`, { params: { period, interval } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 60_000,
    ...options,
  });
}

/** Correlation matrix between commodities */
export function useCommodityCorrelations(options = {}) {
  return useQuery({
    queryKey: ['commodity-correlations'],
    queryFn: () => api.get('/commodity/correlations').then(r => r.data),
    staleTime: 15 * 60_000,
    ...options,
  });
}
