import { useState } from 'react';
import { Group, Select, Button, Text, Box, Badge } from '@mantine/core';
import { IconPlus, IconReceipt } from '@tabler/icons-react';
import PageHeader from '../../components/PageHeader';
import RallyMainCard from '../../components/RallyMainCard';
import RallyDataTable from '../../components/RallyDataTable';
import RallyEmptyState from '../../components/RallyEmptyState';
import ExportButton from '../../components/ExportButton';
import AddTransactionModal from './components/AddTransactionModal';
import {
  usePortfolios,
  useTransactions,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '../../hooks/usePortfolioAPI';
import { formatNum, toPersianNum } from '../../utils/formatUtils';
import rallyColors from '../../theme/rallyColors';

const TX_BADGE_MAP = {
  buy: { color: 'green', label: 'خرید' },
  sell: { color: 'red', label: 'فروش' },
  dividend: { color: 'violet', label: 'سود نقدی' },
  fee: { color: 'yellow', label: 'کارمزد' },
  deposit: { color: 'blue', label: 'واریز' },
  withdrawal: { color: 'orange', label: 'برداشت' },
};

export default function TransactionLedger() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [filters, setFilters] = useState({ page: 1 });

  const { data: portfolios = [] } = usePortfolios();
  const defaultPortfolio = portfolios.find((p) => p.is_default) || portfolios[0];
  const portfolioId = defaultPortfolio?.id;

  const { data: txData, isLoading } = useTransactions(portfolioId, filters);
  const addTx = useAddTransaction(portfolioId);
  const updateTx = useUpdateTransaction(portfolioId);
  const deleteTx = useDeleteTransaction(portfolioId);

  const transactions = txData?.items || [];
  const total = txData?.total || 0;

  const handleSubmit = (data) => {
    if (editTx) {
      updateTx.mutate({ txId: editTx.id, data });
    } else {
      addTx.mutate(data);
    }
    setEditTx(null);
  };

  const handleDelete = (txId) => {
    deleteTx.mutate(txId);
  };

  const columns = [
    {
      accessor: 'executed_at',
      title: 'تاریخ',
      width: 140,
      render: (r) => (
        <Text size="sm" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {new Date(r.executed_at).toLocaleDateString('fa-IR')}
        </Text>
      ),
    },
    {
      accessor: 'tx_type',
      title: 'نوع',
      width: 90,
      render: (r) => {
        const badge = TX_BADGE_MAP[r.tx_type] || { color: 'gray', label: r.tx_type };
        return <Badge size="sm" variant="light" color={badge.color}>{badge.label}</Badge>;
      },
    },
    {
      accessor: 'symbol',
      title: 'نماد',
      width: 100,
      render: (r) => (
        <Text size="sm" fw={600} c={r.market_type === 'crypto' ? rallyColors.yellow : rallyColors.blue}>
          {r.symbol}
          {r.market_type === 'crypto' && <Text component="span" size="xs" c="dimmed" ms={3}>$</Text>}
        </Text>
      ),
    },
    {
      accessor: 'quantity',
      title: 'تعداد',
      width: 100,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(Number(r.quantity))}</Text>,
    },
    {
      accessor: 'price',
      title: 'قیمت',
      width: 110,
      textAlign: 'end',
      render: (r) => <Text size="sm">{formatNum(Number(r.price))}</Text>,
    },
    {
      accessor: 'fee',
      title: 'کارمزد',
      width: 90,
      textAlign: 'end',
      render: (r) => (
        <Text size="sm" c={Number(r.fee) > 0 ? rallyColors.yellow : 'dimmed'}>
          {Number(r.fee) > 0 ? formatNum(Number(r.fee)) : '—'}
        </Text>
      ),
    },
    {
      accessor: 'total',
      title: 'ارزش کل',
      width: 130,
      textAlign: 'end',
      render: (r) => {
        const total = Number(r.quantity) * Number(r.price);
        return <Text size="sm" fw={600}>{formatNum(Math.round(total))}</Text>;
      },
    },
    {
      accessor: 'note',
      title: 'یادداشت',
      width: 120,
      render: (r) => (
        <Text size="xs" c="dimmed" lineClamp={1}>{r.note || '—'}</Text>
      ),
    },
    {
      accessor: 'actions',
      title: '',
      width: 72,
      render: (r) => (
        <Group gap={4} wrap="nowrap">
          <Button
            variant="subtle"
            color="blue"
            size="compact-xs"
            onClick={() => { setEditTx(r); setModalOpen(true); }}
          >
            ویرایش
          </Button>
          <Button
            variant="subtle"
            color="red"
            size="compact-xs"
            onClick={() => handleDelete(r.id)}
          >
            حذف
          </Button>
        </Group>
      ),
    },
  ];

  const exportColumns = [
    { accessor: 'executed_at', title: 'تاریخ' },
    { accessor: 'tx_type', title: 'نوع' },
    { accessor: 'symbol', title: 'نماد' },
    { accessor: 'quantity', title: 'تعداد' },
    { accessor: 'price', title: 'قیمت' },
    { accessor: 'fee', title: 'کارمزد' },
    { accessor: 'note', title: 'یادداشت' },
  ];

  if (!portfolioId) {
    return (
      <>
        <PageHeader title="دفتر معاملات" />
        <RallyMainCard>
          <RallyEmptyState
            icon={IconReceipt}
            message="ابتدا وارد حساب کاربری شوید"
          />
        </RallyMainCard>
      </>
    );
  }

  return (
    <>
      <PageHeader title="دفتر معاملات">
        <Group gap="xs">
          <ExportButton filename="transactions" columns={exportColumns} records={transactions} />
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => { setEditTx(null); setModalOpen(true); }}
            color="blue"
          >
            ثبت معامله
          </Button>
        </Group>
      </PageHeader>

      <RallyMainCard noPadding>
        <RallyDataTable
          records={transactions}
          columns={columns}
          idAccessor="id"
          loading={isLoading}
          minHeight={400}
          emptyMessage="هنوز معامله‌ای ثبت نشده"
          pinLeftColumns
          storeColumnsKey="portfolio-transactions"
        />
      </RallyMainCard>

      <AddTransactionModal
        opened={modalOpen}
        onClose={() => { setModalOpen(false); setEditTx(null); }}
        onSubmit={handleSubmit}
        editTransaction={editTx}
      />
    </>
  );
}
