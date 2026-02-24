import { Box, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconBuildingBank, IconCalculator, IconChartLine, IconChartBar, IconCoin } from '@tabler/icons-react';

const QUICK_STARTS = [
  {
    label: 'مدل DCF',
    prompt: 'یک مدل DCF برای شرکتی با EBIT ۵۰۰ میلیارد ریال، WACC 22% و نرخ رشد پایانه 3% بساز',
    icon: IconChartLine,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.2)',
  },
  {
    label: 'صورت سود و زیان',
    prompt: 'پیش‌بینی P&L برای ۳ سال با درآمد پایه ۱۰۰۰ میلیارد ریال و رشد ۱۵٪ سالانه',
    icon: IconCalculator,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.2)',
  },
  {
    label: 'WACC و CAPM',
    prompt: 'محاسبه WACC برای شرکتی با بتای ۱.۲، نرخ بدون ریسک ۲۰٪، صرف ریسک بازار ۶٪، نسبت بدهی ۳۰٪ و نرخ بهره ۱۸٪',
    icon: IconChartBar,
    color: '#14B8A6',
    bg: 'rgba(20, 184, 166, 0.08)',
    border: 'rgba(20, 184, 166, 0.2)',
  },
  {
    label: 'مدل DDM',
    prompt: 'ارزش‌گذاری سهام با سود سهام پایه ۵۰۰ ریال، نرخ رشد ۸٪ و نرخ تنزیل ۱۵٪ با مدل گوردون',
    icon: IconCoin,
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.08)',
    border: 'rgba(6, 182, 212, 0.2)',
  },
  {
    label: 'جدول اقساط',
    prompt: 'جدول استهلاک وام ۵۰۰ میلیون ریالی با نرخ ۱۸٪ سالانه و مدت ۳۶ ماه',
    icon: IconBuildingBank,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.08)',
    border: 'rgba(139, 92, 246, 0.2)',
  },
  {
    label: 'DCF کامل از پایه',
    prompt: 'یک DCF کامل برای شرکتی با درآمد پایه ۱۰۰۰ میلیارد ریال بساز: ابتدا مدل درآمد با رشد ۱۵٪ برای ۳ سال، سپس سرمایه در گردش با DSO=30، DIO=45، DPO=20 و COGS=60٪، سپس DCF با WACC=22٪',
    icon: IconChartLine,
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.2)',
  },
  {
    label: 'مدل سه‌گانه IS+BS+CF',
    prompt: 'صورت‌های مالی سه‌گانه برای شرکتی با EBIT 200 میلیارد ریال، وام 400 میلیارد با نرخ ۱۸٪، CapEx 80 میلیارد و D&A 50 میلیارد بساز',
    icon: IconChartLine,
    color: '#0D9488',
    bg: 'rgba(13, 148, 136, 0.08)',
    border: 'rgba(13, 148, 136, 0.2)',
  },
];

export default function ModelEmptyState({ onSendPrompt }) {
  return (
    <Stack align="center" py="xl" gap="md" px="md">
      <Box
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
      >
        <IconCalculator size={24} stroke={1.5} color="#10B981" />
      </Box>

      <Stack gap={4} align="center">
        <Text fw={700} size="md" c="white" ta="center" style={{ direction: 'rtl' }}>
          مدل‌ساز مالی هوشمند
        </Text>
        <Text size="xs" c="dimmed" ta="center" style={{ direction: 'rtl', maxWidth: 280 }}>
          مدل‌های مالی خود را از طریق گفتگو بسازید. DCF، DDM، WACC، CAPM، اوراق، وام و بیشتر.
        </Text>
      </Stack>

      <Stack gap={8} w="100%">
        {QUICK_STARTS.map((qs) => (
          <UnstyledButton
            key={qs.label}
            onClick={() => onSendPrompt(qs.prompt)}
            style={{
              background: qs.bg,
              border: `1px solid ${qs.border}`,
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
              direction: 'rtl',
            }}
          >
            <Box style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <qs.icon size={16} color={qs.color} style={{ flexShrink: 0, marginTop: 2 }} />
              <Box>
                <Text size="sm" fw={600} style={{ color: qs.color }}>
                  {qs.label}
                </Text>
                <Text size="xs" c="dimmed" mt={2} style={{ direction: 'rtl' }}>
                  {qs.prompt.substring(0, 60)}...
                </Text>
              </Box>
            </Box>
          </UnstyledButton>
        ))}
      </Stack>
    </Stack>
  );
}
