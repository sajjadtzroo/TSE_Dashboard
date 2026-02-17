/**
 * Loan Calculation Detail Component
 * Shows detailed breakdown of how loan calculations were performed
 */

import React, { memo, useState } from 'react';
import { Box, Typography, Divider, Collapse } from '@mui/material';
import { Calculator, TrendingUp, Wallet, Clock, AlertCircle, Table2, ChevronDown, ChevronUp } from 'lucide-react';
import type { LoanAnalysisResult } from '../types';
import CashFlowTimeSeries from './CashFlowTimeSeries';

interface LoanCalculationDetailProps {
  loan: LoanAnalysisResult;
}

const formatCurrency = (amount: number): string => {
  return (amount / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + ' میلیون تومان';
};

const formatPercent = (value: number): string => {
  return (value * 100).toLocaleString('fa-IR', { maximumFractionDigits: 2 }) + '%';
};

const InfoRow: React.FC<{ label: string; value: string; icon?: React.ReactNode; highlight?: boolean }> = memo(({ label, value, icon, highlight }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 16px',
      backgroundColor: highlight ? 'rgba(187, 134, 252, 0.05)' : 'transparent',
      borderRadius: '4px',
      '&:hover': {
        backgroundColor: highlight ? 'rgba(187, 134, 252, 0.08)' : 'rgba(255, 255, 255, 0.02)',
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon && <Box sx={{ color: '#999', display: 'flex' }}>{icon}</Box>}
      <Typography variant="body2" sx={{ color: '#999', fontSize: '0.875rem' }}>
        {label}
      </Typography>
    </Box>
    <Typography
      variant="body2"
      sx={{
        color: highlight ? '#BB86FC' : '#e5e5e5',
        fontWeight: highlight ? 600 : 500,
        fontSize: '0.875rem',
        fontFamily: 'Vazirmatn, sans-serif',
      }}
    >
      {value}
    </Typography>
  </Box>
));

const SectionTitle: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = memo(({ children, icon }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 3 }}>
    {icon && <Box sx={{ color: '#BB86FC', display: 'flex' }}>{icon}</Box>}
    <Typography
      variant="h6"
      sx={{
        fontSize: '0.95rem',
        fontWeight: 600,
        color: '#BB86FC',
        fontFamily: 'Vazirmatn, sans-serif',
      }}
    >
      {children}
    </Typography>
  </Box>
));

const CashFlowTimeSeriesSection: React.FC<{ loan: LoanAnalysisResult }> = memo(({ loan }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: open ? 2 : 0,
          mt: 3,
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid',
          borderColor: open ? 'rgba(187, 134, 252, 0.2)' : 'rgba(255, 255, 255, 0.06)',
          backgroundColor: open ? 'rgba(187, 134, 252, 0.04)' : 'transparent',
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(187, 134, 252, 0.06)',
            borderColor: 'rgba(187, 134, 252, 0.25)',
          },
        }}
        onClick={() => setOpen(!open)}
      >
        <Box sx={{ color: '#BB86FC', display: 'flex' }}><Table2 size={18} /></Box>
        <Typography
          variant="h6"
          sx={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#BB86FC',
            fontFamily: 'Vazirmatn, system-ui, sans-serif',
            flex: 1,
          }}
        >
          جدول جریان نقدی و محاسبه NPV/IRR
        </Typography>
        <Box sx={{ color: '#BB86FC', display: 'flex', opacity: 0.7 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Box>
      </Box>
      <Collapse in={open} timeout={300}>
        <Box sx={{ mb: 2, mt: 1 }}>
          <CashFlowTimeSeries loan={loan} />
        </Box>
      </Collapse>
    </>
  );
});

