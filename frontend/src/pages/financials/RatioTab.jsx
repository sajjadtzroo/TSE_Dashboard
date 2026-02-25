import { useState } from 'react';
import {
  Accordion,
  Badge,
  Button,
  Chip,
  Divider,
  Group,
  Loader,
  Paper,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useRatioExplain } from '../../hooks/useMarketData';
import SparklineMini from './SparklineMini';
import { toPersianNum, formatPercent, formatMetric } from '../../utils/formatUtils';
import classes from './RatioTab.module.css';

// ── Ratio definitions ────────────────────────────────────────────────────────

const RATIO_CATEGORIES = [
  {
    key: 'profitability',
    label: 'سودآوری',
    cfaLevel: 'L1',
    ratios: [
      { key: 'gross_margin',       labelFa: 'حاشیه ناخالص',          labelEn: 'Gross Profit Margin',    isPct: true  },
      { key: 'operating_margin',   labelFa: 'حاشیه عملیاتی',         labelEn: 'Operating Profit Margin',isPct: true  },
      { key: 'net_margin',         labelFa: 'حاشیه سود خالص',        labelEn: 'Net Profit Margin',       isPct: true  },
      { key: 'roa',                labelFa: 'بازده دارایی‌ها (ROA)', labelEn: 'Return on Assets',        isPct: true  },
      { key: 'roe',                labelFa: 'بازده حقوق مالکانه (ROE)', labelEn: 'Return on Equity',    isPct: true  },
    ],
  },
  {
    key: 'leverage',
    label: 'اهرمی',
    cfaLevel: 'L1',
    ratios: [
      { key: 'debt_to_assets',    labelFa: 'بدهی به دارایی',         labelEn: 'Debt-to-Assets Ratio',   isPct: true  },
      { key: 'debt_to_equity',    labelFa: 'بدهی به حقوق مالکانه',  labelEn: 'Debt-to-Equity Ratio',   isPct: true  },
      { key: 'equity_multiplier', labelFa: 'ضریب مالکانه',           labelEn: 'Equity Multiplier',      isPct: false },
    ],
  },
  {
    key: 'efficiency',
    label: 'کارایی',
    cfaLevel: 'L1',
    ratios: [
      { key: 'asset_turnover', labelFa: 'گردش دارایی‌ها', labelEn: 'Asset Turnover Ratio', isPct: false },
    ],
  },
  {
    key: 'dupont',
    label: 'DuPont',
    cfaLevel: 'L2',
    ratios: [
      { key: 'net_margin',         labelFa: 'حاشیه سود خالص',        labelEn: 'Net Profit Margin',       isPct: true  },
      { key: 'asset_turnover',     labelFa: 'گردش دارایی‌ها',        labelEn: 'Asset Turnover Ratio',    isPct: false },
      { key: 'equity_multiplier',  labelFa: 'ضریب مالکانه',          labelEn: 'Equity Multiplier',       isPct: false },
      { key: 'roe',                labelFa: 'ROE = NP × AT × EM',    labelEn: 'Return on Equity DuPont', isPct: true  },
    ],
  },
];

// ── Main component ───────────────────────────────────────────────────────────

export default function RatioTab({ ratioData, isRatioLoading, symbol }) {
  const [activeCategory, setActiveCategory] = useState('profitability');

  if (isRatioLoading) {
    return (
      <div style={{ padding: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={88} mb={8} radius="md" />
        ))}
      </div>
    );
  }

  if (!ratioData) {
    return (
      <div style={{ padding: '48px 16px', textAlign: 'center' }}>
        <Text size="lg" c="dimmed">
          داده‌های کافی برای محاسبه نسبت‌ها موجود نیست
        </Text>
        <Text size="sm" c="dimmed" mt="xs">
          برای محاسبه نسبت‌ها، هم صورت سود و زیان و هم ترازنامه در همان دوره‌ها لازم است
        </Text>
      </div>
    );
  }

  const category = RATIO_CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div>
      <Group gap="sm" px="md" pt="md" pb="sm" wrap="wrap" align="center">
        {RATIO_CATEGORIES.map((cat) => (
          <Chip
            key={cat.key}
            checked={activeCategory === cat.key}
            onChange={() => setActiveCategory(cat.key)}
            size="sm"
            variant="light"
          >
            {cat.label}
            <Badge size="xs" variant="dot" color={cat.cfaLevel === 'L2' ? 'orange' : 'blue'} ml={4}>
              CFA {cat.cfaLevel}
            </Badge>
          </Chip>
        ))}
      </Group>

      <Stack gap="sm" px="md" pb="md">
        {category.key === 'dupont' && (
          <Paper p="sm" radius="md" style={{ background: 'rgba(251, 146, 60, 0.06)', border: '1px solid rgba(251, 146, 60, 0.2)' }}>
            <Text size="xs" c="orange.4" fw={500}>
              DuPont Analysis — CFA L2: ROE = حاشیه سود × گردش دارایی × ضریب مالکانه
            </Text>
          </Paper>
        )}
        {category.ratios.map((ratio) => (
          <RatioCard
            key={ratio.key}
            ratio={ratio}
            values={ratioData.ratioValues[ratio.key] ?? []}
            periodLabels={ratioData.periodLabels}
            cfaLevel={category.cfaLevel}
            symbol={symbol}
          />
        ))}
      </Stack>
    </div>
  );
}

