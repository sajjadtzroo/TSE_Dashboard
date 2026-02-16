import { useState, useEffect } from 'react';
import { Badge, Group, Text, Tooltip } from '@mantine/core';
import { IconPointFilled } from '@tabler/icons-react';
import { getTehranMarketStatus, formatTehranTime } from '../utils/marketStatus';

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
    <Tooltip label={`ساعت تهران: ${time} | ساعت بازار: ۰۹:۰۰-۱۲:۳۰`}>
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
