import { ActionIcon, Tooltip } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { exportToCsv } from '../utils/exportData';

export default function ExportButton({ filename = 'export', columns, records }) {
  const handleExport = () => {
    if (!records || records.length === 0) return;
    exportToCsv(filename, columns, records);
  };

  return (
    <Tooltip label="خروجی CSV">
      <ActionIcon variant="subtle" size="sm" color="gray" onClick={handleExport}>
        <IconDownload size={18} />
      </ActionIcon>
    </Tooltip>
  );
}
