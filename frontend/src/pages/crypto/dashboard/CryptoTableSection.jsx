import { useMemo } from 'react';
import { Box, Collapse, ActionIcon, Group, Text, Tabs, Indicator } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconChevronDown } from '@tabler/icons-react';
import { DERIBIT_COINS } from '../../../services/deribit';
import useDeribitLive from '../../../hooks/useDeribitLive';
import RallyMainCard from '../../../components/RallyMainCard';
import DeribitSpotTable from './DeribitSpotTable';
import DeribitFuturesTable from './DeribitFuturesTable';
import DeribitOptionsTable from './DeribitOptionsTable';
import animStyles from '../../../components/shared/animations.module.css';

const STATUS_COLOR = {
  connected: 'green',
  reconnecting: 'yellow',
  connecting: 'gray',
};

const STATUS_LABEL = {
  connected: 'متصل',
  reconnecting: 'در حال اتصال مجدد',
  connecting: 'در حال اتصال',
};

// eslint-disable-next-line no-unused-vars
export default function CryptoTableSection({ market, onRetry }) {
  const [expanded, setExpanded] = useLocalStorage({ key: 'crypto-section-deribit', defaultValue: true });

  // Single shared WS connection — stable channel array (memo prevents re-subscribe on renders)
  const channels = useMemo(
    () => DERIBIT_COINS.map(c => `ticker.${c.perpetual}.100ms`),
    [],
  );
  const { messages, status } = useDeribitLive(channels);

  const statusColor = STATUS_COLOR[status] || 'gray';
  const statusLabel = STATUS_LABEL[status] || status;

  const cardTitle = (
    <Group gap="xs" align="center">
      <Indicator color={statusColor} size={8} processing={status === 'reconnecting'}>
        <Text fw={700} size="sm">بازار Deribit</Text>
      </Indicator>
      <Text size="xs" c="dimmed">({statusLabel})</Text>
    </Group>
  );

  return (
    <Box className={animStyles.sectionEnter}>
      <RallyMainCard
        title={cardTitle}
        noPadding
        secondary={
          <ActionIcon
            variant="subtle"
            onClick={() => setExpanded(!expanded)}
            size="sm"
            aria-label={expanded ? 'بستن بخش' : 'باز کردن بخش'}
          >
            <IconChevronDown
              size={16}
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </ActionIcon>
        }
      >
        <Collapse in={expanded}>
          <Tabs defaultValue="spot" keepMounted={false}>
            <Tabs.List px="md" pt="xs">
              <Tabs.Tab value="spot">قیمت لحظه‌ای</Tabs.Tab>
              <Tabs.Tab value="futures">فیوچرز</Tabs.Tab>
              <Tabs.Tab value="options">آپشن</Tabs.Tab>
            </Tabs.List>

            <Box px="md" pb="md">
              <Tabs.Panel value="spot" pt="xs">
                <DeribitSpotTable messages={messages} status={status} />
              </Tabs.Panel>

              <Tabs.Panel value="futures" pt="xs">
                <DeribitFuturesTable messages={messages} status={status} />
              </Tabs.Panel>

              <Tabs.Panel value="options" pt="xs">
                <DeribitOptionsTable />
              </Tabs.Panel>
            </Box>
          </Tabs>
        </Collapse>
      </RallyMainCard>
    </Box>
  );
}
