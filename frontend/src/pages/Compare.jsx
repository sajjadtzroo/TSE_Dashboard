import { useEffect, useState, useCallback } from 'react';
import { Alert, Badge, Group, MultiSelect, SimpleGrid, Title, Text } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyLineChart from '../components/charts/RallyLineChart';
import PageHeader from '../components/PageHeader';
import { normalizeChartSeries } from '../utils/chartUtils';

export default function Compare() {
  const [allSymbols, setAllSymbols] = useState([]);
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/companies').then((res) => {
      // Deduplicate symbols using Set to avoid "Duplicate options" error
      const symbols = (res.data || []).map((c) => c.symbol).filter(Boolean);
      const uniqueSymbols = [...new Set(symbols)].sort();
      setAllSymbols(uniqueSymbols);
    }).catch(() => {});
  }, []);

  const fetchHistory = useCallback(async (symbols) => {
    if (symbols.length === 0) { setChartData({}); return; }
    setLoading(true);
    try {
      const results = {};
      await Promise.all(
        symbols.map(async (sym) => {
          const res = await axios.get(`/api/stocks/${sym}/history?days=90`);
          results[sym] = res.data;
        })
      );
      setChartData(results);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(selectedSymbols); }, [selectedSymbols, fetchHistory]);

  // Normalize data: show % change from first day
  const normalizedSeries = normalizeChartSeries(
    chartData,
    (h) => h.date?.slice(5) || '',
    (h) => h.close,
  );

  return (
    <>
      <PageHeader title="مقایسه نمادها">
        <Badge color="rally-primary" variant="light">{selectedSymbols.length} نماد</Badge>
      </PageHeader>

      <RallyMainCard mb="md">
        <MultiSelect
          placeholder="تا ۵ نماد برای مقایسه انتخاب کنید"
          data={allSymbols.map((s) => ({ value: s, label: s }))}
          value={selectedSymbols}
          onChange={(v) => setSelectedSymbols(v.slice(0, 5))}
          searchable
          clearable
          maxValues={5}
          size="sm"
        />
      </RallyMainCard>

      {normalizedSeries.length > 0 && (
        <RallyMainCard title="تغییر قیمت نرمال‌شده (٪، ۹۰ روز)">
          {normalizedSeries.map((series) => (
            <div key={series.symbol} style={{ marginBottom: 8 }}>
              <Badge size="xs" color={series.color} variant="filled" mb={4}>
                {series.symbol}
              </Badge>
              <RallyLineChart
                data={series.data}
                lineColor={series.color}
                height={200}
                yFormatter={(v) => `${v}%`}
              />
            </div>
          ))}
        </RallyMainCard>
      )}

      {selectedSymbols.length === 0 && (
        <RallyMainCard>
          <Text c="dimmed" ta="center" py="xl">
            نمادها را از بالا انتخاب کنید
          </Text>
        </RallyMainCard>
      )}
    </>
  );
}
