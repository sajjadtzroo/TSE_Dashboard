import { Box, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconBuildingBank, IconCalculator, IconChartLine, IconChartBar, IconCoin } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

const QUICK_STARTS = [
  {
    label: 'مدل DCF',
    prompt: 'یک مدل DCF برای شرکتی با EBIT ۵۰۰ میلیارد ریال، WACC 22% و نرخ رشد پایانه 3% بساز',
    icon: IconChartLine,
    color: rallyColors.green,
  },
  {
    label: 'صورت سود و زیان',
    prompt: 'پیش‌بینی P&L برای ۳ سال با درآمد پایه ۱۰۰۰ میلیارد ریال و رشد ۱۵٪ سالانه',
    icon: IconCalculator,
    color: rallyColors.blue,
  },
  {
    label: 'WACC و CAPM',
    prompt: 'محاسبه WACC برای شرکتی با بتای ۱.۲، نرخ بدون ریسک ۲۰٪، صرف ریسک بازار ۶٪، نسبت بدهی ۳۰٪ و نرخ بهره ۱۸٪',
    icon: IconChartBar,
    color: '#14B8A6',
  },
  {
    label: 'مدل DDM',
    prompt: 'ارزش‌گذاری سهام با سود سهام پایه ۵۰۰ ریال، نرخ رشد ۸٪ و نرخ تنزیل ۱۵٪ با مدل گوردون',
    icon: IconCoin,
    color: '#06B6D4',
  },
  {
    label: 'جدول اقساط',
    prompt: 'جدول استهلاک وام ۵۰۰ میلیون ریالی با نرخ ۱۸٪ سالانه و مدت ۳۶ ماه',
    icon: IconBuildingBank,
    color: rallyColors.purple,
  },
  {
    label: 'DCF کامل از پایه',
    prompt: 'یک DCF کامل برای شرکتی با درآمد پایه ۱۰۰۰ میلیارد ریال بساز: ابتدا مدل درآمد با رشد ۱۵٪ برای ۳ سال، سپس سرمایه در گردش با DSO=30، DIO=45، DPO=20 و COGS=60٪، سپس DCF با WACC=22٪',
    icon: IconChartLine,
    color: '#6366F1',
  },
  {
    label: 'مدل سه‌گانه IS+BS+CF',
    prompt: 'صورت‌های مالی سه‌گانه برای شرکتی با EBIT 200 میلیارد ریال، وام 400 میلیارد با نرخ ۱۸٪، CapEx 80 میلیارد و D&A 50 میلیارد بساز',
    icon: IconChartLine,
    color: '#0D9488',
  },
  {
    label: 'Beta + WACC + DCF',
    prompt: 'برای شرکتی با بتای مشاهده‌شده ۱.۵ و D/E=۰.۸ و نرخ مالیات ۲۵٪، ابتدا بتا را با معادله هامادا غیراهرم کن، سپس WACC با نرخ بدون ریسک ۲۰٪ و صرف ریسک ۶٪ محاسبه کن',
    icon: IconChartBar,
    color: '#64748B',
  },
];

/** Derive bg/border rgba from a hex color */
function colorAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ModelEmptyState({ onSendPrompt }) {
  return (
    <Stack align="center" py={40} gap="lg" px="md" maw={560} mx="auto">
      <Box
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
      >
        <IconCalculator size={26} stroke={1.5} color={rallyColors.blue} />
      </Box>

      <Stack gap={4} align="center">
        <Text fw={700} size="lg" c={rallyColors.textPrimary} ta="center" style={{ direction: 'rtl' }}>
          مدل‌ساز مالی هوشمند
        </Text>
        <Text size="sm" c="dimmed" ta="center" style={{ direction: 'rtl', maxWidth: 320, lineHeight: 1.6 }}>
          مدل‌های مالی خود را از طریق گفتگو بسازید. DCF، DDM، WACC، CAPM، اوراق، وام و بیشتر.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing={8} w="100%">
        {QUICK_STARTS.map((qs) => (
          <UnstyledButton
            key={qs.label}
            onClick={() => onSendPrompt(qs.prompt)}
            style={{
              background: colorAlpha(qs.color, 0.06),
              border: `1px solid ${colorAlpha(qs.color, 0.15)}`,
              borderRadius: 10,
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              direction: 'rtl',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colorAlpha(qs.color, 0.12);
              e.currentTarget.style.borderColor = colorAlpha(qs.color, 0.3);
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colorAlpha(qs.color, 0.06);
              e.currentTarget.style.borderColor = colorAlpha(qs.color, 0.15);
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Box style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <qs.icon size={16} color={qs.color} style={{ flexShrink: 0, marginTop: 2 }} />
              <Box>
                <Text size="sm" fw={600} style={{ color: qs.color }}>
                  {qs.label}
                </Text>
                <Text size="xs" c="dimmed" mt={2} style={{ direction: 'rtl', lineHeight: 1.5 }}>
                  {qs.prompt.substring(0, 55)}...
                </Text>
              </Box>
            </Box>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
