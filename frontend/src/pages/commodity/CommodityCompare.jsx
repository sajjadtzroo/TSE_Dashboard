import { useState, useCallback, useEffect } from 'react';
import { Badge, MultiSelect, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import RallyMainCard from '../../components/RallyMainCard';
import RallyLineChart from '../../components/charts/RallyLineChart';
import PageHeader from '../../components/PageHeader';
import RallyBreadcrumbs from '../../components/RallyBreadcrumbs';
import { COMMODITY_SYMBOLS, COMMODITY_KEYS } from '../../constants/commodity';
import { normalizeChartSeries } from '../../utils/chartUtils';

export default function CommodityCompare() {
  const allSymbols = COMMODITY_KEYS;
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async (symbols) => {
    if (symbols.length === 0) { setChartData({}); return; }
    setLoading(true);
    try {
      const results = {};
      await Promise.all(
        symbols.map(async (sym) => {
          const res = await axios.get(`/api/commodity/${sym}/history`, { params: { period: '6mo', interval: '1d' } });
          results[sym] = res.data;
        })
      );
      setChartData(results);
    } catch {
      notifications.show({ title: 'خطا', message: 'دریافت داده‌های تاریخی کالا با مشکل مواجه شد', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(selectedSymbols); }, [selectedSymbols, fetchHistory]);

  const normalizedSeries = normalizeChartSeries(
    chartData,
    (h) => h.date?.slice(5, 10) || '',
    (h) => h.close,
  );

  return (
    <>
      <RallyBreadcrumbs items={[{ label: 'کالاها', path: '/commodity' }, { label: 'مقایسه' }]} />
      <PageHeader title="مقایسه کالاها">
        <Badge color="orange" variant="light">{selectedSymbols.length} کالا</Badge>
      </PageHeader>

      <RallyMainCard mb="md">
        <MultiSelect
          placeholder="تا ۵ کالا برای مقایسه انتخاب کنید"
          data={allSymbols.map(s => ({ value: s, label: COMMODITY_SYMBOLS[s]?.name_fa ?? s }))}
          value={selectedSymbols}
          onChange={v => setSelectedSymbols(v.slice(0, 5))}
          searchable
          clearable
          maxValues={5}
          mb="md"
        />
        {selectedSymbols.length > 0 ? (
          <RallyLineChart
            series={normalizedSeries}
            height={400}
            loading={loading}
            normalized
            yUnit="%"
          />
        ) : (
          <Text c="dimmed" ta="center" py="xl">
            کالاهای مورد نظر را انتخاب کنید
          </Text>
        )}
      </RallyMainCard>
    </>
  );
}
