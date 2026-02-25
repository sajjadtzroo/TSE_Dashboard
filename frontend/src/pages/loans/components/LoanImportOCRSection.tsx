import React, { useState } from 'react';
import {
  Stack, Box, Text, Button, Group, SimpleGrid,
} from '@mantine/core';
import {
  IconUpload, IconFileText, IconCircleCheck,
} from '@tabler/icons-react';
import importService, { OCRResult } from '../../../services/loans/import.service';
import { showError, showSuccess } from '../../../utils/loans/toast';
import rallyColors from '../../../theme/rallyColors';
import { toPersianNum } from '../../../utils/formatUtils';

const LoanImportOCRSection: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

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

  const handleCancel = () => {
    abortController?.abort();
    setAbortController(null);
    setUploading(false);
    setProcessing(false);
  };

  const handleUploadAndProcess = async () => {
    if (!file) return;
    const controller = new AbortController();
    setAbortController(controller);
    try {
      setUploading(true);
      const uploadResponse = await importService.uploadFile(file);
      if (controller.signal.aborted) return;
      setUploading(false);
      setProcessing(true);
      const ocrResult = await importService.processOCR(uploadResponse.fileId);
      if (controller.signal.aborted) return;
      setProcessing(false);
      setResult(ocrResult);
      onSuccess();
      showSuccess('فایل با موفقیت پردازش شد');
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      const detail = err instanceof Error ? err.message : '';
      showError(`پردازش ناموفق بود.${detail ? ` (${detail})` : ' لطفا دوباره تلاش کنید.'}`);
      setUploading(false);
      setProcessing(false);
    } finally {
      setAbortController(null);
    }
  };

  return (
    <Stack gap="md">
      <Box
        p="xl"
        style={{
          border: `2px dashed ${dragActive ? rallyColors.primary : rallyColors.glassBorder}`,
          borderRadius: 8,
          backgroundColor: dragActive ? 'rgba(41, 98, 255, 0.05)' : 'transparent',
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
        <Button component="label" htmlFor="file-upload" color="rally-primary" variant="filled">
          انتخاب فایل
        </Button>
      </Box>

      {file && (
        <Group justify="space-between" p="md" style={{ backgroundColor: rallyColors.elevated, borderRadius: 8 }}>
          <Group gap="sm">
            <IconFileText size={20} color={rallyColors.primary} />
            <div>
              <Text fw={500}>{file.name}</Text>
              <Text size="sm" c={rallyColors.textDimmed}>{toPersianNum((file.size / 1024 / 1024).toFixed(2))} MB</Text>
            </div>
          </Group>
          <Group gap="sm">
            <Button
              onClick={handleUploadAndProcess}
              disabled={uploading || processing}
              color="rally-primary"
            >
              {uploading ? 'در حال آپلود...' : processing ? 'در حال پردازش...' : 'پردازش OCR'}
            </Button>
            {(uploading || processing) && (
              <Button variant="subtle" color="red" onClick={handleCancel}>
                انصراف
              </Button>
            )}
          </Group>
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
              <Text>{result.confidence != null ? toPersianNum(result.confidence.toFixed(2)) : ''}%</Text>
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

export default LoanImportOCRSection;
