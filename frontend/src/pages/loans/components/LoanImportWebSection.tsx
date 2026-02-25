import React, { useState } from 'react';
import {
  Stack, Textarea, Checkbox, Button, Group, Box, Text,
} from '@mantine/core';
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react';
import importService, { WebScrapingResult } from '../../../services/loans/import.service';
import { showError, showSuccess } from '../../../utils/loans/toast';
import rallyColors from '../../../theme/rallyColors';

const LoanImportWebSection: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [urls, setUrls] = useState('');
  const [deepScrape, setDeepScrape] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<{ importId: string; results: WebScrapingResult[] } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleCancel = () => {
    abortController?.abort();
    setAbortController(null);
    setScraping(false);
  };

  const handleScrape = async () => {
    const urlList = urls.split('\n').map((url) => url.trim()).filter((url) => url.length > 0);
    if (urlList.length === 0) {
      showError('لطفا حداقل یک URL وارد کنید');
      return;
    }
    const controller = new AbortController();
    setAbortController(controller);
    try {
      setScraping(true);
      const result = await importService.scrapeWeb({ urls: urlList, deepScrape });
      if (controller.signal.aborted) return;
      setScraping(false);
      setResults(result);
      onSuccess();
      showSuccess('وب‌اسکرپینگ با موفقیت انجام شد');
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      const detail = err instanceof Error ? err.message : '';
      showError(`وب‌اسکرپینگ ناموفق بود.${detail ? ` (${detail})` : ' لطفا دوباره تلاش کنید.'}`);
      setScraping(false);
    } finally {
      setAbortController(null);
    }
  };

  return (
    <Stack gap="md">
      <Textarea
        label="آدرس URL (هر خط یک آدرس)"
        value={urls}
        onChange={(e) => setUrls(e.currentTarget.value)}
        placeholder={'https://example.com/loans\nhttps://bank.ir/facilities'}
        rows={5}
      />

      <Checkbox
        label="اسکرپ عمیق (دنبال کردن لینک‌های مرتبط)"
        checked={deepScrape}
        onChange={(e) => setDeepScrape(e.currentTarget.checked)}
        color="rally-primary"
      />

      <Group gap="sm">
        <Button onClick={handleScrape} disabled={scraping} color="rally-primary" style={{ flex: 1 }}>
          {scraping ? 'در حال اسکرپ...' : 'شروع وب‌اسکرپینگ'}
        </Button>
        {scraping && (
          <Button variant="subtle" color="red" onClick={handleCancel}>
            انصراف
          </Button>
        )}
      </Group>

      {results && (
        <Box p="md" style={{ backgroundColor: rallyColors.elevated, borderRadius: 8 }}>
          <Group gap="xs" mb="sm">
            <IconCircleCheck size={20} color={rallyColors.green} />
            <Text size="lg" fw={700}>نتایج وب‌اسکرپینگ</Text>
          </Group>
          <Text c={rallyColors.textDimmed} mb="sm">
            تعداد صفحات اسکرپ شده: {results.results?.length || 0}
          </Text>
          <Stack gap="xs" mah={256} style={{ overflowY: 'auto' }}>
            {results.results?.map((res, index) => (
              <Box
                key={res.url || index}
                p="sm"
                style={{
                  backgroundColor: rallyColors.bg,
                  borderRadius: 8,
                  border: `1px solid ${rallyColors.glassBorder}`,
                }}
              >
                <Group justify="space-between" mb={4}>
                  <Text size="sm" c={rallyColors.textSecondary} truncate style={{ maxWidth: '80%' }}>
                    {res.url}
                  </Text>
                  {res.status === 'success' ? (
                    <IconCircleCheck size={16} color={rallyColors.green} />
                  ) : (
                    <IconCircleX size={16} color="#ef4444" />
                  )}
                </Group>
                {res.error && <Text size="xs" c="red">{res.error}</Text>}
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};

export default LoanImportWebSection;
