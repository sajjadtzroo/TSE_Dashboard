import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Stack, Title, Text, SimpleGrid, Card, Group, ThemeIcon, Box,
  Tabs, Button, Textarea, Checkbox, Badge, Center,
} from '@mantine/core';
import {
  IconUpload, IconWorld, IconFileText, IconCircleCheck, IconCircleX,
  IconClock, IconTrendingUp,
} from '@tabler/icons-react';
import importService, { ImportStatus, OCRResult, WebScrapingResult } from '../services/import.service';
import { showError, showSuccess } from '../utils/toast';
import rallyColors from '../theme/rallyColors';

const Import: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string | null>('ocr');

  const { data: importList, refetch: refetchImports } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importService.getImportList(20),
  });

  const { data: stats } = useQuery({
    queryKey: ['import-stats'],
    queryFn: () => importService.getImportStats(),
  });

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

      <Tabs value={activeTab} onChange={setActiveTab} color="rally-green">
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
            <OCRUploadSection onSuccess={refetchImports} />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="web" pt="md">
          <Card padding="lg" radius="md" style={{ backgroundColor: rallyColors.glassBg, border: `1px solid ${rallyColors.glassBorder}` }}>
            <WebScrapingSection onSuccess={refetchImports} />
          </Card>
        </Tabs.Panel>
      </Tabs>

      <Card padding="lg" radius="md" style={{ backgroundColor: rallyColors.glassBg, border: `1px solid ${rallyColors.glassBorder}` }}>
        <Title order={3} mb="md">تاریخچه واردات</Title>
        <ImportHistoryList imports={importList?.imports || []} />
      </Card>
    </Stack>
  );
};

const OCRUploadSection: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleUploadAndProcess = async () => {
    if (!file) return;
    try {
      setUploading(true);
      const uploadResponse = await importService.uploadFile(file);
      setUploading(false);
      setProcessing(true);
      const ocrResult = await importService.processOCR(uploadResponse.fileId);
      setProcessing(false);
      setResult(ocrResult);
      onSuccess();
      showSuccess('فایل با موفقیت پردازش شد');
    } catch {
      showError('پردازش ناموفق بود. لطفا دوباره تلاش کنید.');
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <Stack gap="md">
      <Box
        p="xl"
        style={{
          border: `2px dashed ${dragActive ? rallyColors.green : rallyColors.glassBorder}`,
          borderRadius: 8,
          backgroundColor: dragActive ? 'rgba(16,185,129,0.05)' : 'transparent',
          textAlign: 'center',
          transition: 'all 0.2s',
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <IconUpload size={48} color={rallyColors.textDimmed} style={{ margin: '0 auto 16px' }} />
        <Text c={rallyColors.textSecondary} mb="xs">فایل را اینجا بکشید یا کلیک کنید</Text>
        <Text size="sm" c={rallyColors.textDimmed} mb="md">PNG, JPEG, PDF (حداکثر 10MB)</Text>
        <input
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <Button component="label" htmlFor="file-upload" color="rally-green" variant="filled">
          انتخاب فایل
        </Button>
      </Box>

      {file && (
        <Group justify="space-between" p="md" style={{ backgroundColor: rallyColors.elevated, borderRadius: 8 }}>
          <Group gap="sm">
            <IconFileText size={20} color={rallyColors.green} />
            <div>
              <Text fw={500}>{file.name}</Text>
              <Text size="sm" c={rallyColors.textDimmed}>{(file.size / 1024 / 1024).toFixed(2)} MB</Text>
            </div>
          </Group>
          <Button
            onClick={handleUploadAndProcess}
            disabled={uploading || processing}
            color="rally-green"
          >
            {uploading ? 'در حال آپلود...' : processing ? 'در حال پردازش...' : 'پردازش OCR'}
          </Button>
        </Group>
      )}

      {result && (
        <Box p="md" style={{ backgroundColor: rallyColors.elevated, borderRadius: 8 }}>
          <Group gap="xs" mb="sm">
            <IconCircleCheck size={20} color={rallyColors.green} />
            <Text size="lg" fw={700}>نتیجه OCR</Text>
          </Group>
          <SimpleGrid cols={2} spacing="md" mb="sm">
            <div>
              <Text size="sm" c={rallyColors.textDimmed}>زبان</Text>
              <Text>{result.language}</Text>
            </div>
            <div>
              <Text size="sm" c={rallyColors.textDimmed}>دقت</Text>
              <Text>{result.confidence?.toFixed(2)}%</Text>
            </div>
          </SimpleGrid>
          <Text size="sm" c={rallyColors.textDimmed} mb="xs">متن استخراج شده:</Text>
          <Box
            p="md"
            style={{
              backgroundColor: rallyColors.bg,
              borderRadius: 8,
              maxHeight: 256,
              overflowY: 'auto',
            }}
          >
            <pre style={{ color: rallyColors.textSecondary, fontSize: '0.875rem', whiteSpace: 'pre-wrap', margin: 0 }}>
              {result.text}
            </pre>
          </Box>
        </Box>
      )}
    </Stack>
  );
};

const WebScrapingSection: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [urls, setUrls] = useState('');
  const [deepScrape, setDeepScrape] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<{ importId: string; results: WebScrapingResult[] } | null>(null);

  const handleScrape = async () => {
    const urlList = urls.split('\n').map((url) => url.trim()).filter((url) => url.length > 0);
    if (urlList.length === 0) {
      showError('لطفا حداقل یک URL وارد کنید');
      return;
    }
    try {
      setScraping(true);
      const result = await importService.scrapeWeb({ urls: urlList, deepScrape });
      setScraping(false);
      setResults(result);
      onSuccess();
      showSuccess('وب‌اسکرپینگ با موفقیت انجام شد');
    } catch {
      showError('وب‌اسکرپینگ ناموفق بود. لطفا دوباره تلاش کنید.');
      setScraping(false);
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
        color="rally-green"
      />

      <Button onClick={handleScrape} disabled={scraping} color="rally-green" fullWidth>
        {scraping ? 'در حال اسکرپ...' : 'شروع وب‌اسکرپینگ'}
      </Button>

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

const ImportHistoryList: React.FC<{ imports: ImportStatus[] }> = ({ imports }) => {
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

export default Import;
