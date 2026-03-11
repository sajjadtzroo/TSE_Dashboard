import React from 'react';
import { Stack, Group, Text, Badge, Center } from '@mantine/core';
import { IconCircleCheck, IconCircleX, IconClock } from '@tabler/icons-react';
import { ImportStatus } from '../../../services/loans/import.service';
import rallyColors from '../../../theme/rallyColors';

const LoanImportHistoryList: React.FC<{ imports: ImportStatus[] }> = ({ imports }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <IconCircleCheck size={18} color={rallyColors.green} />;
      case 'failed': return <IconCircleX size={18} color="#ef4444" />;
      case 'processing': return <IconClock size={18} color="#eab308" />;
      default: return <IconClock size={18} color={rallyColors.textDimmed} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'تکمیل شده';
      case 'failed': return 'ناموفق';
      case 'processing': return 'در حال پردازش';
      default: return 'در انتظار';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'ocr': return 'OCR';
      case 'web_scraping': return 'وب‌اسکرپینگ';
      default: return 'دستی';
    }
  };

  if (imports.length === 0) {
    return (
      <Center py="xl">
        <Text c={rallyColors.textDimmed}>هنوز واردات انجام نشده است</Text>
      </Center>
    );
  }

  return (
    <Stack gap="xs">
      {imports.map((item) => (
        <Group
          key={item.importId}
          justify="space-between"
          p="md"
          style={{
            backgroundColor: rallyColors.elevated,
            borderRadius: 8,
            border: `1px solid ${rallyColors.glassBorder}`,
          }}
        >
          <Group gap="sm">
            {getStatusIcon(item.status)}
            <div>
              <Text fw={500}>{item.source}</Text>
              <Text size="sm" c={rallyColors.textDimmed}>
                {getTypeText(item.importType)} • {new Date(item.createdAt).toLocaleDateString('fa-IR')}
              </Text>
            </div>
          </Group>
          <Badge variant="light" color="gray" size="sm">
            {getStatusText(item.status)}
          </Badge>
        </Group>
      ))}
    </Stack>
  );
};

export default LoanImportHistoryList;
