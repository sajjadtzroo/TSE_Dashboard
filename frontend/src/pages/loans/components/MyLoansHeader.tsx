import React from 'react';
import { Group, Title, Text, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import rallyColors from '../../../theme/rallyColors';

interface MyLoansHeaderProps {
  onAddLoan: () => void;
}

const MyLoansHeader: React.FC<MyLoansHeaderProps> = ({ onAddLoan }) => {
  return (
    <Group justify="space-between" align="flex-start">
      <div>
        <Title order={2}>وام‌های من</Title>
        <Text c={rallyColors.textDimmed} mt={4}>
          مدیریت وام‌ها و یادآوری پرداخت اقساط
        </Text>
      </div>
      <Button
        leftSection={<IconPlus size={18} />}
        color="rally-primary"
        onClick={onAddLoan}
      >
        افزودن وام جدید
      </Button>
    </Group>
  );
};

export default MyLoansHeader;
