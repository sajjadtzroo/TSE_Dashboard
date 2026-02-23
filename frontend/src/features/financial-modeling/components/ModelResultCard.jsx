import { Badge, Box, Button, Card, Grid, Group, Stack, Text } from '@mantine/core';
import { IconExternalLink, IconTable } from '@tabler/icons-react';

const MODEL_META = {
  dcf: { label: 'ارزش‌گذاری DCF', color: 'teal', metrics: ['enterprise_value', 'equity_value', 'price_per_share', 'wacc_pct'] },
  pl: { label: 'سود و زیان', color: 'blue', metrics: [] },
  loan_amortization: { label: 'جدول اقساط', color: 'violet', metrics: [] },
  bond: { label: 'اوراق بدهی', color: 'orange', metrics: ['price', 'ytm_pct', 'macaulay_duration_years', 'modified_duration'] },
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

export default function ModelResultCard({ modelData, sheetUrl }) {
  if (!modelData) return null;

  const modelType = modelData.model_type;
  const meta = MODEL_META[modelType] || { label: 'مدل مالی', color: 'gray', metrics: [] };

  // Pick top 4 metrics to display
  const metricsToShow = meta.metrics.length > 0
    ? meta.metrics
    : Object.keys(modelData).filter(k => !['model_type', 'company_name', 'sheet_url', 'schedule', 'projections'].includes(k)).slice(0, 4);

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

        {sheetUrl && (
          <Button
            component="a"
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={14} />}
            variant="light"
            color="teal"
            size="xs"
            fullWidth
            mt={4}
          >
            باز کردن در گوگل شیتس
          </Button>
        )}
      </Stack>
    </Card>
  );
}
