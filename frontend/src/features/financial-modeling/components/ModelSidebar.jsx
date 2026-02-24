import { Box, Divider, Group, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import {
  IconBuildingBank,
  IconCalculator,
  IconChartBar,
  IconChartLine,
  IconCoin,
  IconHistory,
  IconPlus,
} from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';
import useChatSessions from '../../../hooks/useChatSessions';

const TEMPLATES = [
  {
    label: 'ارزش‌گذاری DCF',
    icon: IconChartLine,
    color: rallyColors.primary,
    prompt: 'یک مدل DCF برای شرکتی با EBIT ۵۰۰ میلیارد ریال، WACC 22% و نرخ رشد پایانه 3% بساز',
  },
  {
    label: 'پیش‌بینی P&L',
    icon: IconCalculator,
    color: rallyColors.blue,
    prompt: 'پیش‌بینی P&L برای ۳ سال با درآمد پایه ۱۰۰۰ میلیارد ریال و رشد ۱۵٪',
  },
  {
    label: 'WACC و CAPM',
    icon: IconChartBar,
    color: '#14B8A6',
    prompt: 'محاسبه WACC برای شرکتی با بتای ۱.۲، نرخ بدون ریسک ۲۰٪، صرف ریسک بازار ۶٪، نسبت بدهی ۳۰٪ و نرخ بهره ۱۸٪',
  },
  {
    label: 'مدل DDM',
    icon: IconCoin,
    color: '#06B6D4',
    prompt: 'ارزش‌گذاری سهام با سود سهام پایه ۵۰۰ ریال، نرخ رشد ۸٪ و نرخ تنزیل ۱۵٪ با مدل گوردون',
  },
  {
    label: 'جدول اقساط',
    icon: IconBuildingBank,
    color: rallyColors.purple,
    prompt: 'جدول استهلاک وام ۵۰۰ میلیون ریالی با نرخ ۱۸٪ سالانه و مدت ۳۶ ماه',
  },
  {
    label: 'DCF کامل از پایه',
    icon: IconChartLine,
    color: '#6366F1',
    prompt: 'یک DCF کامل برای شرکتی با درآمد پایه ۱۰۰۰ میلیارد ریال بساز: ابتدا مدل درآمد با رشد ۱۵٪ برای ۳ سال، سپس سرمایه در گردش با DSO=30، DIO=45، DPO=20 و COGS=60٪، سپس DCF با WACC=22٪',
  },
  {
    label: 'مدل سه‌گانه IS+BS+CF',
    icon: IconChartLine,
    color: '#0D9488',
    prompt: 'صورت‌های مالی سه‌گانه برای شرکتی با EBIT 200 میلیارد ریال، وام 400 میلیارد با نرخ ۱۸٪، CapEx 80 میلیارد و D&A 50 میلیارد بساز',
  },
  {
    label: 'Beta + WACC + DCF',
    icon: IconChartBar,
    color: '#64748B',
    prompt: 'برای شرکتی با بتای مشاهده‌شده ۱.۵ و D/E=۰.۸ و نرخ مالیات ۲۵٪، ابتدا بتا را با معادله هامادا غیراهرم کن، سپس WACC با نرخ بدون ریسک ۲۰٪ و صرف ریسک ۶٪ محاسبه کن',
  },
];

export default function ModelSidebar({ onSelectPrompt, onNewChat }) {
  const { sessions, loading } = useChatSessions();

  return (
    <Stack
      gap={0}
      style={{
        height: '100%',
        borderLeft: `1px solid ${rallyColors.glassBorder}`,
        background: 'rgba(11, 14, 17, 0.95)',
        direction: 'rtl',
      }}
    >
      {/* Header */}
      <Box p="sm" style={{ borderBottom: `1px solid ${rallyColors.glassBorder}` }}>
        <Group justify="space-between" align="center">
          <Text fw={700} size="sm" c={rallyColors.textPrimary}>
            مدل‌ساز مالی
          </Text>
          <UnstyledButton
            onClick={onNewChat}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              background: `rgba(59, 130, 246, 0.1)`,
              border: `1px solid rgba(59, 130, 246, 0.25)`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
            }}
          >
            <IconPlus size={12} color={rallyColors.blue} />
            <Text size="xs" style={{ color: rallyColors.blue }} fw={500}>
              جدید
            </Text>
          </UnstyledButton>
        </Group>
      </Box>

      <ScrollArea flex={1}>
        <Stack gap={0}>
          {/* Templates */}
          <Box p="sm" pb={4}>
            <Text size="xs" c="dimmed" fw={600} mb="xs" tt="uppercase">
              الگوها
            </Text>
            <Stack gap={4}>
              {TEMPLATES.map((t) => (
                <UnstyledButton
                  key={t.label}
                  onClick={() => onSelectPrompt?.(t.prompt)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: `1px solid ${rallyColors.glassBorder}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = rallyColors.hover;
                    e.currentTarget.style.borderColor = rallyColors.borderStrong;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = rallyColors.glassBorder;
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <t.icon size={14} color={t.color} style={{ flexShrink: 0 }} />
                    <Text size="xs" c={rallyColors.textPrimary}>
                      {t.label}
                    </Text>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          </Box>

          <Divider my="xs" color={rallyColors.border} />

          {/* Recent sessions */}
          <Box p="sm" pt={4}>
            <Group gap={4} mb="xs">
              <IconHistory size={12} color={rallyColors.textSecondary} />
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                اخیر
              </Text>
            </Group>
            {loading ? (
              <Text size="xs" c="dimmed" ta="center" py="sm">
                در حال بارگذاری...
              </Text>
            ) : sessions.length === 0 ? (
              <Text size="xs" c="dimmed" ta="center" py="sm">
                هنوز مکالمه‌ای ندارید
              </Text>
            ) : (
              <Stack gap={2}>
                {sessions.slice(0, 15).map((s) => (
                  <Box
                    key={s.id}
                    p="xs"
                    style={{
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = rallyColors.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Text size="xs" c="dimmed" truncate>
                      {s.title || 'مکالمه بدون عنوان'}
                    </Text>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
