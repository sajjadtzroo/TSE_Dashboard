import { Link } from 'react-router-dom';
import { Breadcrumbs, Anchor, Text } from '@mantine/core';
import { IconHome, type TablerIcon } from '@tabler/icons-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: TablerIcon;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <Breadcrumbs separator="/">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const Icon = item.icon;

        if (isLast || !item.href) {
          return (
            <Text key={index} size="sm" fw={isLast ? 500 : 400} c={isLast ? undefined : 'dimmed'}>
              {Icon && <Icon size={14} style={{ display: 'inline', marginInlineEnd: 4, verticalAlign: 'text-bottom' }} />}
              {item.label}
            </Text>
          );
        }

        return (
          <Anchor key={index} component={Link} to={item.href} size="sm" c="dimmed">
            {Icon && <Icon size={14} style={{ display: 'inline', marginInlineEnd: 4, verticalAlign: 'text-bottom' }} />}
            {item.label}
          </Anchor>
        );
      })}
    </Breadcrumbs>
  );
}

export default Breadcrumb;
