import { useState } from 'react';
import {
  SimpleGrid, Button, Group, Text, Box, Card, Stack,
  Progress, TextInput, NumberInput, Modal,
} from '@mantine/core';
import { IconFlag, IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyMainCard from '../../components/RallyMainCard';
import RallyEmptyState from '../../components/RallyEmptyState';
import { usePortfolios, usePortfolioHoldings } from '../../hooks/usePortfolioAPI';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';

export default function PortfolioGoals() {
  const [modalOpen, setModalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [targetValue, setTargetValue] = useState(0);

  const { data: portfolios = [] } = usePortfolios();
  const defaultPortfolio = portfolios.find((p) => p.is_default) || portfolios[0];
  const portfolioId = defaultPortfolio?.id;

  const { data: holdings = [] } = usePortfolioHoldings(portfolioId);
  const totalValue = holdings.reduce((s, h) => s + Number(h.total_cost || 0), 0);

  if (!portfolioId) {
    return (
      <>
        <PageHeader title="اهداف مالی" />
        <RallyMainCard>
          <RallyEmptyState icon={IconFlag} message="ابتدا وارد حساب کاربری شوید" />
        </RallyMainCard>
      </>
    );
  }

  return (
    <>
      <PageHeader title="اهداف مالی">
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setModalOpen(true)} color="blue">
          هدف جدید
        </Button>
      </PageHeader>

      <RallyMainCard>
        <RallyEmptyState
          icon={IconFlag}
          message="هنوز هدف مالی تعریف نشده"
          actionLabel="تعریف اولین هدف"
          onAction={() => setModalOpen(true)}
        />
      </RallyMainCard>

      <Box mt="md" className={animStyles.sectionEnter}>
        <RallyMainCard title="نمونه اهداف">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {[
              { name: 'بازنشستگی', target: 50000000000, icon: '🏖️' },
              { name: 'خرید خانه', target: 20000000000, icon: '🏠' },
              { name: 'سفر خارجی', target: 500000000, icon: '✈️' },
            ].map((goal) => {
              const progress = totalValue > 0 ? Math.min((totalValue / goal.target) * 100, 100) : 0;
              return (
                <Card key={goal.name} withBorder radius="md" p="md" style={{ borderInlineStart: `3px solid ${rallyColors.blue}` }}>
                  <Group gap="sm" mb="xs">
                    <Text size="lg">{goal.icon}</Text>
                    <Box>
                      <Text size="sm" fw={600}>{goal.name}</Text>
                      <Text size="xs" c="dimmed">هدف: {formatNum(goal.target)} ریال</Text>
                    </Box>
                  </Group>
                  <Progress value={progress} color="blue" size="sm" radius="xl" mb={4} />
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">{toPersianNum(progress.toFixed(0))}٪ تکمیل</Text>
                    <Text size="xs" c="dimmed">فعلی: {formatNum(Math.round(totalValue))}</Text>
                  </Group>
                </Card>
              );
            })}
          </SimpleGrid>
        </RallyMainCard>
      </Box>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="تعریف هدف مالی" size="sm">
        <Stack gap="sm">
          <TextInput label="نام هدف" placeholder="مثال: بازنشستگی" value={goalName} onChange={(e) => setGoalName(e.currentTarget.value)} />
          <NumberInput label="مبلغ هدف (ریال)" value={targetValue} onChange={setTargetValue} min={0} />
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>انصراف</Button>
            <Button disabled={!goalName || targetValue <= 0}>ثبت</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
