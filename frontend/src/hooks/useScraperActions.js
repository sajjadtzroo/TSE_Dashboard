import { useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { SCRAPER_ACTIONS } from '../utils/scraperConfig';

export default function useScraperActions(onRefreshComplete) {
  const [loading, setLoading] = useState(false);

  const notify = (message, color = 'blue') =>
    notifications.show({ message, color, autoClose: 6000 });

  const handleLocalRefresh = useCallback(async () => {
    setLoading(true);
    try {
      if (onRefreshComplete) await onRefreshComplete();
      notify('داده‌ها از پایگاه داده بروزرسانی شد', 'green');
    } catch {
      notify('خطا در بروزرسانی', 'red');
    } finally {
      setLoading(false);
    }
  }, [onRefreshComplete]);

  const runAction = useCallback(async (actionKey) => {
    const action = SCRAPER_ACTIONS.find((a) => a.key === actionKey);
    if (!action) return;

    setLoading(true);
    try {
      if (action.spider) {
        await axios.post(`/api/scraper/run/${action.spider}`);
        notify(`اسکرپر شروع شد: ${action.spider}...`, 'blue');
      } else {
        await axios.post('/api/scraper/update-all');
        notify('همه اسکرپرها شروع شدند...', 'blue');
      }
      setTimeout(() => {
        if (onRefreshComplete) onRefreshComplete();
      }, action.delayMs);
    } catch (error) {
      notify(error.response?.data?.detail || 'خطا در شروع اسکرپر', 'red');
    } finally {
      setLoading(false);
    }
  }, [onRefreshComplete]);

  return { loading, handleLocalRefresh, runAction };
}
