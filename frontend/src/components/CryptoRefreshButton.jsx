import { useState, useCallback } from 'react';
import { Button, Menu, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconRefresh, IconCloudDownload, IconDatabase } from '@tabler/icons-react';
import api from '../services/apiClient';

export default function CryptoRefreshButton({ onRefreshComplete }) {
  const [loading, setLoading] = useState(false);

  const handleDbRefresh = useCallback(async () => {
    setLoading(true);
    try {
      if (onRefreshComplete) await onRefreshComplete();
      notifications.show({ message: 'داده‌ها از پایگاه داده بروزرسانی شد', color: 'green', autoClose: 4000 });
    } catch {
      notifications.show({ message: 'خطا در بروزرسانی', color: 'red', autoClose: 4000 });
    } finally {
      setLoading(false);
    }
  }, [onRefreshComplete]);

  const handleLiveRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await api.post('/crypto/refresh');
      if (onRefreshComplete) await onRefreshComplete();
      notifications.show({ message: 'داده‌ها از CoinMarketCap بروزرسانی شد', color: 'green', autoClose: 4000 });
    } catch {
      notifications.show({ message: 'خطا در دریافت داده زنده', color: 'red', autoClose: 4000 });
    } finally {
      setLoading(false);
    }
  }, [onRefreshComplete]);

  return (
    <Menu shadow="md" width="min(240px, calc(100vw - 32px))">
      <Menu.Target>
        <Button
          variant="filled"
          size="xs"
          leftSection={loading ? <Loader size={14} color="white" /> : <IconRefresh size={16} />}
          disabled={loading}
        >
          {loading ? 'در حال انجام...' : 'بروزرسانی'}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconDatabase size={18} />} onClick={handleDbRefresh}>
          بروزرسانی از پایگاه داده
        </Menu.Item>
        <Menu.Item leftSection={<IconCloudDownload size={18} />} onClick={handleLiveRefresh}>
          بروزرسانی زنده از CMC
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