export const LoanCalculationDetail: React.FC<LoanCalculationDetailProps> = memo(({ loan }) => {
  return (
    <Box
      sx={{
        padding: '20px',
        backgroundColor: '#0a0a0a',
        borderRadius: '8px',
        border: '1px solid #1a1a1a',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          sx={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#e5e5e5',
            mb: 1,
            fontFamily: 'Vazirmatn, sans-serif',
          }}
        >
          جزئیات محاسبات - {loan.bankNameFA}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: '#999', fontSize: '0.85rem', fontFamily: 'Vazirmatn, sans-serif' }}
        >
          {loan.loanNameFA}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#1a1a1a', mb: 2 }} />

      {/* Input Parameters */}
      <SectionTitle icon={<Calculator size={18} />}>پارامترهای ورودی</SectionTitle>
      <Box sx={{ backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', mb: 2 }}>
        <InfoRow label="مبلغ سپرده" value={formatCurrency(loan.depositAmount)} />
        <InfoRow label="مدت انتظار" value={`${loan.waitMonths} ماه`} />
        <InfoRow
          label="ضریب سپرده به وام"
          value={loan.depositMultiplier !== null ? loan.depositRatioLabel : 'بر اساس سقف مبلغ'}
          highlight={loan.depositMultiplier !== null}
        />
        <InfoRow label="نوع وام" value={loan.loanCategory || '-'} />
        <InfoRow label="مدت بازپرداخت" value={`${loan.repaymentMonths} ماه`} />
        <InfoRow label="نرخ بهره وام" value={formatPercent(loan.loanRate)} />
        <InfoRow label="نرخ تنزیل" value={formatPercent(loan.discountRate)} />
      </Box>

      {/* Loan Amount Calculation */}
      <SectionTitle icon={<Wallet size={18} />}>محاسبه مبلغ وام</SectionTitle>
      <Box sx={{ backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', mb: 2 }}>
        <InfoRow
          label="مبلغ وام دریافتی"
          value={formatCurrency(loan.loanAmount)}
          highlight
        />
        <Box sx={{ p: 2, backgroundColor: '#050505' }}>
          <Typography
            variant="caption"
            sx={{ color: '#666', fontSize: '0.75rem', fontFamily: 'Vazirmatn, sans-serif' }}
          >
            {loan.depositMultiplier !== null
              ? `محاسبه بر اساس ضریب ${loan.depositRatioLabel}: سپرده ${formatCurrency(loan.depositAmount)} × ${loan.depositMultiplier}`
              : 'بر اساس سقف مبلغ وام (بدون ضریب سپرده)'}
          </Typography>
        </Box>
      </Box>

      {/* Payment Details */}
      <SectionTitle icon={<Clock size={18} />}>جزئیات پرداخت</SectionTitle>
      <Box sx={{ backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', mb: 2 }}>
        <InfoRow label="قسط ماهانه" value={formatCurrency(loan.monthlyPayment)} highlight />
        <InfoRow label="مجموع پرداختی" value={formatCurrency(loan.totalCost)} />
        <InfoRow label="نرخ موثر" value={formatPercent(loan.effectiveRate)} />
        <Box sx={{ p: 2, backgroundColor: '#050505' }}>
          <Typography
            variant="caption"
            sx={{ color: '#666', fontSize: '0.75rem', fontFamily: 'Vazirmatn, sans-serif', display: 'block', mb: 0.5 }}
          >
            فرمول قسط ماهانه (اقساط مساوی):
          </Typography>
          <Typography
            variant="caption"
            component="code"
            sx={{
              color: '#BB86FC',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              backgroundColor: '#0a0a0a',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'inline-block',
            }}
          >
            P × [r(1+r)^n] / [(1+r)^n - 1]
          </Typography>
        </Box>
      </Box>

      {/* Financial Metrics */}
      <SectionTitle icon={<TrendingUp size={18} />}>معیارهای مالی</SectionTitle>
      <Box sx={{ backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', mb: 2 }}>
        <InfoRow
          label="NPV (ارزش خالص فعلی)"
          value={formatCurrency(loan.npv)}
          highlight
        />
        <InfoRow
          label="IRR (نرخ بازده داخلی)"
          value={formatPercent(loan.irr)}
          highlight
        />
        <InfoRow label="امتیاز ریسک" value={loan.riskScore.toFixed(1)} />
        <Box sx={{ p: 2, backgroundColor: '#050505' }}>
          <Typography
            variant="caption"
            sx={{ color: '#666', fontSize: '0.75rem', fontFamily: 'Vazirmatn, sans-serif', display: 'block', mb: 1 }}
          >
            توضیحات:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2, color: '#666', fontSize: '0.7rem' }}>
            <li>NPV: ارزش فعلی جریان نقدی با احتساب نرخ تنزیل</li>
            <li>IRR: نرخ بازدهی که NPV را صفر می‌کند</li>
            <li>امتیاز: ترکیبی از NPV، IRR و ریسک</li>
          </Box>
        </Box>
      </Box>

      {/* Cash Flow Time Series */}
      <CashFlowTimeSeriesSection loan={loan} />

      {/* Privilege Analysis (if available) */}
      {loan.scenarios && (
        <>
          <SectionTitle icon={<AlertCircle size={18} />}>تحلیل سناریوها</SectionTitle>
          <Box sx={{ backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden', mb: 2 }}>
            {loan.scenarios.wait && (
              <InfoRow
                label="سناریو انتظار"
                value={formatCurrency(loan.scenarios.wait.npv)}
              />
            )}
            {loan.scenarios.buyPrivilege && (
              <InfoRow
                label="سناریو خرید امتیاز"
                value={formatCurrency(loan.scenarios.buyPrivilege.npv)}
              />
            )}
            {loan.scenarios.reject && (
              <InfoRow
                label="سناریو رد وام"
                value={formatCurrency(loan.scenarios.reject.npv)}
              />
            )}
            <InfoRow
              label="قیمت سر‌به‌سر امتیاز"
              value={formatCurrency(loan.breakEvenPrivilegePrice)}
              highlight
            />
            <InfoRow
              label="حداکثر مدت انتظار"
              value={`${loan.maxWaitMonths.toFixed(1)} ماه`}
              highlight
            />
          </Box>
        </>
      )}

      {/* Recommendation */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: loan.npv > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '6px',
          border: loan.npv > 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AlertCircle size={16} color={loan.npv > 0 ? '#10b981' : '#ef4444'} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: loan.npv > 0 ? '#10b981' : '#ef4444',
              fontFamily: 'Vazirmatn, sans-serif',
            }}
          >
            توصیه نهایی: {
              loan.recommendation === 'WAIT' ? 'منتظر بمانید' :
              loan.recommendation === 'BUY_PRIVILEGE' ? 'خرید امتیاز' :
              loan.recommendation === 'NEGOTIATE' ? 'مذاکره کنید' :
              'رد کنید'
            }
          </Typography>
        </Box>
        {loan.reasoning && (
          <Typography
            variant="caption"
            sx={{ color: '#999', fontSize: '0.75rem', fontFamily: 'Vazirmatn, sans-serif' }}
          >
            {loan.reasoning}
          </Typography>
        )}
      </Box>
    </Box>
  );
});

export default LoanCalculationDetail;
