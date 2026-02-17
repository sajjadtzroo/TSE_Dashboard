/**
 * Improved Optimizer Input Form Component
 * Enhanced UI/UX with better organization, tooltips, and presets
 */

import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  Checkbox,
  Box,
  Tooltip,
  IconButton,
  Chip,
  Alert,
  Collapse,
} from '@mui/material';
import {
  InfoOutlined,
  TrendingUp,
  AccountBalance,
  Settings,
  Speed,
  Home,
  Business,
  FlashOn,
} from '@mui/icons-material';
import type { OptimizerInputs, DiscountRateMethod, RiskTolerance } from '../types';
import CurrencyInput from '@/components/inputs/CurrencyInput';
import NumberInput from '@/components/inputs/NumberInput';
import PercentageInput from '@/components/inputs/PercentageInput';

interface OptimizerInputFormProps {
  onSubmit: (inputs: OptimizerInputs) => void;
  loading?: boolean;
}

interface Preset {
  name: string;
  icon: React.ReactNode;
  description: string;
  values: {
    depositAmount: number;
    depositMonths: number;
    loanAmountNeeded: number;
    riskTolerance: RiskTolerance;
  };
}

const presets: Preset[] = [
  {
    name: 'خرید خانه',
    icon: <Home className="w-5 h-5" />,
    description: 'برای خرید خانه اولین',
    values: {
      depositAmount: 50_000_000,
      depositMonths: 6,
      loanAmountNeeded: 500_000_000,
      riskTolerance: 'low',
    },
  },
  {
    name: 'وام کسب‌وکار',
    icon: <Business className="w-5 h-5" />,
    description: 'برای توسعه کسب‌وکار',
    values: {
      depositAmount: 20_000_000,
      depositMonths: 3,
      loanAmountNeeded: 200_000_000,
      riskTolerance: 'medium',
    },
  },
  {
    name: 'نقدینگی سریع',
    icon: <FlashOn className="w-5 h-5" />,
    description: 'برای نیاز فوری به پول',
    values: {
      depositAmount: 10_000_000,
      depositMonths: 1,
      loanAmountNeeded: 50_000_000,
      riskTolerance: 'high',
    },
  },
];

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <Tooltip
    title={text}
    arrow
    placement="top"
    sx={{
      '& .MuiTooltip-tooltip': {
        backgroundColor: '#1a1a1a',
        color: '#e5e5e5',
        fontSize: '0.75rem',
        maxWidth: 300,
        border: '1px solid #3d3d3d',
      },
      '& .MuiTooltip-arrow': {
        color: '#1a1a1a',
      },
    }}
  >
    <IconButton size="small" sx={{ color: '#999999', padding: '2px' }}>
      <InfoOutlined fontSize="small" />
    </IconButton>
  </Tooltip>
);

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

    if (depositAmount <= 0) {
      newErrors.depositAmount = 'مبلغ سپرده باید بزرگتر از صفر باشد';
    }

    if (depositMonths <= 0 || depositMonths > 60) {
      newErrors.depositMonths = 'مدت سپرده باید بین 1 تا 60 ماه باشد';
    }

    if (loanAmountNeeded <= 0) {
      newErrors.loanAmountNeeded = 'مبلغ وام باید بزرگتر از صفر باشد';
    }

    if (discountRateMethod === 'custom' && (customDiscountRate < 0 || customDiscountRate > 100)) {
      newErrors.customDiscountRate = 'نرخ تنزیل باید بین 0 تا 100 درصد باشد';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

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
    <div className="bg-surface-800 rounded-xl p-6 border border-surface-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary-400/10 p-3 rounded-lg">
            <TrendingUp className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-100">پارامترهای ورودی</h2>
            <p className="text-sm text-gray-400">اطلاعات مورد نیاز برای مقایسه وام‌ها</p>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-6 bg-surface-900 rounded-lg p-4 border border-surface-700">
        <div className="flex items-center gap-2 mb-3">
          <Speed className="w-5 h-5 text-primary-400" />
          <span className="text-sm font-medium text-gray-200">سناریوهای آماده</span>
          <InfoTooltip text="با کلیک روی هر سناریو، فیلدها به طور خودکار پر می‌شوند" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-3 p-3 bg-surface-800 hover:bg-surface-700 border border-surface-600 hover:border-primary-400/50 rounded-lg transition-all text-right group"
            >
              <div className="bg-primary-400/10 group-hover:bg-primary-400/20 p-2 rounded-lg transition-colors">
                {preset.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-100 text-sm">{preset.name}</div>
                <div className="text-xs text-gray-400 truncate">{preset.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Deposit Information */}
        <div className="bg-surface-900 rounded-lg p-4 border border-surface-700">
          <div className="flex items-center gap-2 mb-4">
            <AccountBalance className="w-5 h-5 text-primary-400" />
            <h3 className="text-sm font-semibold text-gray-100">اطلاعات سپرده</h3>
            <InfoTooltip text="مبلغ و مدت سپرده‌ای که قرار است در بانک بگذارید" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <CurrencyInput
                label="مبلغ سپرده (تومان)"
                value={depositAmount}
                onChange={(val) => {
                  setDepositAmount(val);
                  setErrors({ ...errors, depositAmount: '' });
                }}
                required
              />
              {errors.depositAmount && (
                <p className="text-xs text-pink-400 mt-1">{errors.depositAmount}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                مثال: ۱۰ میلیون تومان
              </p>
            </div>

            <div>
              <NumberInput
                label="مدت سپرده (ماه)"
                value={depositMonths}
                onChange={(val) => {
                  setDepositMonths(val);
                  setErrors({ ...errors, depositMonths: '' });
                }}
                min={1}
                max={60}
                required
              />
              {errors.depositMonths && (
                <p className="text-xs text-pink-400 mt-1">{errors.depositMonths}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                بین 1 تا 60 ماه
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Loan Requirements */}
        <div className="bg-surface-900 rounded-lg p-4 border border-surface-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            <h3 className="text-sm font-semibold text-gray-100">نیاز وام</h3>
            <InfoTooltip text="مبلغ وامی که نیاز دارید دریافت کنید" />
          </div>

          <div>
            <CurrencyInput
              label="مبلغ وام مورد نیاز (تومان)"
              value={loanAmountNeeded}
              onChange={(val) => {
                setLoanAmountNeeded(val);
                setErrors({ ...errors, loanAmountNeeded: '' });
              }}
              required
            />
            {errors.loanAmountNeeded && (
              <p className="text-xs text-pink-400 mt-1">{errors.loanAmountNeeded}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              مثال: ۵۰ میلیون تومان
            </p>
          </div>
        </div>

        {/* Section 3: Risk & Calculation Method */}
        <div className="bg-surface-900 rounded-lg p-4 border border-surface-700">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-primary-400" />
            <h3 className="text-sm font-semibold text-gray-100">تنظیمات محاسبات</h3>
          </div>

          <div className="space-y-4">
            {/* Risk Tolerance */}
            <FormControl fullWidth>
              <div className="flex items-center gap-2 mb-2">
                <InputLabel
                  sx={{
                    color: '#cccccc',
                    '&.Mui-focused': {
                      color: '#BB86FC',
                    },
                  }}
                >
                  تحمل ریسک
                </InputLabel>
                <InfoTooltip text="میزان ریسکی که می‌توانید در سرمایه‌گذاری بپذیرید. کم: محافظه‌کارانه، متوسط: متعادل، زیاد: تهاجمی" />
              </div>
              <Select
                value={riskTolerance}
                onChange={(e) => setRiskTolerance(e.target.value as RiskTolerance)}
                label="تحمل ریسک"
                sx={{
                  backgroundColor: '#121212',
                  borderRadius: '0.75rem',
                  color: '#e5e5e5',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3d3d3d',
                    borderWidth: '2px',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(187, 134, 252, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#BB86FC',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: '#121212',
                      color: '#e5e5e5',
                    },
                  },
                }}
              >
                <MenuItem value="low">
                  <div>
                    <div className="font-medium">کم (محافظه‌کارانه)</div>
                    <div className="text-xs text-gray-400">برای سرمایه‌گذاران محتاط</div>
                  </div>
                </MenuItem>
                <MenuItem value="medium">
                  <div>
                    <div className="font-medium">متوسط (متعادل)</div>
                    <div className="text-xs text-gray-400">توصیه می‌شود</div>
                  </div>
                </MenuItem>
                <MenuItem value="high">
                  <div>
                    <div className="font-medium">زیاد (تهاجمی)</div>
                    <div className="text-xs text-gray-400">برای سرمایه‌گذاران پرریسک</div>
                  </div>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Discount Rate Method */}
            <FormControl component="fieldset" fullWidth>
              <div className="flex items-center gap-2 mb-2">
                <FormLabel
                  component="legend"
                  sx={{
                    color: '#cccccc',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                  }}
                >
                  روش محاسبه نرخ تنزیل
                </FormLabel>
                <InfoTooltip text="روش محاسبه نرخ بازده مورد انتظار برای ارزیابی سودآوری وام" />
              </div>

              <div className="space-y-2">
                <label className="flex items-start p-3 bg-surface-800 hover:bg-surface-700 border border-surface-600 rounded-lg cursor-pointer transition-all group">
                  <Radio
                    checked={discountRateMethod === 'capm'}
                    onChange={() => setDiscountRateMethod('capm')}
                    value="capm"
                    sx={{
                      color: '#BB86FC',
                      '&.Mui-checked': { color: '#BB86FC' },
                      padding: '4px 9px',
                    }}
                  />
                  <div className="flex-1 pt-1">
                    <div className="font-medium text-gray-100 text-sm">
                      CAPM (پیشنهادی)
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      مدل قیمت‌گذاری دارایی سرمایه‌ای - دقیق‌ترین روش
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-3 bg-surface-800 hover:bg-surface-700 border border-surface-600 rounded-lg cursor-pointer transition-all group">
                  <Radio
                    checked={discountRateMethod === 'wacc'}
                    onChange={() => setDiscountRateMethod('wacc')}
                    value="wacc"
                    sx={{
                      color: '#BB86FC',
                      '&.Mui-checked': { color: '#BB86FC' },
                      padding: '4px 9px',
                    }}
                  />
                  <div className="flex-1 pt-1">
                    <div className="font-medium text-gray-100 text-sm">WACC</div>
                    <div className="text-xs text-gray-400 mt-1">
                      میانگین موزون هزینه سرمایه - برای تحلیل شرکتی
                    </div>
                  </div>
                </label>

                <label className="flex items-start p-3 bg-surface-800 hover:bg-surface-700 border border-surface-600 rounded-lg cursor-pointer transition-all group">
                  <Radio
                    checked={discountRateMethod === 'custom'}
                    onChange={() => setDiscountRateMethod('custom')}
                    value="custom"
                    sx={{
                      color: '#BB86FC',
                      '&.Mui-checked': { color: '#BB86FC' },
                      padding: '4px 9px',
                    }}
                  />
                  <div className="flex-1 pt-1">
                    <div className="font-medium text-gray-100 text-sm">نرخ دلخواه</div>
                    <div className="text-xs text-gray-400 mt-1">
                      وارد کردن نرخ تنزیل مورد نظر خودتان
                    </div>
                  </div>
                </label>
              </div>

              <Collapse in={discountRateMethod === 'custom'}>
                <div className="mt-3">
                  <PercentageInput
                    label="نرخ تنزیل سالانه (درصد)"
                    value={customDiscountRate}
                    onChange={(val) => {
                      setCustomDiscountRate(val);
                      setErrors({ ...errors, customDiscountRate: '' });
                    }}
                    required
                  />
                  {errors.customDiscountRate && (
                    <p className="text-xs text-pink-400 mt-1">{errors.customDiscountRate}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    معمولاً بین 15 تا 35 درصد
                  </p>
                </div>
              </Collapse>
            </FormControl>
          </div>
        </div>

        {/* Section 4: Advanced Options (Collapsible) */}
        <div className="border border-surface-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 bg-surface-900 hover:bg-surface-800 transition-colors text-right"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-200">تنظیمات پیشرفته</span>
              <Chip
                label="اختیاری"
                size="small"
                sx={{
                  backgroundColor: '#3d3d3d',
                  color: '#999',
                  fontSize: '0.7rem',
                  height: '20px',
                }}
              />
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <Collapse in={showAdvanced}>
            <div className="p-4 bg-surface-900 border-t border-surface-700">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={considerPrivilegePurchase}
                    onChange={(e) => setConsiderPrivilegePurchase(e.target.checked)}
                    sx={{
                      color: '#BB86FC',
                      '&.Mui-checked': { color: '#BB86FC' },
                    }}
                  />
                }
                label={
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200">
                      تحلیل خرید امتیاز (Privilege Purchase)
                    </span>
                    <InfoTooltip text="محاسبه قیمت مناسب برای خرید امتیاز و دریافت فوری وام بدون انتظار" />
                  </div>
                }
                sx={{ margin: 0, alignItems: 'center' }}
              />

              <Collapse in={considerPrivilegePurchase}>
                <div className="mt-4 p-4 bg-surface-800 rounded-lg border border-surface-700">
                  <Alert
                    severity="info"
                    sx={{
                      backgroundColor: 'rgba(187, 134, 252, 0.1)',
                      color: '#BB86FC',
                      border: '1px solid rgba(187, 134, 252, 0.2)',
                      marginBottom: 2,
                      '& .MuiAlert-icon': { color: '#BB86FC' },
                    }}
                  >
                    سیستم قیمت سر‌به‌سر خرید امتیاز را محاسبه می‌کند
                  </Alert>

                  <CurrencyInput
                    label="قیمت پیشنهادی بازار (اختیاری)"
                    value={privilegePurchasePrice}
                    onChange={setPrivilegePurchasePrice}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    اگر قیمت بازار دارید وارد کنید، در غیر این صورت خالی بگذارید
                  </p>
                </div>
              </Collapse>
            </div>
          </Collapse>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 disabled:from-surface-600 disabled:to-surface-600 disabled:cursor-not-allowed text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-primary-400/20 flex items-center justify-center gap-2 group"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              <span>در حال محاسبه...</span>
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>محاسبه و مقایسه همه وام‌ها</span>
            </>
          )}
        </button>

        {/* Help Text */}
        <div className="bg-surface-900/50 rounded-lg p-3 border border-surface-700/50">
          <p className="text-xs text-gray-400 text-center">
            💡 نکته: با استفاده از سناریوهای آماده می‌توانید سریع‌تر شروع کنید
          </p>
        </div>
      </form>
    </div>
  );
};

export default OptimizerInputForm;
