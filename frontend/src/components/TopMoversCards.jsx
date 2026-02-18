import { useNavigate } from 'react-router-dom';
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';
import RallyListCard from './RallyListCard';
import rallyColors from '../theme/rallyColors';

export default function TopMoversCards({ data, onSymbolClick }) {
  const navigate = useNavigate();

  const sorted = [...data].sort((a, b) => (b.close_change_pct ?? 0) - (a.close_change_pct ?? 0));
  const topGainers = sorted.filter((d) => d.close_change_pct > 0).slice(0, 5);
  const topLosers = sorted.filter((d) => d.close_change_pct < 0).reverse().slice(0, 5);

  const handleClick = onSymbolClick || ((item) => navigate(`/dashboard/stock/${item.label}`));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mantine-spacing-md)' }}>
      <RallyListCard
        title="بیشترین رشد"
        items={topGainers.map((d) => ({
          key: d.ins_code,
          label: d.symbol,
          value: `${(d.close_change_pct ?? 0) > 0 ? '+' : ''}${(d.close_change_pct ?? 0).toFixed(2)}%`,
          color: rallyColors.green,
          icon: <IconArrowUpRight size={14} color={rallyColors.green} />,
        }))}
        accentColor={rallyColors.green}
        emptyMessage="بدون نماد مثبت"
        onItemClick={handleClick}
      />
      <RallyListCard
        title="بیشترین افت"
        items={topLosers.map((d) => ({
          key: d.ins_code,
          label: d.symbol,
          value: `${(d.close_change_pct ?? 0).toFixed(2)}%`,
          color: rallyColors.orange,
          icon: <IconArrowDownRight size={14} color={rallyColors.orange} />,
        }))}
        accentColor={rallyColors.orange}
        emptyMessage="بدون نماد منفی"
        onItemClick={handleClick}
      />
    </div>
  );
}
