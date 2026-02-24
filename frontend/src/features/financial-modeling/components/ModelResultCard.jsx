import { Badge, Box, Button, Card, Grid, Group, Stack, Text } from '@mantine/core';
import { IconDownload, IconTable } from '@tabler/icons-react';

const MODEL_META = {
  dcf: { label: 'ارزش‌گذاری DCF', color: 'teal', metrics: ['enterprise_value', 'equity_value', 'price_per_share', 'wacc_pct'] },
  pl: { label: 'سود و زیان', color: 'blue', metrics: [] },
  loan_amortization: { label: 'جدول اقساط', color: 'violet', metrics: [] },
  bond: { label: 'اوراق بدهی', color: 'orange', metrics: ['price', 'ytm_pct', 'macaulay_duration_years', 'modified_duration'] },
  ddm_gordon: { label: 'DDM گوردون', color: 'cyan', metrics: ['intrinsic_value', 'discount_rate_pct', 'growth_rate_pct'] },
  ddm_h_model: { label: 'DDM مدل H', color: 'cyan', metrics: ['intrinsic_value', 'discount_rate_pct'] },
  ddm_multistage: { label: 'DDM چندمرحله‌ای', color: 'cyan', metrics: ['intrinsic_value', 'pv_dividends', 'pv_terminal'] },
  residual_income: { label: 'درآمد باقیمانده', color: 'grape', metrics: ['intrinsic_value', 'premium_to_book', 'pv_explicit_ri', 'pv_continuing_ri'] },
  multiples: { label: 'ضرایب قیمتی', color: 'yellow', metrics: ['implied_price_min', 'implied_price_median', 'implied_price_max'] },
  wacc: { label: 'WACC', color: 'teal', metrics: ['wacc_pct', 'equity_weight', 'debt_weight', 'after_tax_cost_of_debt_pct'] },
  capm: { label: 'CAPM', color: 'teal', metrics: ['cost_of_equity_pct', 'beta', 'risk_free_rate_pct', 'equity_risk_premium_pct'] },
  fcfe: { label: 'FCFE', color: 'indigo', metrics: ['fcfe'] },
  revenue_model: { label: 'مدل درآمد', color: 'green', metrics: ['total_revenue'] },
  wc_model: { label: 'سرمایه در گردش', color: 'blue', metrics: ['ccc'] },
  capex_schedule: { label: 'برنامه CapEx', color: 'orange', metrics: [] },
  debt_schedule: { label: 'برنامه بدهی', color: 'red', metrics: [] },
};

const METRIC_LABELS = {
  enterprise_value: 'ارزش سازمان (EV)',
  equity_value: 'ارزش حقوق صاحبان',
  price_per_share: 'ارزش هر سهم (ریال)',
  wacc_pct: 'WACC (%)',
  price: 'قیمت اوراق',
  ytm_pct: 'YTM (%)',
  macaulay_duration_years: 'دیرش مکالی',
  modified_duration: 'دیرش اصلاح‌شده',
  intrinsic_value: 'ارزش ذاتی',
  discount_rate_pct: 'نرخ تنزیل (%)',
  growth_rate_pct: 'نرخ رشد (%)',
  pv_dividends: 'PV سود سهام',
  pv_terminal: 'PV ارزش پایانه',
  premium_to_book: 'صرف به ارزش دفتری',
  pv_explicit_ri: 'PV RI صریح',
  pv_continuing_ri: 'PV RI ادامه',
  implied_price_min: 'قیمت کمینه ضمنی',
  implied_price_median: 'قیمت میانه ضمنی',
  implied_price_max: 'قیمت بیشینه ضمنی',
  equity_weight: 'وزن حقوق صاحبان',
  debt_weight: 'وزن بدهی',
  after_tax_cost_of_debt_pct: 'هزینه بدهی پس از مالیات (%)',
  cost_of_equity_pct: 'هزینه حقوق صاحبان (%)',
  risk_free_rate_pct: 'نرخ بدون ریسک (%)',
  equity_risk_premium_pct: 'صرف ریسک بازار (%)',
  beta: 'بتا',
  fcfe: 'FCFE',
  total_revenue: 'کل درآمد',
  ccc: 'چرخه تبدیل نقد (روز)',
};

function formatValue(key, value) {
  if (value == null) return '—';
  if (key.endsWith('_pct') || key === 'wacc_pct' || key === 'ytm_pct') {
    return `${Number(value).toLocaleString('fa-IR', { maximumFractionDigits: 2 })}٪`;
  }
  if (typeof value === 'number') {
    return Number(value).toLocaleString('fa-IR', { maximumFractionDigits: 2 });
  }
  return String(value);
}

export default function ModelResultCard({ modelData, downloadUrl }) {
  if (!modelData) return null;

  const modelType = modelData.model_type;
  const meta = MODEL_META[modelType] || { label: 'مدل مالی', color: 'gray', metrics: [] };

  // Pick top 4 metrics to display
  const metricsToShow = meta.metrics.length > 0
    ? meta.metrics
    : Object.keys(modelData).filter(k => !['model_type', 'company_name', 'download_url', 'sheet_url', 'schedule', 'projections'].includes(k)).slice(0, 4);

  return (
    <Card
      radius="md"
      p="md"
      mt="xs"
      style={{
        background: 'rgba(19, 23, 32, 0.9)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        direction: 'rtl',
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconTable size={16} stroke={1.5} color="#10B981" />
            <Text fw={700} size="sm" c="white">
              {modelData.company_name || 'مدل مالی'}
            </Text>
          </Group>
          <Badge color={meta.color} variant="light" size="sm">
            {meta.label}
          </Badge>
        </Group>

        <Grid gutter="xs">
          {metricsToShow.map((key) => (
            <Grid.Col span={6} key={key}>
              <Box
                p="xs"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 6,
                  border: '1px solid rgba(148,163,184,0.08)',
                }}
              >
                <Text size="10px" c="dimmed" mb={2}>
                  {METRIC_LABELS[key] || key}
                </Text>
                <Text size="sm" fw={600} c="white">
                  {formatValue(key, modelData[key])}
                </Text>
              </Box>
            </Grid.Col>
          ))}
        </Grid>

        {downloadUrl && (
          <Button
            component="a"
            href={downloadUrl}
            leftSection={<IconDownload size={14} />}
            variant="light"
            color="green"
            size="xs"
            fullWidth
            mt={4}
          >
            دانلود فایل اکسل
          </Button>
        )}
      </Stack>
    </Card>
  );
}
