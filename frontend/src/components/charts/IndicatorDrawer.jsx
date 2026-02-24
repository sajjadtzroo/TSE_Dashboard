import { useState } from 'react';
import {
  ActionIcon, Box, Button, Drawer, Group, Stack, Tabs, Text, TextInput, Tooltip, UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconX, IconChartLine } from '@tabler/icons-react';
import indicatorMeta from '../../utils/indicatorMeta';
import rallyColors from '../../theme/rallyColors';

// Group indicators by drawer tab
const TAB_GROUPS = {
  overlay: {
    label: 'روی نمودار',
    keys: Object.keys(indicatorMeta).filter((k) => indicatorMeta[k].category === 'overlay'),
  },
  momentum: {
    label: 'مومنتوم',
    keys: ['rsi', 'macd', 'stochastic', 'williamsR', 'cci', 'roc'],
  },
  trend: {
    label: 'روند و حجم',
    keys: ['adx', 'obv'],
  },
};

function IndicatorRow({ indicatorKey, prefs, onToggle }) {
  const meta = indicatorMeta[indicatorKey];
  const active = !!prefs[indicatorKey];

  return (
    <UnstyledButton
      onClick={() => onToggle(indicatorKey)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 10px',
        borderRadius: 6,
        background: active ? `${meta.color}14` : 'transparent',
        border: `1px solid ${active ? meta.color + '40' : 'transparent'}`,
        width: '100%',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <Box
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: meta.color,
          flexShrink: 0,
          opacity: active ? 1 : 0.45,
        }}
      />
      <Text
        size="sm"
        c={active ? rallyColors.textPrimary : rallyColors.textSecondary}
        fw={active ? 600 : 400}
        style={{ flex: 1 }}
      >
        {meta.label}
      </Text>
      {active && (
        <Box
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: meta.color,
            flexShrink: 0,
          }}
        />
      )}
    </UnstyledButton>
  );
}

export default function IndicatorDrawer({ prefs = {}, onToggle }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('overlay');

  const activeCount = Object.values(prefs).filter(Boolean).length;

  return (
    <>
      <Tooltip label="اندیکاتورها" position="bottom" withArrow>
        <Button
          size="compact-xs"
          variant="subtle"
          color="gray"
          leftSection={<IconChartLine size={13} />}
          onClick={open}
          styles={{
            root: {
              fontWeight: 500,
              fontSize: 11,
              ...(activeCount > 0 && {
                color: rallyColors.primary,
                borderColor: `${rallyColors.primary}40`,
              }),
            },
          }}
        >
          اندیکاتور{activeCount > 0 ? ` (${activeCount})` : ''}
        </Button>
      </Tooltip>

      <Drawer
        opened={opened}
        onClose={close}
        title={
          <Group gap="xs">
            <IconChartLine size={16} color={rallyColors.primary} />
            <Text fw={700} size="sm">اندیکاتورها</Text>
          </Group>
        }
        position="right"
        size={300}
        styles={{
          header: { background: rallyColors.card, borderBottom: `1px solid ${rallyColors.border}` },
          body: { background: rallyColors.card, padding: 0 },
          overlay: { backdropFilter: 'blur(2px)' },
        }}
      >
        {/* Search */}
        <Box px="sm" pt="sm" pb="xs">
          <TextInput
            placeholder="جستجو…"
            leftSection={<IconSearch size={13} />}
            rightSection={
              search ? (
                <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setSearch('')}>
                  <IconX size={11} />
                </ActionIcon>
              ) : null
            }
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="xs"
            styles={{
              input: {
                textAlign: 'right',
                background: rallyColors.elevated,
                border: `1px solid ${rallyColors.border}`,
              },
            }}
          />
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={setTab} variant="pills" radius="sm">
          <Tabs.List px="sm" pb="xs" style={{ gap: 4, flexWrap: 'nowrap' }}>
            {Object.entries(TAB_GROUPS).map(([key, { label }]) => {
              const tabActiveCount = TAB_GROUPS[key].keys.filter((k) => !!prefs[k]).length;
              return (
                <Tabs.Tab
                  key={key}
                  value={key}
                  styles={{
                    tab: { fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' },
                  }}
                >
                  {label}{tabActiveCount > 0 ? ` · ${tabActiveCount}` : ''}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          {/* Indicator list — each panel filters its own tab's keys independently */}
          {Object.keys(TAB_GROUPS).map((key) => {
            const panelKeys = !search.trim()
              ? TAB_GROUPS[key].keys
              : TAB_GROUPS[key].keys.filter((k) => {
                  const m = indicatorMeta[k];
                  const q = search.toLowerCase();
                  return m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q);
                });
            return (
              <Tabs.Panel key={key} value={key}>
                <Stack gap={2} px="xs" pb="sm">
                  {panelKeys.length === 0 ? (
                    <Text size="xs" c="dimmed" ta="center" py="lg">نتیجه‌ای یافت نشد</Text>
                  ) : (
                    panelKeys.map((k) => (
                      <IndicatorRow key={k} indicatorKey={k} prefs={prefs} onToggle={onToggle} />
                    ))
                  )}
                </Stack>
              </Tabs.Panel>
            );
          })}
        </Tabs>
      </Drawer>
    </>
  );
}
