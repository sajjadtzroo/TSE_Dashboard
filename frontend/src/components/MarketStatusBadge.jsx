import { useState, useEffect } from 'react';
import { Badge, Group, Text, Tooltip } from '@mantine/core';
import { IconPointFilled } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

function getTehranMarketStatus() {
  const now = new Date();
  // Tehran timezone: Asia/Tehran (UTC+3:30)
  const tehranTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }),
  );
  const hours = tehranTime.getHours();
  const minutes = tehranTime.getMinutes();
  const day = tehranTime.getDay(); // 0=Sun, 6=Sat
  const timeInMinutes = hours * 60 + minutes;

  // Tehran market: Sat-Wed open, Thu-Fri closed
  // In JS, Friday=5, Saturday=6, but Tehran week is Sat-Thu
  // Tehran market is closed on Friday (5) and Thursday (4) afternoon
  const isFriday = day === 5;
  const isThursday = day === 4;

  if (isFriday) {
    return { status: 'closed', label: 'Closed', color: rallyColors.textDimmed };
  }

  // Pre-market: 8:30 - 9:00
  const preMarketStart = 8 * 60 + 30;
  const marketOpen = 9 * 60;
  // Market hours: 9:00 - 12:30
  const marketClose = 12 * 60 + 30;

  if (isThursday && timeInMinutes >= marketClose) {
    return { status: 'closed', label: 'Closed', color: rallyColors.textDimmed };
  }

  if (timeInMinutes >= preMarketStart && timeInMinutes < marketOpen) {
    return { status: 'pre-market', label: 'Pre-Market', color: rallyColors.yellow };
  }

  if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
    return { status: 'open', label: 'Open', color: rallyColors.green };
  }

  return { status: 'closed', label: 'Closed', color: rallyColors.textDimmed };
}

function formatTehranTime() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function MarketStatusBadge() {
  const [marketInfo, setMarketInfo] = useState(getTehranMarketStatus);
  const [time, setTime] = useState(formatTehranTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketInfo(getTehranMarketStatus());
      setTime(formatTehranTime());
    }, 30000); // update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <Tooltip label={`Tehran Time: ${time} | Market Hours: 09:00-12:30`}>
      <Badge
        size="sm"
        variant="light"
        color={
          marketInfo.status === 'open'
            ? 'rally-green'
            : marketInfo.status === 'pre-market'
              ? 'rally-yellow'
              : 'gray'
        }
        leftSection={
          <IconPointFilled
            size={10}
            style={{
              color: marketInfo.color,
              animation:
                marketInfo.status === 'open'
                  ? 'pulse 2s infinite'
                  : undefined,
            }}
          />
        }
      >
        <Group gap={4}>
          <Text size="xs" fw={500} inherit>
            {marketInfo.label}
          </Text>
          <Text size="xs" c="dimmed" inherit>
            {time}
          </Text>
        </Group>
      </Badge>
    </Tooltip>
  );
}
