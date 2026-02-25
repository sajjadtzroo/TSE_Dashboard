import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Stack, Title, Text, SimpleGrid, Card, Group, ThemeIcon,
  Tabs, Center, Loader,
} from '@mantine/core';
import {
  IconUpload, IconWorld, IconCircleCheck, IconCircleX, IconTrendingUp,
} from '@tabler/icons-react';
import importService from '../../services/loans/import.service';
import { useAuth } from '../../context/AuthContext';
import rallyColors from '../../theme/rallyColors';
import LoanImportOCRSection from './components/LoanImportOCRSection';
import LoanImportWebSection from './components/LoanImportWebSection';
import LoanImportHistoryList from './components/LoanImportHistoryList';

const Import: React.FC = () => {
  const { loading: authLoading, isAuthenticated } = useAuth() as {
    loading: boolean;
    isAuthenticated: boolean;
  };
  const [activeTab, setActiveTab] = useState<string | null>('ocr');

  const { data: importList, refetch: refetchImports } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importService.getImportList(20),
    enabled: isAuthenticated,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['import-stats'],
    queryFn: () => importService.getImportStats(),
    enabled: isAuthenticated,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });

  if (authLoading) {
    return (
      <Center h={300}>
        <Loader color="rally-primary" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return (
      <Center h={300}>
        <Text c={rallyColors.textDimmed}>برای مشاهده واردات ابتدا وارد حساب کاربری شوید.</Text>
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>واردات داده</Title>
        <Text c={rallyColors.textDimmed} mt="xs">
          آپلود فایل برای OCR یا دریافت داده از وب‌سایت‌های بانک
        </Text>
      </div>

      {stats && (
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <Card padding="md" radius="md" style={{ backgroundColor: rallyColors.glassBg, border: `1px solid ${rallyColors.glassBorder}` }}>
            <Group gap="sm">
              <ThemeIcon size={40} radius="md" variant="light" color="blue">
                <IconTrendingUp size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c={rallyColors.textDimmed}>کل واردات</Text>
                <Text size="xl" fw={700}>{stats.total}</Text>
              </div>
            </Group>
          </Card>
          <Card padding="md" radius="md" style={{ backgroundColor: rallyColors.glassBg, border: `1px solid ${rallyColors.glassBorder}` }}>
            <Group gap="sm">
              <ThemeIcon size={40} radius="md" variant="light" color="green">
                <IconCircleCheck size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c={rallyColors.textDimmed}>موفق</Text>
                <Text size="xl" fw={700}>{stats.byStatus?.completed || 0}</Text>
              </div>
            </Group>
          </Card>
          <Card padding="md" radius="md" style={{ backgroundColor: rallyColors.glassBg, border: `1px solid ${rallyColors.glassBorder}` }}>
            <Group gap="sm">
              <ThemeIcon size={40} radius="md" variant="light" color="red">
                <IconCircleX size={20} />
              </ThemeIcon>
              <div>
                <Text size="sm" c={rallyColors.textDimmed}>ناموفق</Text>
                <Text size="xl" fw={700}>{stats.byStatus?.failed || 0}</Text>
              </div>
            </Group>
          </Card>
        </SimpleGrid>
      )}

      <Tabs value={activeTab} onChange={setActiveTab} color="rally-primary">
        <Tabs.List>
          <Tabs.Tab value="ocr" leftSection={<IconUpload size={16} />}>
            آپلود فایل (OCR)
          </Tabs.Tab>
          <Tabs.Tab value="web" leftSection={<IconWorld size={16} />}>
            وب‌اسکرپینگ
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="ocr" pt="md">
          <Card padding="lg" radius="md" style={{ backgroundColor: rallyColors.glassBg, border: `1px solid ${rallyColors.glassBorder}` }}>
            <LoanImportOCRSection onSuccess={refetchImports} />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="web" pt="md">
          <Card padding="lg" radius="md" style={{ backgroundColor: rallyColors.glassBg, border: `1px solid ${rallyColors.glassBorder}` }}>
            <LoanImportWebSection onSuccess={refetchImports} />
          </Card>
        </Tabs.Panel>
      </Tabs>

      <Card padding="lg" radius="md" style={{ backgroundColor: rallyColors.glassBg, border: `1px solid ${rallyColors.glassBorder}` }}>
        <Title order={3} mb="md">تاریخچه واردات</Title>
        <LoanImportHistoryList imports={importList?.imports || []} />
      </Card>
    </Stack>
  );
};

export default Import;
