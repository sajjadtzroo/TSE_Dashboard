import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const STALE_5MIN = 5 * 60 * 1000;

export function usePortfolios() {
  const hasToken = !!localStorage.getItem('auth_token');
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: () => api.get('/portfolios').then((r) => r.data.data),
    enabled: hasToken,
    staleTime: STALE_5MIN,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/portfolios', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  });
}

export function useUpdatePortfolio(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      api.put(`/portfolios/${portfolioId}`, data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/portfolios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolios'] }),
  });
}

export function useTransactions(portfolioId, filters = {}) {
  const { symbol, tx_type, from, to, page = 1, per_page = 50 } = filters;
  return useQuery({
    queryKey: ['portfolio-transactions', portfolioId, filters],
    queryFn: () =>
      api
        .get(`/portfolios/${portfolioId}/transactions`, {
          params: { symbol, tx_type, from, to, page, per_page },
        })
        .then((r) => r.data.data),
    enabled: !!portfolioId,
    staleTime: STALE_5MIN,
  });
}

export function useAddTransaction(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      api.post(`/portfolios/${portfolioId}/transactions`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-holdings', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-performance', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-accounting', portfolioId] });
    },
  });
}

export function useUpdateTransaction(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ txId, data }) =>
      api.put(`/portfolios/${portfolioId}/transactions/${txId}`, data).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-holdings', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-performance', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-accounting', portfolioId] });
    },
  });
}

export function useDeleteTransaction(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txId) => api.delete(`/portfolios/${portfolioId}/transactions/${txId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-holdings', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-performance', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-accounting', portfolioId] });
    },
  });
}

export function usePortfolioHoldings(portfolioId) {
  return useQuery({
    queryKey: ['portfolio-holdings', portfolioId],
    queryFn: () =>
      api.get(`/portfolios/${portfolioId}/holdings`).then((r) => r.data.data),
    enabled: !!portfolioId,
    staleTime: STALE_5MIN,
  });
}

export function usePortfolioPerformance(portfolioId, period = 'all') {
  return useQuery({
    queryKey: ['portfolio-performance', portfolioId, period],
    queryFn: () =>
      api
        .get(`/portfolios/${portfolioId}/performance`, { params: { period } })
        .then((r) => r.data.data),
    enabled: !!portfolioId,
    staleTime: STALE_5MIN,
  });
}

export function usePortfolioAccounting(portfolioId) {
  return useQuery({
    queryKey: ['portfolio-accounting', portfolioId],
    queryFn: () =>
      api.get(`/portfolios/${portfolioId}/accounting`).then((r) => r.data.data),
    enabled: !!portfolioId,
    staleTime: STALE_5MIN,
  });
}

export function useImportHoldings(portfolioId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (holdings) =>
      api.post(`/portfolios/${portfolioId}/import`, { holdings }).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio-transactions', portfolioId] });
      qc.invalidateQueries({ queryKey: ['portfolio-holdings', portfolioId] });
    },
  });
}
