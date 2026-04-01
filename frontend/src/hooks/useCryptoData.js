/**
 * TanStack Query hooks for crypto data endpoints.
 * Mirrors the pattern from useMarketData.js with automatic caching,
 * deduplication, and background refetching.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../services/apiClient';

export function useCryptoMarket(options = {}) {
  return useQuery({
    queryKey: ['crypto-market'],
    queryFn: () => api.get('/crypto/market').then(r => r.data),
    staleTime: 30_000,
    ...options,
  });
}

export function useCryptoGlobalStats(options = {}) {
  return useQuery({
    queryKey: ['crypto-global-stats'],
    queryFn: () => api.get('/crypto/stats/global').then(r => r.data),
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    },
    ...options,
  });
}

export function useCryptoMovers(options = {}) {
  return useQuery({
    queryKey: ['crypto-movers'],
    queryFn: () => api.get('/crypto/movers').then(r => r.data),
    staleTime: 30_000,
    ...options,
  });
}

export function useCryptoDetail(symbol, options = {}) {
  return useQuery({
    queryKey: ['crypto-detail', symbol],
    queryFn: () => api.get(`/crypto/${encodeURIComponent(symbol)}`).then(r => r.data),
    enabled: !!symbol,
    staleTime: 30_000,
    ...options,
  });
}

export function useCryptoHistory(symbol, { interval = '1day', limit = 100, ...options } = {}) {
  return useQuery({
    queryKey: ['crypto-history', symbol, interval, limit],
    queryFn: () => api.get(`/crypto/${encodeURIComponent(symbol)}/history`, { params: { interval, limit } }).then(r => r.data),
    enabled: !!symbol,
    staleTime: 60_000,
    ...options,
  });
}

export function useCryptoSignals(options = {}) {
  return useQuery({
    queryKey: ['crypto-signals'],
    queryFn: () => api.get('/crypto/signals').then(r => r.data),
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useFearGreedHistory(days = 30, options = {}) {
  return useQuery({
    queryKey: ['crypto-fear-greed-history', days],
    queryFn: () => api.get('/crypto/fear-greed-history', { params: { days } }).then(r => r.data),
    staleTime: 15 * 60_000,
    ...options,
  });
}

// ── News Sentiment ──────────────────────────────────────────────────────────

export function useNewsSentimentArticles({ limit = 50, source, coin } = {}, options = {}) {
  return useQuery({
    queryKey: ['crypto-news-articles', limit, source, coin],
    queryFn: () =>
      api.get('/crypto/news-sentiment/articles', { params: { limit, source, coin } }).then(r => r.data),
    staleTime: 2 * 60_000,
    ...options,
  });
}

export function useCoinSentimentSignals(hours = 24, options = {}) {
  return useQuery({
    queryKey: ['crypto-coin-signals', hours],
    queryFn: () =>
      api.get('/crypto/news-sentiment/coin-signals', { params: { hours } }).then(r => r.data),
    staleTime: 2 * 60_000,
    ...options,
  });
}

export function useNewsCategoryStats(hours = 24, options = {}) {
  return useQuery({
    queryKey: ['crypto-news-category-stats', hours],
    queryFn: () =>
      api.get('/crypto/news-sentiment/category-stats', { params: { hours } }).then(r => r.data),
    staleTime: 5 * 60_000,
    ...options,
  });
}

