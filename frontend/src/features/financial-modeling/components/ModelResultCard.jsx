import { Badge, Box, Button, Card, Grid, Group, Stack, Text } from '@mantine/core';
import { IconDownload, IconTable } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import { MODEL_META, METRIC_LABELS } from '../../../constants/financialModeling';
import styles from './FinancialModeling.module.css';

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

  const metricsToShow = meta.metrics.length > 0
    ? meta.metrics
    : Object.keys(modelData).filter(k => !['model_type', 'company_name', 'download_url', 'sheet_url', 'schedule', 'projections'].includes(k)).slice(0, 4);

  return (
    <Card
      radius="md"
      p="md"
      mt="xs"
      className={`${styles.resultCard} ${styles.resultCardEnter}`}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconTable size={16} stroke={1.5} color={rallyColors.blue} />
            <Text fw={700} size="sm" c={rallyColors.textPrimary}>
              {modelData.company_name || 'مدل مالی'}
            </Text>
          </Group>
          <Badge color={meta.color} variant="light" size="sm">
            {meta.label}
          </Badge>
        </Group>

        {metricsToShow.length > 0 && (
          <Grid gutter="xs">
            {metricsToShow.map((key) => (
              <Grid.Col span={6} key={key}>
                <Box p="xs" className={styles.metricBox}>
                  <Text size="10px" c="dimmed" mb={2}>
                    {METRIC_LABELS[key] || key}
                  </Text>
                  <Text size="sm" fw={600} c={rallyColors.textPrimary} className={styles.metricValue}>
                    {formatValue(key, modelData[key])}
                  </Text>
                </Box>
              </Grid.Col>
            ))}
          </Grid>
        )}

        {downloadUrl && (
          <Button
            component="a"
            href={downloadUrl}
            leftSection={<IconDownload size={14} />}
            variant="light"
            color="blue"
            size="xs"
            fullWidth
            mt={4}
            radius="md"
          >
            دانلود فایل اکسل
          </Button>
        )}
      </Stack>
    </Card>
  );
}
