import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
} from '@mantine/core';

const TX_TYPE_OPTIONS = [
  { value: 'buy', label: 'خرید' },
  { value: 'sell', label: 'فروش' },
  { value: 'dividend', label: 'سود نقدی' },
  { value: 'fee', label: 'کارمزد' },
  { value: 'deposit', label: 'واریز' },
  { value: 'withdrawal', label: 'برداشت' },
];

const MARKET_TYPE_OPTIONS = [
  { value: 'tse', label: 'بورس تهران' },
  { value: 'crypto', label: 'ارز دیجیتال' },
];

export default function AddTransactionModal({
  opened,
  onClose,
  onSubmit,
  editTransaction = null,
}) {
  const [symbol, setSymbol] = useState('');
  const [marketType, setMarketType] = useState('tse');
  const [txType, setTxType] = useState('buy');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [fee, setFee] = useState(0);
  const [executedAt, setExecutedAt] = useState(new Date());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editTransaction) {
      setSymbol(editTransaction.symbol || '');
      setMarketType(editTransaction.market_type || 'tse');
      setTxType(editTransaction.tx_type || 'buy');
      setQuantity(Number(editTransaction.quantity) || 0);
      setPrice(Number(editTransaction.price) || 0);
      setFee(Number(editTransaction.fee) || 0);
      setExecutedAt(new Date(editTransaction.executed_at));
      setNote(editTransaction.note || '');
    } else {
      setSymbol('');
      setMarketType('tse');
      setTxType('buy');
      setQuantity(0);
      setPrice(0);
      setFee(0);
      setExecutedAt(new Date());
      setNote('');
    }
  }, [editTransaction, opened]);

  const handleSubmit = () => {
    if (!symbol || quantity <= 0) return;
    onSubmit({
      symbol: symbol.trim(),
      market_type: marketType,
      tx_type: txType,
      quantity: String(quantity),
      price: String(price),
      fee: String(fee),
      executed_at: executedAt.toISOString(),
      note: note || null,
    });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editTransaction ? 'ویرایش معامله' : 'ثبت معامله جدید'}
      size="md"
    >
      <Stack gap="sm">
        <Group grow>
          <TextInput
            label="نماد"
            placeholder="مثال: فولاد"
            value={symbol}
            onChange={(e) => setSymbol(e.currentTarget.value)}
            required
          />
          <Select
            label="بازار"
            data={MARKET_TYPE_OPTIONS}
            value={marketType}
            onChange={setMarketType}
          />
        </Group>

        <Select
          label="نوع معامله"
          data={TX_TYPE_OPTIONS}
          value={txType}
          onChange={setTxType}
        />

        <Group grow>
          <NumberInput
            label="تعداد"
            value={quantity}
            onChange={setQuantity}
            min={0}
            decimalScale={8}
          />
          <NumberInput
            label="قیمت واحد"
            value={price}
            onChange={setPrice}
            min={0}
            decimalScale={4}
          />
        </Group>

        <NumberInput
          label="کارمزد"
          value={fee}
          onChange={setFee}
          min={0}
          decimalScale={4}
        />

        <TextInput
          label="تاریخ و ساعت"
          type="datetime-local"
          value={executedAt instanceof Date ? executedAt.toISOString().slice(0, 16) : executedAt}
          onChange={(e) => setExecutedAt(new Date(e.currentTarget.value))}
        />

        <TextInput
          label="یادداشت"
          placeholder="اختیاری"
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" onClick={onClose}>انصراف</Button>
          <Button onClick={handleSubmit} disabled={!symbol || quantity <= 0}>
            {editTransaction ? 'ذخیره' : 'ثبت'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
