import { SimpleGrid, NumberInput, Slider } from '@mantine/core';

export default function OptionsParameters({
  stockPrice,
  daysToExpiry,
  riskFreeRate,
  volatility,
  onStockPriceChange,
  onDaysChange,
  onRateChange,
  onVolatilityChange,
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
      <div>
        <NumberInput
          label="قیمت سهم (S)"
          value={stockPrice}
          onChange={(v) => onStockPriceChange(v || 0)}
          min={1}
          step={100}
          size="sm"
        />
        <Slider
          value={stockPrice}
          onChange={onStockPriceChange}
          min={100}
          max={100000}
          step={100}
          mt="xs"
          size="xs"
          color="rally-primary"
        />
      </div>
      <div>
        <NumberInput
          label="روز تا سررسید"
          value={daysToExpiry}
          onChange={(v) => onDaysChange(v || 1)}
          min={1}
          max={730}
          size="sm"
        />
        <Slider
          value={daysToExpiry}
          onChange={onDaysChange}
          min={1}
          max={730}
          mt="xs"
          size="xs"
          color="rally-primary"
        />
      </div>
      <div>
        <NumberInput
          label="نرخ بدون ریسک (٪)"
          value={riskFreeRate}
          onChange={(v) => onRateChange(v ?? 0)}
          min={0}
          max={50}
          step={0.5}
          decimalScale={1}
          size="sm"
        />
        <Slider
          value={riskFreeRate}
          onChange={onRateChange}
          min={0}
          max={50}
          step={0.5}
          mt="xs"
          size="xs"
          color="rally-primary"
        />
      </div>
      <div>
        <NumberInput
          label="نوسان‌پذیری (٪)"
          value={volatility}
          onChange={(v) => onVolatilityChange(v ?? 1)}
          min={1}
          max={200}
          step={1}
          size="sm"
        />
        <Slider
          value={volatility}
          onChange={onVolatilityChange}
          min={1}
          max={200}
          mt="xs"
          size="xs"
          color="rally-primary"
        />
      </div>
    </SimpleGrid>
  );
}
