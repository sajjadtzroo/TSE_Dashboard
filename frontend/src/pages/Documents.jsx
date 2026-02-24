import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Button, Badge, TextInput, Text, Group, SimpleGrid, Stack,
  Table, ActionIcon, Box, ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconUpload, IconTrash, IconRefresh, IconPlayerPlay,
  IconCloudUpload, IconX, IconFileText, IconDatabase,
  IconClock, IconAlertCircle,
} from '@tabler/icons-react';
import axios from 'axios';
import PageHeader from '../components/PageHeader';
import RallyMainCard from '../components/RallyMainCard';
import RallyKPICard from '../components/RallyKPICard';
import rallyColors from '../theme/rallyColors';

const LIMIT = 50;

function statusColor(status) {
  if (status === 'embedded') return 'green';
  if (status === 'failed') return 'red';
  if (['pending', 'downloading', 'extracting', 'embedding'].includes(status)) return 'yellow';
  return 'blue';
}

function statusLabel(status) {
  const map = {
    pending: 'در انتظار',
    downloading: 'دانلود',
    downloaded: 'دانلود‌شده',
    extracting: 'استخراج',
    extracted: 'استخراج‌شده',
    embedding: 'جاسازی',
    embedded: 'جاسازی‌شده',
    failed: 'ناموفق',
  };
  return map[status] || status;
}

