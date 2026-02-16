import { useState, useEffect } from 'react';
import { Badge } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

function getRelativeTime(date) {
  if (!date) return null;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'همین الان';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}د قبل`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}س قبل`;
}

function getColor(date) {
  if (!date) return 'gray';
  const diffMin = (Date.now() - date.getTime()) / 60000;
  if (diffMin < 5) return 'rally-green';
  if (diffMin < 30) return 'rally-yellow';
  return 'rally-orange';
}

export default function DataFreshness({ lastUpdated }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const label = getRelativeTime(lastUpdated);
  if (!label) return null;

  return (
    <Badge
      size="sm"
      variant="light"
      color={getColor(lastUpdated)}
      leftSection={<IconClock size={12} />}
    >
      {label}
    </Badge>
  );
}
