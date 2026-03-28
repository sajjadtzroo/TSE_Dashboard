import { Card, Divider, Group, Text, Badge } from '@mantine/core';
import RallyKPICard from '../../components/RallyKPICard';
import rallyColors from '../../theme/rallyColors';
import { formatNum, formatMetric } from '../../utils/formatUtils';

function InfoRow({ label, value, color }) {
  return (
    <Group justify="space-between" py={4}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm" fw={500} c={color}>{value}</Text>
    </Group>
  );
}

export default function ETFInfoSidebar({ etfData, metrics, bubbleStats, loading }) {
  if (loading || !etfData) return null;

  const bubbleColor = (etfData.bubble_pct ?? 0) >= 0 ? rallyColors.green : rallyColors.red;

  return (
    <div style={{
      position: 'sticky',
      top: 70,
      maxHeight: 'calc(100vh - 90px)',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(156, 163, 175, 0.2) transparent',
    }}>
      {/* NAV Card */}
      <Card withBorder radius="md" mb="md">
        <InfoRow label="NAV صدور" value={formatNum(etfData.nav_issuance)} />
        <InfoRow label="NAV ابطال" value={formatNum(etfData.nav_redemption)} />
        <Divider my="xs" color="#1E2234" />
        <InfoRow label="آخرین قیمت" value={formatNum(etfData.last_price)} />
        <InfoRow
          label="حباب"
          value={`${(etfData.bubble_pct ?? 0) > 0 ? '+' : ''}${(etfData.bubble_pct ?? 0).toFixed(2)}٪`}
          color={bubbleColor}
        />
        <Divider my="xs" color="#1E2234" />
        <Group justify="space-between" py={4}>
          <Text size="sm" c="dimmed">نوع صندوق</Text>
          <Badge color="rally-blue" variant="light" size="sm">{etfData.fund_type || '—'}</Badge>
        </Group>
      </Card>

      {/* Premium/Discount (Bubble) Analytics */}
      {bubbleStats && (
        <Card withBorder radius="md" mb="md">
          <Text size="sm" fw={600} mb="xs">تحلیل حباب (پریمیوم/تخفیف)</Text>
          <InfoRow label="میانگین حباب" value={`${bubbleStats.mean >= 0 ? '+' : ''}${bubbleStats.mean.toFixed(2)}٪`} color={bubbleStats.mean >= 0 ? rallyColors.green : rallyColors.red} />
          <InfoRow label="انحراف معیار" value={`${bubbleStats.std.toFixed(2)}٪`} />
          <InfoRow
            label="Z-Score فعلی"
            value={bubbleStats.zScore.toFixed(2)}
            color={Math.abs(bubbleStats.zScore) > 2 ? rallyColors.red : Math.abs(bubbleStats.zScore) > 1 ? rallyColors.yellow : rallyColors.textSecondary}
          />
          {Math.abs(bubbleStats.zScore) > 2 && (
            <Text size="xs" c={rallyColors.red} mt={4}>
              حباب فعلی از محدوده معمول فاصله زیادی دارد (|Z| {'>'} ۲)
            </Text>
          )}
        </Card>
      )}

      {/* Key risk metrics summary */}
      {metrics && (
        <>
          <RallyKPICard
            title="نسبت شارپ"
            value={formatMetric(metrics.sharpe, 2)}
            animateValue
            color={rallyColors.blue}
            mb="sm"
          />
          <RallyKPICard
            title="بتا (β)"
            value={formatMetric(metrics.beta, 2)}
            animateValue
            color={rallyColors.purple}
            mb="sm"
          />
          <RallyKPICard
            title="VaR ۹۵٪"
            value={formatMetric(metrics.var95 != null ? metrics.var95 * 100 : null, 2, '٪')}
            animateValue
            color={rallyColors.red}
            mb="sm"
          />
          <RallyKPICard
            title="حداکثر افت"
            value={formatMetric(metrics.maxDrawdown != null ? metrics.maxDrawdown * 100 : null, 2, '٪')}
            animateValue
            color={rallyColors.yellow}
            mb="sm"
          />
          {metrics.mSquared != null && (
            <RallyKPICard
              title="M² (مودیلیانی)"
              value={formatMetric(metrics.mSquared * 100, 2, '٪')}
              animateValue
              color={rallyColors.primary}
              mb="sm"
            />
          )}
        </>
      )}
    </div>
  );
}