export default function Documents() {
  const [status, setStatus] = useState(null);
  const [docs, setDocs] = useState([]);
  const [skip, setSkip] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [pollingDocId, setPollingDocId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/rag/status');
      setStatus(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchDocs = useCallback(async (newSkip = 0) => {
    try {
      const res = await axios.get('/api/rag/documents', {
        params: { skip: newSkip, limit: LIMIT },
      });
      setDocs(res.data);
    } catch {
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchDocs(0);
  }, [fetchStatus, fetchDocs]);

  useEffect(() => {
    if (!pollingDocId) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.get('/api/rag/documents', {
          params: { skip: 0, limit: LIMIT },
        });
        setDocs(res.data);
        const target = res.data.find((d) => d.id === pollingDocId);
        if (target && (target.status === 'embedded' || target.status === 'failed')) {
          clearInterval(pollingRef.current);
          setPollingDocId(null);
          notifications.show({
            color: target.status === 'embedded' ? 'green' : 'red',
            message:
              target.status === 'embedded'
                ? 'سند با موفقیت پردازش شد.'
                : 'پردازش سند ناموفق بود.',
          });
          fetchStatus();
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(pollingRef.current);
  }, [pollingDocId, fetchStatus]);

  const handleFileSelect = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'txt', 'docx'].includes(ext)) {
      notifications.show({
        color: 'red',
        message: 'فقط فایل‌های PDF، TXT و DOCX پذیرفته می‌شوند.',
      });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      notifications.show({ color: 'red', message: 'حجم فایل بیش از ۵۰ مگابایت است.' });
      return;
    }
    setUploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('title', uploadFile.name.replace(/\.[^.]+$/, ''));
      if (symbol) fd.append('symbol', symbol);
      const res = await axios.post('/api/rag/upload', fd);
      notifications.show({
        color: 'blue',
        message: res.data.message || 'سند آپلود شد و در حال پردازش است.',
      });
      setUploadFile(null);
      setSymbol('');
      if (res.data.document_id) {
        setPollingDocId(res.data.document_id);
        setSkip(0);
      }
      fetchDocs(0);
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err.response?.data?.detail || 'آپلود ناموفق بود.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await axios.delete(`/api/rag/documents/${docId}`);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      notifications.show({ color: 'green', message: 'سند حذف شد.' });
      fetchStatus();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err.response?.data?.detail || 'حذف ناموفق بود.',
      });
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await axios.post('/api/rag/process');
      notifications.show({ color: 'green', message: 'پردازش اسناد آغاز شد.' });
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err.response?.data?.detail || 'پردازش ناموفق بود.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRefresh = () => {
    fetchStatus();
    fetchDocs(skip);
  };

  const goNextPage = () => {
    const newSkip = skip + LIMIT;
    setSkip(newSkip);
    fetchDocs(newSkip);
  };

  const goPrevPage = () => {
    const newSkip = Math.max(0, skip - LIMIT);
    setSkip(newSkip);
    fetchDocs(newSkip);
  };

  const processingCount = status
    ? (status.pending ?? 0) +
      (status.downloading ?? 0) +
      (status.downloaded ?? 0) +
      (status.extracting ?? 0) +
      (status.extracted ?? 0) +
      (status.embedding ?? 0)
    : null;

  const rows = docs.map((doc) => (
    <Table.Tr key={doc.id} style={{ direction: 'rtl' }}>
      <Table.Td>
        <Text size="sm" lineClamp={1} style={{ maxWidth: 220 }}>
          {doc.title || '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">{doc.symbol || '—'}</Text>
      </Table.Td>
      <Table.Td>
        <Badge
          size="sm"
          color={statusColor(doc.status)}
          variant="light"
        >
          {statusLabel(doc.status)}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge
          size="sm"
          color={doc.source === 'upload' ? 'blue' : 'gray'}
          variant="outline"
        >
          {doc.source === 'upload' ? 'آپلود' : 'کدال'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">{doc.page_count ?? '—'}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {doc.created_at
            ? new Date(doc.created_at).toLocaleDateString('fa-IR')
            : '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        {doc.source === 'upload' && (
          <ActionIcon
            size="sm"
            color="red"
            variant="subtle"
            onClick={() => handleDelete(doc.id)}
            title="حذف سند"
          >
            <IconTrash size={14} />
          </ActionIcon>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <PageHeader title="مدیریت اسناد">
        <Button
          size="xs"
          leftSection={<IconPlayerPlay size={14} />}
          variant="light"
          color="rally-primary"
          loading={processing}
          onClick={handleProcess}
        >
          پردازش
        </Button>
        <Button
          size="xs"
          leftSection={<IconRefresh size={14} />}
          variant="subtle"
          color="gray"
          onClick={handleRefresh}
        >
          بروزرسانی
        </Button>
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="md">
        <RallyKPICard
          title="کل اسناد"
          value={status?.total_documents ?? '—'}
          icon={IconFileText}
          color={rallyColors.blue}
        />
        <RallyKPICard
          title="جاسازی‌شده"
          value={status?.embedded ?? '—'}
          icon={IconDatabase}
          color={rallyColors.primary}
        />
        <RallyKPICard
          title="در انتظار / پردازش"
          value={processingCount ?? '—'}
          icon={IconClock}
          color={rallyColors.yellow}
        />
        <RallyKPICard
          title="ناموفق"
          value={status?.failed ?? '—'}
          icon={IconAlertCircle}
          color={rallyColors.red}
        />
      </SimpleGrid>

      <RallyMainCard title="آپلود سند" mb="md">
        <Box
          style={{
            border: `2px dashed ${dragOver ? rallyColors.blue : rallyColors.borderStrong}`,
            borderRadius: 'var(--mantine-radius-md)',
            padding: '32px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s, background 0.2s',
            background: dragOver ? `${rallyColors.blue}08` : 'transparent',
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.docx"
            style={{ display: 'none' }}
            onChange={(e) => { handleFileSelect(e.target.files?.[0]); e.target.value = ''; }}
          />
          <Stack align="center" gap={6}>
            <IconCloudUpload size={36} color={rallyColors.textDimmed} />
            {uploadFile ? (
              <Group justify="center" gap="xs" wrap="nowrap">
                <Text size="sm" c={rallyColors.textPrimary} lineClamp={1} style={{ maxWidth: 260 }}>
                  {uploadFile.name}
                </Text>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                >
                  <IconX size={12} />
                </ActionIcon>
              </Group>
            ) : (
              <>
                <Text size="sm" c="dimmed">فایل را اینجا رها کنید یا کلیک کنید</Text>
                <Text size="xs" c="dimmed">PDF، TXT، DOCX — حداکثر ۵۰ مگابایت</Text>
              </>
            )}
          </Stack>
        </Box>

        <Group mt="sm" align="flex-end" gap="sm" wrap="wrap">
          <TextInput
            label="نماد (اختیاری)"
            placeholder="مثلاً فولاد"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            style={{ flex: 1, minWidth: 140 }}
            size="sm"
            styles={{ input: { direction: 'rtl' } }}
          />
          <Button
            leftSection={<IconUpload size={14} />}
            loading={uploading}
            disabled={!uploadFile}
            onClick={handleUpload}
            size="sm"
          >
            آپلود
          </Button>
        </Group>

        {pollingDocId && (
          <Text size="xs" c="yellow" mt="xs" ta="center">
            در حال پردازش سند... لطفاً منتظر بمانید.
          </Text>
        )}
      </RallyMainCard>

      <RallyMainCard title="لیست اسناد">
        <ScrollArea>
          <Table striped highlightOnHover withColumnBorders={false} fz="sm">
            <Table.Thead>
              <Table.Tr style={{ direction: 'rtl' }}>
                <Table.Th>عنوان</Table.Th>
                <Table.Th>نماد</Table.Th>
                <Table.Th>وضعیت</Table.Th>
                <Table.Th>منبع</Table.Th>
                <Table.Th>صفحات</Table.Th>
                <Table.Th>تاریخ</Table.Th>
                <Table.Th style={{ width: 40 }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {docs.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="lg" size="sm">
                      سندی یافت نشد
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                rows
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {(docs.length === LIMIT || skip > 0) && (
          <Group justify="center" mt="md" gap="xs">
            {skip > 0 && (
              <Button size="xs" variant="subtle" onClick={goPrevPage}>
                صفحه قبل
              </Button>
            )}
            {docs.length === LIMIT && (
              <Button size="xs" variant="subtle" onClick={goNextPage}>
                صفحه بعد
              </Button>
            )}
          </Group>
        )}
      </RallyMainCard>
    </>
  );
}
