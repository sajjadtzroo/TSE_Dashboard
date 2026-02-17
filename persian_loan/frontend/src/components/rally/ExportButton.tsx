import { ActionIcon, Menu } from '@mantine/core';
import { IconDownload, IconFileTypeCsv, IconJson, IconClipboard, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Column {
  accessor: string;
  title?: string;
}

interface ExportButtonProps {
  filename?: string;
  columns: Column[];
  records: Record<string, unknown>[];
}

function exportToCsv(filename: string, columns: Column[], records: Record<string, unknown>[]) {
  const headers = columns.map((c) => c.title || c.accessor);
  const rows = records.map((r) => columns.map((c) => String(r[c.accessor] ?? '')));
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToJson(filename: string, columns: Column[], records: Record<string, unknown>[]) {
  const data = records.map((r) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c) => { obj[c.title || c.accessor] = r[c.accessor]; });
    return obj;
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(columns: Column[], records: Record<string, unknown>[]) {
  const headers = columns.map((c) => c.title || c.accessor);
  const rows = records.map((r) => columns.map((c) => String(r[c.accessor] ?? '')));
  const text = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function ExportButton({ filename = 'export', columns, records }: ExportButtonProps) {
  const handleCsvExport = () => {
    if (!records || records.length === 0) return;
    exportToCsv(filename, columns, records);
    notifications.show({
      title: 'خروجی موفق',
      message: `${records.length} ردیف به CSV صادر شد`,
      color: 'green',
      icon: <IconCheck size={16} />,
    });
  };

  const handleJsonExport = () => {
    if (!records || records.length === 0) return;
    exportToJson(filename, columns, records);
    notifications.show({
      title: 'خروجی موفق',
      message: `${records.length} ردیف به JSON صادر شد`,
      color: 'green',
      icon: <IconCheck size={16} />,
    });
  };

  const handleCopyToClipboard = async () => {
    if (!records || records.length === 0) return;
    const success = await copyToClipboard(columns, records);
    if (success) {
      notifications.show({
        title: 'کپی شد',
        message: 'داده‌ها به کلیپ‌بورد کپی شدند',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    }
  };

  const isDisabled = !records || records.length === 0;

  return (
    <Menu position="bottom-end" shadow="md" width={180}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" color="gray" disabled={isDisabled}>
          <IconDownload size={18} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>خروجی داده‌ها</Menu.Label>
        <Menu.Item leftSection={<IconFileTypeCsv size={16} />} onClick={handleCsvExport}>
          صادرات CSV
        </Menu.Item>
        <Menu.Item leftSection={<IconJson size={16} />} onClick={handleJsonExport}>
          صادرات JSON
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconClipboard size={16} />} onClick={handleCopyToClipboard}>
          کپی به کلیپ‌بورد
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
