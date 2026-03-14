import { Box } from '@mantine/core';
import RallyBarChart from '../../../components/charts/RallyBarChart';
import RallyLineChart from '../../../components/charts/RallyLineChart';
import RallyAreaChart from '../../../components/charts/RallyAreaChart';
import RallyPieChart from '../../../components/charts/RallyPieChart';
import { METRIC_LABELS } from '../../../constants/financialModeling';

const CHART_HEIGHT = 180;

function label(key) {
  return METRIC_LABELS[key] || key;
}

function formatNum(v) {
  if (v == null) return '—';
  return Number(v).toLocaleString('fa-IR', { maximumFractionDigits: 2 });
}

/**
 * Renders a mini chart inside the model result card based on model type.
 * Data is extracted from the model's response message.
 */
export default function ModelResultChart({ modelType, modelData }) {
  if (!modelType || !modelData) return null;

  try {
    switch (modelType) {
      case 'dcf': {
        // FCF projections
        const projections = modelData.projections || modelData.fcf_projections;
        if (!Array.isArray(projections) || projections.length === 0) return null;
        const data = projections.map((p, i) => ({
          x: p.year || `سال ${i + 1}`,
          y: p.fcf ?? p.value ?? p.free_cash_flow ?? 0,
        }));
        return (
          <Box mt="xs">
            <RallyBarChart data={data} height={CHART_HEIGHT} horizontal barColor="#14B8A6" aria-label="پیش‌بینی FCF" />
          </Box>
        );
      }

      case 'pl': {
        // Revenue vs COGS vs Net Income
        const items = [];
        if (modelData.total_revenue) items.push({ x: 'درآمد', y: modelData.total_revenue });
        if (modelData.total_cogs || modelData.cogs) items.push({ x: 'بهای تمام‌شده', y: modelData.total_cogs || modelData.cogs });
        if (modelData.net_income) items.push({ x: 'سود خالص', y: modelData.net_income });
        if (items.length === 0) return null;
        return (
          <Box mt="xs">
            <RallyBarChart data={items} height={CHART_HEIGHT} barColor="#3B82F6" aria-label="صورت سود و زیان" />
          </Box>
        );
      }

      case 'equity_valuation': {
        // Implied prices comparison
        const items = [];
        if (modelData.implied_price_dcf_gordon) items.push({ x: 'DCF گوردون', y: modelData.implied_price_dcf_gordon });
        if (modelData.implied_price_dcf_exit) items.push({ x: 'DCF خروج', y: modelData.implied_price_dcf_exit });
        if (modelData.implied_price_blended) items.push({ x: 'ترکیبی', y: modelData.implied_price_blended });
        if (modelData.current_price) items.push({ x: 'قیمت فعلی', y: modelData.current_price });
        if (items.length === 0) return null;
        return (
          <Box mt="xs">
            <RallyBarChart data={items} height={CHART_HEIGHT} barColor="#8B5CF6" autoColorByValue aria-label="مقایسه ارزش‌گذاری" />
          </Box>
        );
      }

      case 'bond': {
        // Cash flows over time
        const cashflows = modelData.cash_flows || modelData.schedule;
        if (!Array.isArray(cashflows) || cashflows.length === 0) return null;
        const data = cashflows.map((cf, i) => ({
          x: cf.period || `دوره ${i + 1}`,
          y: cf.total ?? cf.cash_flow ?? cf.coupon ?? 0,
        }));
        return (
          <Box mt="xs">
            <RallyLineChart data={data} height={CHART_HEIGHT} lineColor="#F59E0B" aria-label="جریان نقد اوراق" />
          </Box>
        );
      }

      case 'loan_amortization': {
        // Principal vs interest stacked
        const schedule = modelData.schedule || modelData.amortization;
        if (!Array.isArray(schedule) || schedule.length === 0) return null;
        // Use area chart for principal payments
        const data = schedule.map((row, i) => ({
          x: row.period || `${i + 1}`,
          y: row.principal_payment ?? row.principal ?? 0,
        }));
        return (
          <Box mt="xs">
            <RallyAreaChart data={data} height={CHART_HEIGHT} fillColor="#8B5CF6" aria-label="پرداخت اصل وام" />
          </Box>
        );
      }

      case 'wacc': {
        // Capital structure pie
        const equity = modelData.equity_weight;
        const debt = modelData.debt_weight;
        if (equity == null && debt == null) return null;
        const data = [
          { name: 'حقوق صاحبان', value: Number(equity) || 0 },
          { name: 'بدهی', value: Number(debt) || 0 },
        ].filter(d => d.value > 0);
        if (data.length === 0) return null;
        return (
          <Box mt="xs" style={{ display: 'flex', justifyContent: 'center' }}>
            <RallyPieChart data={data} height={CHART_HEIGHT} width={CHART_HEIGHT} innerRadius={40} centerLabel="ساختار" centerValue={`${formatNum((equity || 0) * 100)}٪`} />
          </Box>
        );
      }

      case 'monte_carlo': {
        // Fan chart with percentiles
        const percentiles = modelData.percentiles || modelData.results;
        if (!Array.isArray(percentiles) || percentiles.length === 0) return null;
        const data = percentiles.map((p, i) => ({
          x: p.label || `سناریو ${i + 1}`,
          y: p.p50 ?? p.median ?? p.value ?? 0,
        }));
        return (
          <Box mt="xs">
            <RallyAreaChart data={data} height={CHART_HEIGHT} fillColor="#14B8A6" aria-label="شبیه‌سازی مونت‌کارلو" />
          </Box>
        );
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}
