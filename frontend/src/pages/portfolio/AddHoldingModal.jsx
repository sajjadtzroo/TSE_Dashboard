import { useState, useEffect } from 'react';
import { Modal, Select, NumberInput, Button, Stack, Group } from '@mantine/core';
import { useCompanies } from '../../hooks/useMarketData';

export default function AddHoldingModal({ opened, onClose, onAdd, editHolding = null, market = [] }) {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [buyPrice, setBuyPrice] = useState('');

  const { data } = useCompanies({ perPage: 500 });
  const companies = data?.items ?? [];

  // Pre-fill when editing
  useEffect(() => {
    if (editHolding) {
      setSymbol(editHolding.symbol);
      setQuantity(editHolding.quantity);
      setBuyPrice(editHolding.buyPrice);
    } else {
      setSymbol('');
      setQuantity(1);
      setBuyPrice('');
    }
  }, [editHolding, opened]);

  // Pre-fill buy price with live price when symbol selected (add mode only)
  useEffect(() => {
    if (symbol && !editHolding) {
      const live = market.find((m) => m.symbol === symbol);
      if (live?.close) setBuyPrice(live.close);
    }
  }, [symbol, market, editHolding]);

  const companyOptions = companies.map((c) => ({
    value: c.symbol,
    label: `${c.symbol} — ${c.name_fa || ''}`,
  }));

  const handleSubmit = () => {
    if (!symbol || !quantity || !buyPrice) return;
    onAdd(symbol, Number(quantity), Number(buyPrice));
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editHolding ? 'ویرایش دارایی' : 'افزودن دارایی'}
      centered
    >
      <Stack gap="md">
        <Select
          label="نماد"
          placeholder="جستجوی نماد..."
          data={companyOptions}
          value={symbol}
          onChange={setSymbol}
          searchable
          clearable
          required
          disabled={!!editHolding}
          nothingFoundMessage="نمادی یافت نشد"
        />
        <NumberInput
          label="تعداد"
          placeholder="تعداد سهام"
          value={quantity}
          onChange={setQuantity}
          min={1}
          step={1}
          required
          allowNegative={false}
        />
        <NumberInput
          label="قیمت خرید (ریال)"
          placeholder="قیمت خرید"
          value={buyPrice}
          onChange={setBuyPrice}
          min={1}
          step={10}
          required
          allowNegative={false}
          thousandSeparator=","
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            انصراف
          </Button>
          <Button
            disabled={!symbol || !quantity || !buyPrice}
            onClick={handleSubmit}
            color="blue"
          >
            {editHolding ? 'ذخیره' : 'افزودن'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
