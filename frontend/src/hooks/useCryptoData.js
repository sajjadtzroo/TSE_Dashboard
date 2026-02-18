/**
 * TanStack Query hooks for crypto data endpoints.
 * Mirrors the pattern from useMarketData.js with automatic caching,
 * deduplication, and background refetching.
 */
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({ baseURL: '/api/crypto' });

export function useCryptoMarket(options = {}) {
  return useQuery({
    queryKey: ['crypto-market'],
    queryFn: () => api.get('/market').then(r => r.data),
    staleTime: 30_000,
    ...options,
  });
}

export function useCryptoGlobalStats(options = {}) {
  return useQuery({
    queryKey: ['crypto-global-stats'],
    queryFn: () => api.get('/stats/global').then(r => r.data),
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useCryptoMovers(options = {}) {
  return useQuery({
    queryKey: ['crypto-movers'],
    queryFn: () => api.get('/movers').then(r => r.data),
    staleTime: 30_000,
    ...options,
  });
}

export function useCryptoDetail(symbol, options = {}) {
  return useQuery({
    queryKey: ['crypto-detail', symbol],
    queryFn: () => api.get(`/${symbol}`).then(r => r.data),
    enabled: !!symbol,
    staleTime: 30_000,
    ...options,
  });
}

export function useCryptoHistory(symbol, { interval = '1day', limit = 100, ...options } = {}) {
  return useQuery({
    queryKey: ['crypto-history', symbol, interval, limit],
    queryFn: () => api.get(`/${symbol}/history`, { params: { interval, limit } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 60_000,
    ...options,
  });
}

