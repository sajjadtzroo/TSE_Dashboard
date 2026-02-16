import { Badge } from '@mantine/core';

export default function BadgeCell({ value, colorMap = {} }) {
  const color = colorMap[value] || 'gray';
  return (
    <Badge size="sm" variant="light" color={color}>
      {value}
    </Badge>
  );
}