// ── Ratio card ───────────────────────────────────────────────────────────────

function RatioCard({ ratio, values, periodLabels, cfaLevel, symbol }) {
  const [explainOpen, setExplainOpen] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const { mutate: fetchExplain, isPending: isExplaining } = useRatioExplain(symbol);

  function handleExplain() {
    if (explanation) {
      setExplainOpen((v) => !v);
      return;
    }
    fetchExplain(
      { ratio_name: ratio.labelFa, ratio_name_en: ratio.labelEn },
      {
        onSuccess: (data) => {
          setExplanation(data);
          setExplainOpen(true);
        },
      },
    );
  }

  return (
    <Paper p="sm" radius="md" className={classes.ratioCard}>
      <Group justify="space-between" mb={8} wrap="nowrap">
        <Group gap={6} wrap="nowrap">
          <Text size="sm" fw={600}>
            {ratio.labelFa}
          </Text>
          <Badge size="xs" variant="light" color={cfaLevel === 'L2' ? 'orange' : 'blue'}>
            CFA {cfaLevel}
          </Badge>
        </Group>
        <Button
          size="xs"
          variant="subtle"
          color="gray"
          leftSection={isExplaining ? <Loader size={10} /> : <IconInfoCircle size={13} />}
          onClick={handleExplain}
          loading={isExplaining}
          px={6}
        >
          توضیح
        </Button>
      </Group>

      <Group gap="md" wrap="nowrap" align="flex-end">
        <div className={classes.periodsRow}>
          {periodLabels.map((label, i) => (
            <div key={label} className={classes.periodItem}>
              <Text size="xs" c="dimmed" mb={2}>
                {toPersianNum(label?.slice(0, 7))}
              </Text>
              <ValueDisplay
                value={values[i]}
                prevValue={i > 0 ? values[i - 1] : null}
                isPct={ratio.isPct}
              />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 2 }}>
          <SparklineMini values={values} />
        </div>
      </Group>

      {explainOpen && explanation && (
        <>
          <Divider my="sm" />
          <ExplanationBlock explanation={explanation} />
        </>
      )}
    </Paper>
  );
}

// ── Value display with trend arrow ───────────────────────────────────────────

function ValueDisplay({ value, prevValue, isPct }) {
  if (value == null) {
    return <Text size="sm" c="dimmed">—</Text>;
  }

  const formatted = isPct
    ? formatPercent(value, 1)
    : formatMetric(value, 2, 'x');

  let trendColor = 'var(--mantine-color-text)';
  if (prevValue != null) {
    trendColor = value > prevValue
      ? 'var(--mantine-color-green-5)'
      : value < prevValue
      ? 'var(--mantine-color-red-5)'
      : 'var(--mantine-color-dimmed)';
  }

  return (
    <Text size="sm" fw={600} style={{ color: trendColor, fontVariantNumeric: 'tabular-nums' }}>
      {formatted}
    </Text>
  );
}

// ── CFA explanation block ────────────────────────────────────────────────────

function ExplanationBlock({ explanation }) {
  return (
    <div>
      <Text size="xs" style={{ lineHeight: 1.7, color: 'var(--mantine-color-dimmed)' }}>
        {explanation.explanation}
      </Text>
      {explanation.sources?.length > 0 && (
        <Group gap={4} mt="xs" wrap="wrap">
          {explanation.sources.map((src, i) => (
            <Badge key={i} size="xs" variant="outline" color="blue">
              {src.title}
              {src.page_numbers ? ` — ص.${toPersianNum(src.page_numbers)}` : ''}
            </Badge>
          ))}
        </Group>
      )}
    </div>
  );
}
