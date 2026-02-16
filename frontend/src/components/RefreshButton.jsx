import { useState } from 'react';
import { Button, Menu, Loader, Modal, Text, Group, Stack } from '@mantine/core';
import { IconRefresh, IconCloudDownload, IconDatabase, IconAlertTriangle } from '@tabler/icons-react';
import useScraperActions from '../hooks/useScraperActions';
import { SCRAPER_ACTIONS } from '../utils/scraperConfig';

export default function RefreshButton({ onRefreshComplete }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const { loading, handleLocalRefresh, runAction } = useScraperActions(onRefreshComplete);

  const activeAction = SCRAPER_ACTIONS.find((a) => a.key === confirmAction);

  return (
    <>
      <Menu shadow="md" width={240}>
        <Menu.Target>
          <Button
            variant="filled"
            size="xs"
            leftSection={
              loading ? <Loader size={14} color="white" /> : <IconRefresh size={16} />
            }
            disabled={loading}
          >
            {loading ? 'در حال انجام...' : 'بروزرسانی'}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconDatabase size={18} />}
            onClick={handleLocalRefresh}
          >
            بروزرسانی از پایگاه داده
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCloudDownload size={18} />}
            onClick={() => setConfirmAction('prices')}
          >
            بروزرسانی قیمت‌ها (~۲ دقیقه)
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCloudDownload size={18} />}
            onClick={() => setConfirmAction('financials')}
          >
            بروزرسانی مالی (~۵ دقیقه)
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconCloudDownload size={18} />}
            onClick={() => setConfirmAction('all')}
          >
            بروزرسانی همه (~۵ دقیقه)
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="var(--mantine-color-rally-yellow-6)" />
            <Text fw={600}>تایید اجرای اسکرپر</Text>
          </Group>
        }
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            {activeAction?.description}
          </Text>
          <Text size="xs" c="dimmed">
            صفحه بعد از اتمام بروزرسانی می‌شود...
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" size="sm" onClick={() => setConfirmAction(null)}>
              انصراف
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setConfirmAction(null);
                runAction(confirmAction);
              }}
            >
              شروع اسکرپر
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
