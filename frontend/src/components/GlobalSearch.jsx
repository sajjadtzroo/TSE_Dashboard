import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spotlight, spotlight } from '@mantine/spotlight';
import { IconSearch, IconCurrencyBitcoin } from '@tabler/icons-react';
import axios from 'axios';

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [actions, setActions] = useState([]);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const results = [];

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
