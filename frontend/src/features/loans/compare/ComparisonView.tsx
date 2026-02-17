/**
 * Comparison View - Main Container
 * Displays side-by-side loan comparison
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  Button,
  Badge,
  Box,
} from '@mantine/core';
import {
  IconX,
  IconDownload,
  IconShare,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { useLoanSelection } from '@/context/LoanSelectionContext';
import { ComparisonTable } from './components/ComparisonTable';
import type { LoanWithBank } from '@/types';
import rallyColors from '@/theme/rallyColors';

export function ComparisonView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedLoans, clearSelection } = useLoanSelection();
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);

  // Handle URL-based comparison (e.g., /compare?loans=bank1:loan1,bank2:loan2)
  useEffect(() => {
    const loansParam = searchParams.get('loans');
    if (loansParam && selectedLoans.length === 0) {
      // TODO: Load loans from URL parameter
      // This would require fetching the loans by their IDs
    }
  }, [searchParams, selectedLoans.length]);

  const handleClearSelection = () => {
    clearSelection();
    navigate('/loans');
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
  };

  const handleShare = async () => {
    // Generate shareable URL
    const loanIds = selectedLoans.map((loan) => {
      const loanWithBank = loan as LoanWithBank;
      return loanWithBank.bankId
        ? `${loanWithBank.bankId}:${loan.id}`
        : loan.id;
    });

    const shareUrl = `${window.location.origin}/compare?loans=${loanIds.join(',')}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('لینک مقایسه کپی شد!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (selectedLoans.length === 0) {
    return (
      <Box maw={960} mx="auto" px="md" py="xl">
        <Card
          withBorder
          radius="md"
          p="xl"
          style={{
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.glassBorder}`,
            textAlign: 'center',
          }}
        >
          <Box maw={400} mx="auto">
            <Title order={2} c={rallyColors.textPrimary} mb="md">
              هیچ وامی برای مقایسه انتخاب نشده است
            </Title>
            <Text c={rallyColors.textSecondary} mb="lg">
              لطفاً از صفحه وام‌ها، حداقل ۲ وام را برای مقایسه انتخاب کنید.
            </Text>
            <Button onClick={() => navigate('/loans')}>
              رفتن به صفحه وام‌ها
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  if (selectedLoans.length === 1) {
    return (
      <Box maw={960} mx="auto" px="md" py="xl">
        <Card
          withBorder
          radius="md"
          p="xl"
          style={{
            backgroundColor: rallyColors.card,
            border: `1px solid ${rallyColors.glassBorder}`,
            textAlign: 'center',
          }}
        >
          <Box maw={400} mx="auto">
            <Title order={2} c={rallyColors.textPrimary} mb="md">
              برای مقایسه، حداقل ۲ وام انتخاب کنید
            </Title>
            <Text c={rallyColors.textSecondary} mb="lg">
              شما یک وام انتخاب کرده‌اید. لطفاً حداقل یک وام دیگر برای مقایسه انتخاب کنید.
            </Text>
            <Group justify="center" gap="sm">
              <Button onClick={() => navigate('/loans')}>
                انتخاب وام‌های بیشتر
              </Button>
              <Button onClick={handleClearSelection} variant="outline">
                پاک کردن انتخاب
              </Button>
            </Group>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box maw={1200} mx="auto" px="md" py="xl">
      {/* Header */}
      <Stack gap="md" mb="lg">
        <Group justify="space-between">
          <div>
            <Title order={1} c={rallyColors.textPrimary} mb="xs">
              مقایسه وام‌ها
            </Title>
            <Text c={rallyColors.textSecondary}>
              مقایسه {selectedLoans.length} وام انتخاب شده
            </Text>
          </div>

          <Group gap="xs">
            <Button
              onClick={() => setShowDifferencesOnly(!showDifferencesOnly)}
              variant="outline"
              size="sm"
              leftSection={showDifferencesOnly ? <IconEye size={16} /> : <IconEyeOff size={16} />}
            >
              {showDifferencesOnly ? 'نمایش همه' : 'فقط تفاوت‌ها'}
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              size="sm"
              leftSection={<IconShare size={16} />}
            >
              اشتراک‌گذاری
            </Button>

            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              leftSection={<IconDownload size={16} />}
            >
              خروجی CSV
            </Button>

            <Button
              onClick={handleClearSelection}
              variant="subtle"
              size="sm"
              color="red"
              leftSection={<IconX size={16} />}
            >
              پاک کردن همه
            </Button>
          </Group>
        </Group>

        {/* Selected Loans Badges */}
        <Group gap="xs" wrap="wrap">
          {selectedLoans.map((loan) => (
            <Badge key={loan.id} color="blue" size="sm">
              {loan.nameFA}
            </Badge>
          ))}
        </Group>
      </Stack>

      {/* Comparison Table */}
      <ComparisonTable
        loans={selectedLoans}
        showDifferencesOnly={showDifferencesOnly}
      />
    </Box>
  );
}

export default ComparisonView;
