import React, { useState } from 'react';
import { Box, Stack } from '@mantine/core';
import rallyColors from '../../../../theme/rallyColors';
import type { OptimizerInputs, DiscountRateMethod, RiskTolerance } from '../types';
import OptimizerHeader from './OptimizerHeader';
import OptimizerPresets from './OptimizerPresets';
import type { Preset } from './OptimizerPresets';
import OptimizerDepositSection from './OptimizerDepositSection';
import OptimizerLoanSection from './OptimizerLoanSection';
import OptimizerCalculationSection from './OptimizerCalculationSection';
import OptimizerAdvancedSection from './OptimizerAdvancedSection';
import OptimizerSubmitArea from './OptimizerSubmitArea';

interface OptimizerInputFormProps {
  onSubmit: (inputs: OptimizerInputs) => void;
  loading?: boolean;
}

const OptimizerInputForm: React.FC<OptimizerInputFormProps> = ({ onSubmit, loading }) => {
  const [depositAmount, setDepositAmount] = useState<number>(10_000_000);
  const [depositMonths, setDepositMonths] = useState<number>(3);
  const [loanAmountNeeded, setLoanAmountNeeded] = useState<number>(50_000_000);
  const [discountRateMethod, setDiscountRateMethod] = useState<DiscountRateMethod>('capm');
  const [customDiscountRate, setCustomDiscountRate] = useState<number>(25);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('medium');
  const [considerPrivilegePurchase, setConsiderPrivilegePurchase] = useState<boolean>(false);
  const [privilegePurchasePrice, setPrivilegePurchasePrice] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applyPreset = (preset: Preset) => {
    setDepositAmount(preset.values.depositAmount);
    setDepositMonths(preset.values.depositMonths);
    setLoanAmountNeeded(preset.values.loanAmountNeeded);
    setRiskTolerance(preset.values.riskTolerance);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (depositAmount <= 0) newErrors.depositAmount = 'مبلغ سپرده باید بزرگتر از صفر باشد';
    if (depositMonths <= 0 || depositMonths > 60) newErrors.depositMonths = 'مدت سپرده باید بین 1 تا 60 ماه باشد';
    if (loanAmountNeeded <= 0) newErrors.loanAmountNeeded = 'مبلغ وام باید بزرگتر از صفر باشد';
    if (discountRateMethod === 'custom' && (customDiscountRate < 0 || customDiscountRate > 100)) {
      newErrors.customDiscountRate = 'نرخ تنزیل باید بین 0 تا 100 درصد باشد';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit({
      depositAmount,
      depositMonths,
      loanAmountNeeded,
      discountRateMethod,
      customDiscountRate: discountRateMethod === 'custom' ? customDiscountRate : undefined,
      riskTolerance,
      considerPrivilegePurchase,
      privilegePurchasePrice: considerPrivilegePurchase && privilegePurchasePrice > 0 ? privilegePurchasePrice : undefined,
    });
  };

  return (
    <Box
      p="lg"
      style={{
        backgroundColor: rallyColors.card,
        borderRadius: 12,
        border: `1px solid ${rallyColors.border}`,
        boxShadow: rallyColors.glassShadow,
      }}
    >
      <OptimizerHeader />
      <OptimizerPresets onApply={applyPreset} />

      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <OptimizerDepositSection
            depositAmount={depositAmount}
            depositMonths={depositMonths}
            errors={errors}
            onDepositAmountChange={(val) => { setDepositAmount(val); setErrors({ ...errors, depositAmount: '' }); }}
            onDepositMonthsChange={(val) => { setDepositMonths(val); setErrors({ ...errors, depositMonths: '' }); }}
          />
          <OptimizerLoanSection
            loanAmountNeeded={loanAmountNeeded}
            errors={errors}
            onLoanAmountChange={(val) => { setLoanAmountNeeded(val); setErrors({ ...errors, loanAmountNeeded: '' }); }}
          />
          <OptimizerCalculationSection
            riskTolerance={riskTolerance}
            discountRateMethod={discountRateMethod}
            customDiscountRate={customDiscountRate}
            errors={errors}
            onRiskToleranceChange={setRiskTolerance}
            onDiscountRateMethodChange={setDiscountRateMethod}
            onCustomDiscountRateChange={(val) => { setCustomDiscountRate(val); setErrors({ ...errors, customDiscountRate: '' }); }}
          />
          <OptimizerAdvancedSection
            showAdvanced={showAdvanced}
            considerPrivilegePurchase={considerPrivilegePurchase}
            privilegePurchasePrice={privilegePurchasePrice}
            onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
            onConsiderPrivilegePurchaseChange={setConsiderPrivilegePurchase}
            onPrivilegePurchasePriceChange={setPrivilegePurchasePrice}
          />
          <OptimizerSubmitArea loading={loading} />
        </Stack>
      </form>
    </Box>
  );
};

export default OptimizerInputForm;
