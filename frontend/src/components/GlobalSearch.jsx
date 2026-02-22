import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spotlight, spotlight } from '@mantine/spotlight';
import { IconSearch, IconCurrencyBitcoin, IconLayoutDashboard, IconClock, IconTrendingUp } from '@tabler/icons-react';
import axios from 'axios';

const RECENT_SEARCHES_KEY = 'global-search-recent';
const MAX_RECENT = 5;

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch { return []; }
}

function addRecentSearch(item) {
  try {
    const recent = getRecentSearches().filter((r) => r.id !== item.id);
    recent.unshift({ id: item.id, label: item.label, description: item.description, group: item.group, path: item.path });
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

const PAGES = [
  { id: 'page-dashboard', label: 'داشبورد بازار', description: 'صفحه اصلی بورس', path: '/dashboard', group: 'صفحات' },
  { id: 'page-heatmap', label: 'نقشه بازار', description: 'نقشه گرمایی سهام', path: '/dashboard/heatmap', group: 'صفحات' },
  { id: 'page-screener', label: 'فیلتر پیشرفته', description: 'غربالگر سهام', path: '/dashboard/screener', group: 'صفحات' },
  { id: 'page-client-type', label: 'حقیقی حقوقی', description: 'جریان نقدینگی', path: '/dashboard/client-type', group: 'صفحات' },
  { id: 'page-watchlist', label: 'دیده‌بان', description: 'لیست نمادهای موردعلاقه', path: '/dashboard/watchlist', group: 'صفحات' },
  { id: 'page-options', label: 'اختیار معامله', description: 'آپشن و مشتقات', path: '/dashboard/options', group: 'صفحات' },
  { id: 'page-options-calc', label: 'ماشین حساب آپشن', description: 'بلک شولز', path: '/dashboard/options-calculator', group: 'صفحات' },
  { id: 'page-portfolio', label: 'پورتفولیو', description: 'مدیریت سبد سهام', path: '/portfolio', group: 'صفحات' },
  { id: 'page-crypto', label: 'رمزارزها', description: 'داشبورد کریپتو', path: '/crypto', group: 'صفحات' },
  { id: 'page-crypto-heatmap', label: 'نقشه رمزارزها', description: 'نقشه گرمایی کریپتو', path: '/crypto/heatmap', group: 'صفحات' },
  { id: 'page-loans', label: 'تسهیلات بانکی', description: 'مقایسه وام', path: '/loans', group: 'صفحات' },
  { id: 'page-loan-calc', label: 'ماشین حساب وام', description: 'محاسبه اقساط', path: '/loans/calculator', group: 'صفحات' },
  { id: 'page-loan-compare', label: 'مقایسه وام‌ها', description: 'مقایسه تسهیلات', path: '/loans/compare', group: 'صفحات' },
  { id: 'page-market-indices', label: 'شاخص‌ها', description: 'شاخص‌های بازار', path: '/dashboard/market-indices', group: 'صفحات' },
  { id: 'page-codal', label: 'کدال', description: 'اطلاعیه‌های ناشران', path: '/dashboard/codal', group: 'صفحات' },
];

const TRENDING_SYMBOLS = ['فولاد', 'خودرو', 'فملی', 'شپنا', 'وبملت'];

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [actions, setActions] = useState([]);
  const [trendingStocks, setTrendingStocks] = useState([]);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  // Debounce search input (300ms)
  const handleQueryChange = useCallback((val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  }, []);

  const fetchData = useCallback(async () => {
    const results = [];

    // Static pages
    PAGES.forEach((p) => {
      results.push({
        id: p.id,
        label: p.label,
        description: p.description,
        group: p.group,
        path: p.path,
        icon: IconLayoutDashboard,
        onClick: () => { addRecentSearch(p); navigate(p.path); },
      });
    });

    // Fetch TSE companies
    try {
      const res = await axios.get('/api/companies', { params: { per_page: 500 } });
      const items = res.data.items || [];
      items.forEach((c) => {
        const path = `/dashboard/stock/${c.symbol}`;
        const item = {
          id: c.symbol || c.ins_code,
          label: `${c.symbol} - ${c.name_fa || c.name || ''}`,
          description: c.sector_name_fa || '',
          group: 'سهام',
          path,
        };
        results.push({
          ...item,
          onClick: () => { addRecentSearch(item); navigate(path); },
        });
      });

      // Build trending list from fetched data
      const trending = items
        .filter((c) => TRENDING_SYMBOLS.some((s) => c.symbol?.includes(s) || c.name_fa?.includes(s)))
        .slice(0, 5)
        .map((c) => ({
          id: `trending-${c.symbol}`,
          label: `${c.symbol} - ${c.name_fa || ''}`,
          description: c.sector_name_fa || '',
          group: 'پرتقاضا',
          icon: IconTrendingUp,
          onClick: () => navigate(`/dashboard/stock/${c.symbol}`),
        }));
      setTrendingStocks(trending);
    } catch {
      // silently fail
    }

    // Fetch crypto coins
    try {
      const res = await axios.get('/api/crypto/market');
      (res.data || []).forEach((c) => {
        const path = `/crypto/coin/${c.symbol}`;
        const item = {
          id: `crypto-${c.symbol}`,
          label: `${c.symbol} - ${c.name_fa || c.name_en || ''}`,
          description: 'رمزارز',
          group: 'رمزارزها',
          path,
        };
        results.push({
          ...item,
          icon: IconCurrencyBitcoin,
          onClick: () => { addRecentSearch(item); navigate(path); },
        });
      });
    } catch {
      // silently fail
    }

    setActions(results);
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) {
      // Show recent searches + trending when search is empty
      const recent = getRecentSearches().map((r) => ({
        id: `recent-${r.id}`,
        label: r.label,
        description: r.description,
        group: 'جستجوهای اخیر',
        icon: IconClock,
        onClick: () => { if (r.path) navigate(r.path); },
      }));
      return [...recent, ...trendingStocks, ...actions.slice(0, Math.max(0, 15 - recent.length - trendingStocks.length))];
    }
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q))
    );
  }, [debouncedQuery, actions, trendingStocks, navigate]);

  return (
    <Spotlight
      actions={filtered.map((a) => ({
        id: a.id,
        label: a.label,
        description: a.description,
        group: a.group,
        onClick: a.onClick,
        leftSection: a.icon ? <a.icon size={16} /> : <IconSearch size={16} />,
      }))}
      query={query}
      onQueryChange={handleQueryChange}
      searchProps={{
        leftSection: <IconSearch size={20} />,
        placeholder: 'جستجوی نماد، رمزارز یا صفحه...',
      }}
      nothingFound="نتیجه‌ای یافت نشد"
      highlightQuery
      shortcut={['mod + K', 'mod + k']}
    />
  );
}

export function SpotlightProvider({ children }) {
  return (
    <>
      {children}
      <GlobalSearch />
    </>
  );
}

export { spotlight };
export default GlobalSearch;
