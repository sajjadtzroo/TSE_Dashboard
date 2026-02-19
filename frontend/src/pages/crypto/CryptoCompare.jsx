import { useState, useCallback, useEffect } from 'react';
import { Badge, MultiSelect, Text } from '@mantine/core';
import axios from 'axios';
import RallyMainCard from '../../components/RallyMainCard';
import RallyLineChart from '../../components/charts/RallyLineChart';
import PageHeader from '../../components/PageHeader';
import { useCryptoMarket } from '../../hooks/useCryptoData';
import { normalizeChartSeries } from '../../utils/chartUtils';

export default function CryptoCompare() {
  const { data: market = [] } = useCryptoMarket();
  const allSymbols = market.map(c => c.symbol).sort();
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
          const res = await axios.get(`/api/crypto/${sym}/history`, { params: { interval: '1day', limit: 90 } });
          results[sym] = res.data;
        })
      );
      setChartData(results);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(selectedSymbols); }, [selectedSymbols, fetchHistory]);

  const normalizedSeries = normalizeChartSeries(
    chartData,
    (h) => h.open_time?.slice(5, 10) || '',
    (h) => h.close,
  );

  return (
    <>
      <PageHeader title="مقایسه رمزارزها">
        <Badge color="yellow" variant="light">{selectedSymbols.length} رمزارز</Badge>
      </PageHeader>

      <RallyMainCard mb="md">
        <MultiSelect
          placeholder="تا ۵ رمزارز برای مقایسه انتخاب کنید"
          data={allSymbols.map(s => ({ value: s, label: s }))}
          value={selectedSymbols}
          onChange={v => setSelectedSymbols(v.slice(0, 5))}
          searchable
          clearable
          maxValues={5}
          size="sm"
        />
      </RallyMainCard>

      {normalizedSeries.length > 0 && (
        <RallyMainCard title="تغییر قیمت نرمال‌شده (٪، ۹۰ روز)">
          {normalizedSeries.map(series => (
            <div key={series.symbol} style={{ marginBottom: 8 }}>
              <Badge size="xs" color={series.color} variant="filled" mb={4}>
                {series.symbol}
              </Badge>
              <RallyLineChart
                data={series.data}
                lineColor={series.color}
                height={200}
                yFormatter={v => `${v}%`}
              />
            </div>
          ))}
        </RallyMainCard>
      )}

      {selectedSymbols.length === 0 && (
        <RallyMainCard>
          <Text c="dimmed" ta="center" py="xl">رمزارزها را از بالا انتخاب کنید</Text>
        </RallyMainCard>
      )}
    </>
  );
}
