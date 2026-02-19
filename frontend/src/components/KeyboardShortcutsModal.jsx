import { useEffect } from 'react';
import { Modal, Table, Text, Kbd, Group, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import rallyColors from '../theme/rallyColors';

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'جستجوی سریع (Spotlight)' },
  { keys: ['⌘', 'F'], description: 'جستجو در جدول' },
  { keys: ['⌘', 'R'], description: 'بروزرسانی داده‌ها' },
  { keys: ['⌘', 'E'], description: 'خروجی از جدول' },
  { keys: ['/'], description: 'فوکوس روی جستجو' },
  { keys: ['?'], description: 'نمایش کلیدهای میانبر' },
  { keys: ['Esc'], description: 'بستن پنجره / منوها' },
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
          {SHORTCUTS.map((s, i) => (
            <Table.Tr key={i}>
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
