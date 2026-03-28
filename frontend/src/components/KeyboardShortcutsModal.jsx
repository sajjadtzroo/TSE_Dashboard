import { useEffect } from 'react';
import { Modal, Table, Text, Kbd, Group, Box, Divider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import rallyColors from '../theme/rallyColors';

const UTILITY_SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'جستجوی سریع (Spotlight)' },
  { keys: ['⌘', 'F'], description: 'جستجو در جدول' },
  { keys: ['⌘', 'R'], description: 'بروزرسانی داده‌ها' },
  { keys: ['⌘', 'E'], description: 'خروجی از جدول' },
  { keys: ['/'], description: 'فوکوس روی جستجو' },
  { keys: ['⌘', 'J'], description: 'باز/بسته کردن چت هوشمند' },
  { keys: ['?'], description: 'نمایش کلیدهای میانبر' },
  { keys: ['Esc'], description: 'بستن پنجره / منوها' },
];

const NAV_SHORTCUTS = [
  { keys: ['G', 'D'], description: 'رفتن به داشبورد بازار' },
  { keys: ['G', 'P'], description: 'رفتن به پورتفولیو' },
  { keys: ['G', 'C'], description: 'رفتن به ارزهای دیجیتال' },
  { keys: ['G', 'L'], description: 'رفتن به تسهیلات بانکی' },
  { keys: ['G', 'T'], description: 'رفتن به دفتر معاملات' },
  { keys: ['G', 'S'], description: 'رفتن به چرخش صنایع' },
];

export default function KeyboardShortcutsModal() {
  const [opened, { open, close }] = useDisclosure(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    let gPressed = false;
    let timeout = null;

    const handleNav = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === 'g' && !gPressed) {
        gPressed = true;
        timeout = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }

      if (gPressed) {
        gPressed = false;
        clearTimeout(timeout);
        const routes = {
          d: '/dashboard',
          p: '/portfolio',
          c: '/crypto',
          l: '/loans',
          t: '/portfolio/transactions',
          s: '/dashboard/sector-rotation',
        };
        if (routes[key]) {
          e.preventDefault();
          window.location.href = routes[key];
        }
      }
    };

    window.addEventListener('keydown', handleNav);
    return () => {
      window.removeEventListener('keydown', handleNav);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Modal
      opened={opened}
      onClose={close}
      title="کلیدهای میانبر"
      centered
      size="md"
    >
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ textAlign: 'right' }}>
              <Text size="xs" c="dimmed" fw={500}>میانبر</Text>
            </Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>
              <Text size="xs" c="dimmed" fw={500}>عملکرد</Text>
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {UTILITY_SHORTCUTS.map((s, i) => (
            <Table.Tr key={`util-${i}`}>
              <Table.Td>
                <Group gap={4}>
                  {s.keys.map((k, j) => (
                    <Kbd key={j} size="sm">{k}</Kbd>
                  ))}
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{s.description}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
          <Table.Tr>
            <Table.Td colSpan={2} style={{ padding: '8px 0 4px' }}>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                ناوبری سریع (G + کلید)
              </Text>
            </Table.Td>
          </Table.Tr>
          {NAV_SHORTCUTS.map((s, i) => (
            <Table.Tr key={`nav-${i}`}>
              <Table.Td>
                <Group gap={4}>
                  {s.keys.map((k, j) => (
                    <Kbd key={j} size="sm">{k}</Kbd>
                  ))}
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{s.description}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed" mt="md" ta="center">
        در ویندوز/لینوکس، به جای ⌘ از Ctrl استفاده کنید
      </Text>
    </Modal>
  );
}
