import { useState } from 'react';
import { Breadcrumbs, Anchor, Text, Menu } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconDots } from '@tabler/icons-react';
import rallyColors from '../theme/rallyColors';

const SEPARATOR = <IconChevronLeft size={12} color={rallyColors.textDimmed} style={{ transition: 'transform 0.2s ease' }} />;

export default function RallyBreadcrumbs({ items = [] }) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [expanded, setExpanded] = useState(false);

  // On mobile, collapse middle items behind "..." when > 3 items
  const shouldCollapse = isMobile && items.length > 3 && !expanded;
  const displayItems = shouldCollapse
    ? [items[0], { label: '...', collapsed: true }, items[items.length - 1]]
    : items;
  const collapsedItems = shouldCollapse ? items.slice(1, items.length - 1) : [];

  return (
    <Breadcrumbs mb="xs" separator={SEPARATOR} styles={{ separator: { color: rallyColors.textDimmed, marginInline: 4 } }}>
      {displayItems.map((item, i) => {
        const isLast = i === displayItems.length - 1;

        // Collapsed "..." expander
        if (item.collapsed) {
          return (
            <Menu key="collapsed" position="bottom-start" withinPortal>
              <Menu.Target>
                <Anchor
                  size="sm"
                  c="dimmed"
                  onClick={() => setExpanded(true)}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <IconDots size={14} />
                </Anchor>
              </Menu.Target>
              <Menu.Dropdown>
                {collapsedItems.map((ci, ci_idx) => (
                  <Menu.Item key={ci_idx} onClick={() => ci.path && navigate(ci.path)}>
                    {ci.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          );
        }

        if (isLast) {
          return (
            <Text key={i} size="sm" c="dimmed" lineClamp={1}>
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
