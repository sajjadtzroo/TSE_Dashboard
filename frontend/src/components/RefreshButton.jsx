import { useState } from 'react';
import { Button, Menu, Loader, Modal, Text, Group, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconRefresh, IconCloudDownload, IconDatabase, IconAlertTriangle } from '@tabler/icons-react';
import axios from 'axios';

export default function RefreshButton({ onRefreshComplete }) {
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const notify = (message, color = 'blue') =>
    notifications.show({ message, color, autoClose: 6000 });

  const handleLocalRefresh = async () => {
    setLoading(true);
    try {
      if (onRefreshComplete) await onRefreshComplete();
      notify('داده‌ها از پایگاه داده بروزرسانی شد', 'green');
    } catch {
      notify('خطا در بروزرسانی', 'red');
    } finally {
      setLoading(false);
    }
  };

  const handleScraperRun = async (spider) => {
    setLoading(true);
    try {
      await axios.post(`/api/scraper/run/${spider}`);
      notify(`اسکرپر شروع شد: ${spider}...`, 'blue');
      setTimeout(() => {
        if (onRefreshComplete) onRefreshComplete();
      }, 30000);
    } catch (error) {
      notify(error.response?.data?.detail || 'خطا در شروع اسکرپر', 'red');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    setLoading(true);
    try {
      await axios.post('/api/scraper/update-all');
      notify('همه اسکرپرها شروع شدند...', 'blue');
      setTimeout(() => {
        if (onRefreshComplete) onRefreshComplete();
      }, 180000);
    } catch (error) {
      notify(error.response?.data?.detail || 'خطا در شروع اسکرپرها', 'red');
    } finally {
      setLoading(false);
    }
  };

  const confirmAndRun = (action) => {
    setConfirmAction(null);
    action();
  };

  const scraperActions = [
    {
      key: 'prices',
      label: 'بروزرسانی قیمت‌ها (~۲ دقیقه)',
      description: 'اسکرپر قیمت‌ها اجرا می‌شود. ممکن است تا ۲ دقیقه طول بکشد.',
      action: () => handleScraperRun('market_watch'),
    },
    {
      key: 'financials',
      label: 'بروزرسانی مالی (~۵ دقیقه)',
      description: 'اسکرپر اطلاعات مالی اجرا می‌شود. ممکن است تا ۵ دقیقه طول بکشد.',
      action: () => handleScraperRun('instrument_details'),
    },
    {
      key: 'all',
      label: 'بروزرسانی همه (~۵ دقیقه)',
      description: 'همه اسکرپرها به صورت همزمان اجرا می‌شوند. ممکن است تا ۵ دقیقه طول بکشد.',
      action: () => handleUpdateAll(),
    },
  ];

  const activeAction = scraperActions.find((a) => a.key === confirmAction);

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
              onClick={() => activeAction && confirmAndRun(activeAction.action)}
            >
              شروع اسکرپر
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
