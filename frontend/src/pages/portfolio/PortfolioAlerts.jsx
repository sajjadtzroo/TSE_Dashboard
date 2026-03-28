import { useState } from 'react';
import {
  Button, Group, Text, Box, Card, Badge, Stack,
  SimpleGrid, Select, TextInput, NumberInput, Modal, Switch,
} from '@mantine/core';
import { IconBell, IconPlus, IconTrash } from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyMainCard from '../../components/RallyMainCard';
import RallyEmptyState from '../../components/RallyEmptyState';
import { usePortfolios } from '../../hooks/usePortfolioAPI';
import rallyColors from '../../theme/rallyColors';
import animStyles from '../../components/shared/animations.module.css';

const ALERT_TYPE_OPTIONS = [
  { value: 'price_above', label: 'قیمت بالاتر از' },
  { value: 'price_below', label: 'قیمت پایین‌تر از' },
  { value: 'drawdown', label: 'افت بیش از' },
  { value: 'stop_loss', label: 'حد ضرر' },
  { value: 'rebalance', label: 'نیاز به بازتوزیع' },
];

const ALERT_BADGE_MAP = {
  price_above: { color: 'green', label: 'قیمت بالا' },
  price_below: { color: 'red', label: 'قیمت پایین' },
  drawdown: { color: 'orange', label: 'افت' },
  stop_loss: { color: 'red', label: 'حد ضرر' },
  rebalance: { color: 'blue', label: 'بازتوزیع' },
};

export default function PortfolioAlerts() {
  const [modalOpen, setModalOpen] = useState(false);
  const [alertType, setAlertType] = useState('price_above');
  const [symbol, setSymbol] = useState('');
  const [threshold, setThreshold] = useState(0);

  const { data: portfolios = [] } = usePortfolios();
  const defaultPortfolio = portfolios.find((p) => p.is_default) || portfolios[0];
  const portfolioId = defaultPortfolio?.id;

  if (!portfolioId) {
    return (
      <>
        <PageHeader title="هشدارها" />
        <RallyMainCard>
          <RallyEmptyState icon={IconBell} message="ابتدا وارد حساب کاربری شوید" />
        </RallyMainCard>
      </>
    );
  }

  return (
    <>
      <PageHeader title="هشدارها">
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setModalOpen(true)} color="blue">
          هشدار جدید
        </Button>
      </PageHeader>

      <RallyMainCard>
        <RallyEmptyState
          icon={IconBell}
          message="هنوز هشداری تعریف نشده"
          actionLabel="تعریف اولین هشدار"
          onAction={() => setModalOpen(true)}
        />
      </RallyMainCard>

      <Box mt="md" className={animStyles.sectionEnter}>
        <RallyMainCard title="انواع هشدار">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {ALERT_TYPE_OPTIONS.map((opt) => {
              const badge = ALERT_BADGE_MAP[opt.value];
              return (
                <Card key={opt.value} withBorder radius="md" p="sm">
                  <Group gap="sm">
                    <Badge size="sm" variant="light" color={badge.color}>{badge.label}</Badge>
                    <Text size="sm">{opt.label}</Text>
                  </Group>
                </Card>
              );
            })}
          </SimpleGrid>
        </RallyMainCard>
      </Box>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="تعریف هشدار" size="sm">
        <Stack gap="sm">
          <Select label="نوع هشدار" data={ALERT_TYPE_OPTIONS} value={alertType} onChange={setAlertType} />
          <TextInput label="نماد" placeholder="مثال: فولاد" value={symbol} onChange={(e) => setSymbol(e.currentTarget.value)} />
          <NumberInput label="آستانه" value={threshold} onChange={setThreshold} min={0} />
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>انصراف</Button>
            <Button disabled={!symbol || threshold <= 0}>ثبت</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
