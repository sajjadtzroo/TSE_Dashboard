import { useEffect, useState, useCallback } from 'react';
import { Alert, Badge, Group, MultiSelect, SimpleGrid, Title, Text } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../components/RallyMainCard';
import RallyLineChart from '../components/charts/RallyLineChart';
import PageHeader from '../components/PageHeader';
import rallyColors from '../theme/rallyColors';

const CHART_COLORS = [rallyColors.green, rallyColors.blue, rallyColors.purple, rallyColors.yellow, rallyColors.orange];

export default function Compare() {
  const [allSymbols, setAllSymbols] = useState([]);
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/companies').then((res) => {
      setAllSymbols((res.data || []).map((c) => c.symbol).filter(Boolean).sort());
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
  const normalizedSeries = Object.entries(chartData).map(([symbol, history], idx) => {
    if (!history || history.length === 0) return null;
    const basePrice = history[0].close;
    const data = history.map((h) => ({
      x: h.date?.slice(5) || '',
      y: basePrice ? Number((((h.close - basePrice) / basePrice) * 100).toFixed(2)) : 0,
    }));
    return { symbol, data, color: CHART_COLORS[idx % CHART_COLORS.length] };
  }).filter(Boolean);

  return (
    <>
      <PageHeader title="مقایسه نمادها">
        <Badge color="rally-green" variant="light">{selectedSymbols.length} نماد</Badge>
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
