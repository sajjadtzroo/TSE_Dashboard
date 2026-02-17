import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spotlight, spotlight } from '@mantine/spotlight';
import { IconSearch } from '@tabler/icons-react';
import axios from 'axios';

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [actions, setActions] = useState([]);
  const navigate = useNavigate();

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await axios.get('/api/companies');
      const items = (res.data || []).map((c) => ({
        id: c.symbol || c.ins_code,
        label: `${c.symbol} - ${c.name_fa || c.name || ''}`,
        description: c.sector_name_fa || '',
        onClick: () => navigate(`/dashboard/stock/${c.symbol}`),
      }));
      setActions(items);
    } catch {
      // silently fail - search will be empty
    }
  }, [navigate]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

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
        onClick: a.onClick,
        leftSection: <IconSearch size={16} />,
      }))}
      query={query}
      onQueryChange={setQuery}
      searchProps={{
        leftSection: <IconSearch size={20} />,
        placeholder: 'جستجوی نماد...',
      }}
      nothingFound="نمادی یافت نشد"
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
