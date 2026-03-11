import React from 'react';
import { Box, Text, Group, Button, Loader } from '@mantine/core';
import { IconTrendingUp } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';

interface OptimizerSubmitAreaProps {
  loading?: boolean;
}

const OptimizerSubmitArea: React.FC<OptimizerSubmitAreaProps> = ({ loading }) => (
  <>
    <Button
      type="submit"
      disabled={loading}
      fullWidth
      size="lg"
      styles={{
        root: {
          background: loading
            ? rallyColors.elevated
            : 'linear-gradient(to right, #BB86FC, #9b59d0)',
          color: loading ? rallyColors.textDimmed : '#1a1a1a',
          fontWeight: 600,
          padding: '16px 24px',
          borderRadius: 12,
          fontSize: '1rem',
          height: 'auto',
          opacity: loading ? 0.7 : 1,
        },
      }}
    >
      {loading ? (
        <Group gap="xs">
          <Loader size="xs" color="gray" />
          <span>در حال محاسبه...</span>
        </Group>
      ) : (
        <Group gap="xs">
          <IconTrendingUp size={20} />
          <span>محاسبه و مقایسه همه وام‌ها</span>
        </Group>
      )}
    </Button>

    <Box
      p="sm"
      style={{
        backgroundColor: 'rgba(26, 29, 46, 0.5)',
        borderRadius: 8,
        border: `1px solid rgba(${rallyColors.border})`,
      }}
    >
      <Text size="xs" c={rallyColors.textSecondary} ta="center">
        نکته: با استفاده از سناریوهای آماده می‌توانید سریع‌تر شروع کنید
      </Text>
    </Box>
  </>
);

export default OptimizerSubmitArea;
