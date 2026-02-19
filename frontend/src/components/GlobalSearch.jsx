import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spotlight, spotlight } from '@mantine/spotlight';
import { IconSearch, IconCurrencyBitcoin, IconLayoutDashboard } from '@tabler/icons-react';
import axios from 'axios';

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

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [actions, setActions] = useState([]);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const results = [];

    // Static pages
    PAGES.forEach((p) => {
      results.push({
        id: p.id,
        label: p.label,
        description: p.description,
        group: p.group,
        icon: IconLayoutDashboard,
        onClick: () => navigate(p.path),
      });
    });

    // Fetch TSE companies
    try {
      const res = await axios.get('/api/companies');
      (res.data || []).forEach((c) => {
        results.push({
          id: c.symbol || c.ins_code,
          label: `${c.symbol} - ${c.name_fa || c.name || ''}`,
          description: c.sector_name_fa || '',
          group: 'سهام',
          onClick: () => navigate(`/dashboard/stock/${c.symbol}`),
        });
      });
    } catch {
      // silently fail
    }

    // Fetch crypto coins
    try {
      const res = await axios.get('/api/crypto/market');
      (res.data || []).forEach((c) => {
        results.push({
          id: `crypto-${c.symbol}`,
          label: `${c.symbol} - ${c.name_fa || c.name_en || ''}`,
          description: 'رمزارز',
          group: 'رمزارزها',
          icon: IconCurrencyBitcoin,
          onClick: () => navigate(`/crypto/coin/${c.symbol}`),
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

  const filtered = query.trim()
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          (a.description && a.description.toLowerCase().includes(query.toLowerCase()))
      )
    : actions.slice(0, 20);

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
      onQueryChange={setQuery}
      searchProps={{
        leftSection: <IconSearch size={20} />,
        placeholder: 'جستجوی نماد یا رمزارز...',
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
