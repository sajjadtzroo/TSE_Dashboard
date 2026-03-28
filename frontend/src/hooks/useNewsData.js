import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/apiClient';

export function useNewsFeed({ source_type, category, language, symbol, search, limit = 20, offset = 0, ...options } = {}) {
  return useQuery({
    queryKey: ['news-feed', source_type, category, language, symbol, search, limit, offset],
    queryFn: () => api.get('/news', { params: { source_type, category, language, symbol, search, limit, offset } }).then(r => r.data),
    staleTime: 60_000,
    ...options,
  });
}

export function useNewsTrending(options = {}) {
  return useQuery({
    queryKey: ['news-trending'],
    queryFn: () => api.get('/news/trending').then(r => r.data),
    staleTime: 2 * 60_000,
    ...options,
  });
}

export function useNewsSources(options = {}) {
  return useQuery({
    queryKey: ['news-sources'],
    queryFn: () => api.get('/news/sources').then(r => r.data),
    staleTime: 5 * 60_000,
    ...options,
  });
}

export function useMarkNewsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/news/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['news-feed'] }),
  });
}
