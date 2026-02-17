import { Badge } from '@mantine/core';

interface BadgeCellProps {
  value: string;
  colorMap?: Record<string, string>;
}

export default function BadgeCell({ value, colorMap = {} }: BadgeCellProps) {
  const color = colorMap[value] || 'gray';
  return (
    <Badge size="sm" variant="light" color={color}>
      {value}
    </Badge>
  );
}
