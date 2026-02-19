import { ActionIcon, Menu } from '@mantine/core';
import { IconDownload, IconFileTypeCsv, IconJson, IconClipboard, IconCheck, IconFileSpreadsheet } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { exportToCsv, exportToJson, exportToXlsx, copyToClipboard } from '../utils/exportData';

export default function ExportButton({ filename = 'export', columns, records }) {
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
        <ActionIcon variant="subtle" size="lg" color="gray" disabled={isDisabled} aria-label="خروجی داده‌ها">
          <IconDownload size={18} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>خروجی داده‌ها</Menu.Label>
        <Menu.Item
          leftSection={<IconFileTypeCsv size={16} />}
          onClick={handleCsvExport}
        >
          صادرات CSV
        </Menu.Item>
        <Menu.Item
          leftSection={<IconJson size={16} />}
          onClick={handleJsonExport}
        >
          صادرات JSON
        </Menu.Item>
        <Menu.Item
          leftSection={<IconFileSpreadsheet size={16} />}
          onClick={() => {
            if (!records || records.length === 0) return;
            exportToXlsx(filename, columns, records);
            notifications.show({
              title: 'خروجی موفق',
              message: `${records.length} ردیف به Excel صادر شد`,
              color: 'green',
              icon: <IconCheck size={16} />,
            });
          }}
        >
          صادرات Excel
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconClipboard size={16} />}
          onClick={handleCopyToClipboard}
        >
          کپی به کلیپ‌بورد
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
