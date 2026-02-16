import { Breadcrumbs, Anchor, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import rallyColors from '../theme/rallyColors';

export default function RallyBreadcrumbs({ items = [] }) {
  const navigate = useNavigate();

  return (
    <Breadcrumbs mb="xs" separator=">" styles={{ separator: { color: rallyColors.textDimmed } }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        if (isLast) {
          return (
            <Text key={i} size="sm" c="dimmed">
              {item.label}
            </Text>
          );
        }
        return (
          <Anchor
            key={i}
            size="sm"
            c="rally-green"
            onClick={() => navigate(item.path)}
            style={{ cursor: 'pointer' }}
          >
            {item.label}
          </Anchor>
        );
      })}
    </Breadcrumbs>
  );
}
