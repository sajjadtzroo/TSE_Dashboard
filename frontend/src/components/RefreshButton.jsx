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
      notify('Data refreshed from database', 'green');
    } catch {
      notify('Failed to refresh data', 'red');
    } finally {
      setLoading(false);
    }
  };

  const handleScraperRun = async (spider) => {
    setLoading(true);
    try {
      await axios.post(`/api/scraper/run/${spider}`);
      notify(`Scraper started: ${spider}. This may take a few minutes...`, 'blue');
      setTimeout(() => {
        if (onRefreshComplete) onRefreshComplete();
      }, 30000);
    } catch (error) {
      notify(error.response?.data?.detail || 'Failed to start scraper', 'red');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    setLoading(true);
    try {
      await axios.post('/api/scraper/update-all');
      notify('All scrapers started in parallel! Page will auto-refresh in 3 minutes.', 'blue');
      setTimeout(() => {
        if (onRefreshComplete) onRefreshComplete();
      }, 180000);
    } catch (error) {
      notify(error.response?.data?.detail || 'Failed to start scrapers', 'red');
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
      label: 'Update Prices (~2 min)',
      description: 'This will start the market watch scraper. It may take up to 2 minutes.',
      action: () => handleScraperRun('market_watch'),
    },
    {
      key: 'financials',
      label: 'Update Financials (~5 min)',
      description: 'This will start the instrument details scraper. It may take up to 5 minutes.',
      action: () => handleScraperRun('instrument_details'),
    },
    {
      key: 'all',
      label: 'Update All Data (~5 min)',
      description: 'This will start all scrapers in parallel. It may take up to 5 minutes.',
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
            {loading ? 'Working...' : 'Refresh'}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconDatabase size={18} />}
            onClick={handleLocalRefresh}
          >
            Refresh from Database
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCloudDownload size={18} />}
            onClick={() => setConfirmAction('prices')}
          >
            Update Prices (~2 min)
          </Menu.Item>
          <Menu.Item
            leftSection={<IconCloudDownload size={18} />}
            onClick={() => setConfirmAction('financials')}
          >
            Update Financials (~5 min)
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconCloudDownload size={18} />}
            onClick={() => setConfirmAction('all')}
          >
            Update All Data (~5 min)
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="var(--mantine-color-rally-yellow-6)" />
            <Text fw={600}>Confirm Scraper Run</Text>
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
            The page will auto-refresh when the scraper completes.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" size="sm" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => activeAction && confirmAndRun(activeAction.action)}
            >
              Start Scraper
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
