import { useState, useEffect, useMemo } from 'react';
import { Modal, Select, NumberInput, Button, Stack, Group, SegmentedControl } from '@mantine/core';
import { useCompanies } from '../../hooks/useMarketData';

export default function AddHoldingModal({ opened, onClose, onAdd, editHolding = null, market = [], cryptoMarket = [] }) {
  const [marketType, setMarketType] = useState('tse');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [buyPrice, setBuyPrice] = useState('');

  const { data } = useCompanies({ perPage: 2000 });
  const companies = data?.items ?? [];

  // Pre-fill when editing
  useEffect(() => {
    if (editHolding) {
      setMarketType(editHolding.market_type || 'tse');
      setSymbol(editHolding.symbol);
      setQuantity(editHolding.quantity);
      setBuyPrice(editHolding.buyPrice);
    } else {
      setSymbol('');
      setQuantity(1);
      setBuyPrice('');
    }
  }, [editHolding, opened]);

  // Reset symbol when switching market type (add mode only)
  useEffect(() => {
    if (!editHolding) {
      setSymbol('');
      setBuyPrice('');
    }
  }, [marketType, editHolding]);

  // Pre-fill buy price with live price when symbol selected (add mode only)
  useEffect(() => {
    if (symbol && !editHolding) {
      if (marketType === 'crypto') {
        const live = cryptoMarket.find((m) => m.symbol === symbol);
        if (live?.last_price) setBuyPrice(live.last_price);
      } else {
        const live = market.find((m) => m.symbol === symbol);
        if (live?.close) setBuyPrice(live.close);
      }
    }
  }, [symbol, market, cryptoMarket, editHolding, marketType]);

  const isCrypto = marketType === 'crypto';

  const assetOptions = useMemo(() => {
    if (isCrypto) {
      const seen = new Set();
      return cryptoMarket
        .filter((c) => c.symbol && !seen.has(c.symbol) && seen.add(c.symbol))
        .map((c) => ({ value: c.symbol, label: `${c.symbol} — ${c.name_fa || c.name || ''}` }));
    }
    const seen = new Set();
    return companies
      .filter((c) => c.symbol && !seen.has(c.symbol) && seen.add(c.symbol))
      .map((c) => ({ value: c.symbol, label: `${c.symbol} — ${c.name_fa || ''}` }));
  }, [isCrypto, companies, cryptoMarket]);

  const handleSubmit = () => {
    if (!symbol || !quantity || !buyPrice) return;
    onAdd(symbol, Number(quantity), Number(buyPrice), marketType);
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
        <SegmentedControl
          value={marketType}
          onChange={setMarketType}
          disabled={!!editHolding}
          data={[
            { label: 'سهام', value: 'tse' },
            { label: 'رمزارز', value: 'crypto' },
          ]}
          fullWidth
        />
        <Select
          label="نماد"
          placeholder="جستجوی نماد..."
          data={assetOptions}
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
          placeholder={isCrypto ? 'مقدار' : 'تعداد سهام'}
          value={quantity}
          onChange={setQuantity}
          min={isCrypto ? 0.00000001 : 1}
          step={isCrypto ? 0.01 : 1}
          required
          allowNegative={false}
          decimalScale={isCrypto ? 8 : 0}
        />
        <NumberInput
          label={isCrypto ? 'قیمت خرید (دلار)' : 'قیمت خرید (ریال)'}
          placeholder="قیمت خرید"
          value={buyPrice}
          onChange={setBuyPrice}
          min={0.00000001}
          step={isCrypto ? 0.01 : 10}
          required
          allowNegative={false}
          thousandSeparator=","
          decimalScale={isCrypto ? 8 : 0}
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
