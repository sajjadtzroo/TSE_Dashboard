import { useMemo } from 'react';
import { SimpleGrid, Text } from '@mantine/core';
import RallyMainCard from '../../../components/RallyMainCard';
import RallyBarChart from '../../../components/charts/RallyBarChart';
import RallyPieChart from '../../../components/charts/RallyPieChart';
import { COMMODITY_CATEGORIES, getCommodityCategory } from '../../../constants/commodity';
import animStyles from '../../../components/shared/animations.module.css';

export default function CommodityChartsSection({ prices = [] }) {
  const categoryData = useMemo(() => {
    const groups = {};
    prices.forEach(p => {
      const cat = getCommodityCategory(p.symbol);
      if (!groups[cat]) groups[cat] = { name: cat, count: 0, avgChange: 0, total: 0 };
      groups[cat].count += 1;
      groups[cat].total += (p.change_pct ?? 0);
    });
    return Object.values(groups).map(g => ({
      ...g,
      avgChange: g.count > 0 ? +(g.total / g.count).toFixed(2) : 0,
    }));
  }, [prices]);

  const changeData = useMemo(() =>
    prices
      .filter(p => p.change_pct != null)
      .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
      .slice(0, 10)
      .map(p => ({
        name: p.name_fa || p.symbol,
        value: p.change_pct,
        color: p.change_pct >= 0 ? '#22C55E' : '#EF4444',
      })),
    [prices],
  );

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="md">
      <div className={`${animStyles.sectionEnter} ${animStyles.sectionDelay1}`}>
        <RallyMainCard title="تغییرات قیمت">
          {changeData.length > 0 ? (
            <RallyBarChart
              data={changeData}
              dataKey="value"
              nameKey="name"
              height={280}
              unit="%"
              colorByValue
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
          )}
        </RallyMainCard>
      </div>
      <div className={`${animStyles.sectionEnter} ${animStyles.sectionDelay2}`}>
        <RallyMainCard title="دسته‌بندی کالاها">
          {categoryData.length > 0 ? (
            <RallyPieChart
              data={categoryData.map(c => ({ x: c.name, y: c.count }))}
              height={280}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">داده‌ای موجود نیست</Text>
          )}
        </RallyMainCard>
      </div>
    </SimpleGrid>
  );
}
