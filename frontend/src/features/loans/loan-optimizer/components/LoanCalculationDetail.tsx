/**
 * Loan Calculation Detail Component
 * Shows detailed breakdown of how loan calculations were performed
 */

import React, { memo, useState } from 'react';
import { Box, Text, Title, Divider, Collapse, Group, UnstyledButton } from '@mantine/core';
import {
  IconCalculator,
  IconTrendingUp,
  IconWallet,
  IconClock,
  IconAlertCircle,
  IconTable,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
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
  <Group
    justify="space-between"
    px="md"
    py="xs"
    style={{
      backgroundColor: highlight ? 'rgba(187, 134, 252, 0.05)' : 'transparent',
      borderRadius: 4,
    }}
  >
    <Group gap="xs">
      {icon && <Box style={{ color: '#999', display: 'flex' }}>{icon}</Box>}
      <Text size="sm" c={rallyColors.textDimmed}>
        {label}
      </Text>
    </Group>
    <Text
      size="sm"
      c={highlight ? '#BB86FC' : rallyColors.textPrimary}
      fw={highlight ? 600 : 500}
      style={{ fontFamily: 'Vazirmatn, sans-serif' }}
    >
      {value}
    </Text>
  </Group>
));

const SectionTitle: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = memo(({ children, icon }) => (
  <Group gap="xs" mb="sm" mt="md">
    {icon && <Box style={{ color: '#BB86FC', display: 'flex' }}>{icon}</Box>}
    <Text
      size="sm"
      fw={600}
      c="#BB86FC"
      style={{ fontFamily: 'Vazirmatn, sans-serif', fontSize: '0.95rem' }}
    >
      {children}
    </Text>
  </Group>
));

const CashFlowTimeSeriesSection: React.FC<{ loan: LoanAnalysisResult }> = memo(({ loan }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <UnstyledButton
        onClick={() => setOpen(!open)}
        mt="md"
        mb={open ? 'sm' : 0}
        w="100%"
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: `1px solid ${open ? 'rgba(187, 134, 252, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
          backgroundColor: open ? 'rgba(187, 134, 252, 0.04)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        <Group justify="space-between">
          <Group gap="xs">
            <Box style={{ color: '#BB86FC', display: 'flex' }}><IconTable size={18} /></Box>
            <Text
              fw={600}
              c="#BB86FC"
              style={{ fontFamily: 'Vazirmatn, system-ui, sans-serif', fontSize: '0.95rem' }}
            >
              جدول جریان نقدی و محاسبه NPV/IRR
            </Text>
          </Group>
          <Box style={{ color: '#BB86FC', display: 'flex', opacity: 0.7 }}>
            {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </Box>
        </Group>
      </UnstyledButton>
      <Collapse in={open}>
        <Box mb="sm" mt="xs">
          <CashFlowTimeSeries loan={loan} />
        </Box>
      </Collapse>
    </>
  );
});

export const LoanCalculationDetail: React.FC<LoanCalculationDetailProps> = memo(({ loan }) => {
  return (
    <Box
      p="lg"
      style={{
        backgroundColor: '#0a0a0a',
        borderRadius: 8,
        border: '1px solid #1a1a1a',
      }}
    >
      {/* Header */}
      <Box mb="md">
        <Title
          order={5}
          fw={700}
          c={rallyColors.textPrimary}
          mb="xs"
          style={{ fontFamily: 'Vazirmatn, sans-serif', fontSize: '1.1rem' }}
        >
          جزئیات محاسبات - {loan.bankNameFA}
        </Title>
        <Text
          size="sm"
          c={rallyColors.textDimmed}
          style={{ fontFamily: 'Vazirmatn, sans-serif', fontSize: '0.85rem' }}
        >
          {loan.loanNameFA}
        </Text>
      </Box>

      <Divider color="#1a1a1a" mb="sm" />

      {/* Input Parameters */}
      <SectionTitle icon={<IconCalculator size={18} />}>پارامترهای ورودی</SectionTitle>
      <Box style={{ backgroundColor: '#000', borderRadius: 6, overflow: 'hidden' }} mb="sm">
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
      <SectionTitle icon={<IconWallet size={18} />}>محاسبه مبلغ وام</SectionTitle>
      <Box style={{ backgroundColor: '#000', borderRadius: 6, overflow: 'hidden' }} mb="sm">
        <InfoRow
          label="مبلغ وام دریافتی"
          value={formatCurrency(loan.loanAmount)}
          highlight
        />
        <Box p="sm" style={{ backgroundColor: '#050505' }}>
          <Text
            size="xs"
            c={rallyColors.textDimmed}
            style={{ fontFamily: 'Vazirmatn, sans-serif', fontSize: '0.75rem' }}
          >
            {loan.depositMultiplier !== null
              ? `محاسبه بر اساس ضریب ${loan.depositRatioLabel}: سپرده ${formatCurrency(loan.depositAmount)} x ${loan.depositMultiplier}`
              : 'بر اساس سقف مبلغ وام (بدون ضریب سپرده)'}
          </Text>
        </Box>
      </Box>

      {/* Payment Details */}
      <SectionTitle icon={<IconClock size={18} />}>جزئیات پرداخت</SectionTitle>
      <Box style={{ backgroundColor: '#000', borderRadius: 6, overflow: 'hidden' }} mb="sm">
        <InfoRow label="قسط ماهانه" value={formatCurrency(loan.monthlyPayment)} highlight />
        <InfoRow label="مجموع پرداختی" value={formatCurrency(loan.totalCost)} />
        <InfoRow label="نرخ موثر" value={formatPercent(loan.effectiveRate)} />
        <Box p="sm" style={{ backgroundColor: '#050505' }}>
          <Text
            size="xs"
            c={rallyColors.textDimmed}
            mb={4}
            style={{ fontFamily: 'Vazirmatn, sans-serif', fontSize: '0.75rem' }}
          >
            فرمول قسط ماهانه (اقساط مساوی):
          </Text>
          <Box
            component="code"
            style={{
              color: '#BB86FC',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              backgroundColor: '#0a0a0a',
              padding: '4px 8px',
              borderRadius: 4,
              display: 'inline-block',
            }}
          >
            P x [r(1+r)^n] / [(1+r)^n - 1]
          </Box>
        </Box>
      </Box>

      {/* Financial Metrics */}
      <SectionTitle icon={<IconTrendingUp size={18} />}>معیارهای مالی</SectionTitle>
      <Box style={{ backgroundColor: '#000', borderRadius: 6, overflow: 'hidden' }} mb="sm">
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
        <Box p="sm" style={{ backgroundColor: '#050505' }}>
          <Text
            size="xs"
            c={rallyColors.textDimmed}
            mb="xs"
            style={{ fontFamily: 'Vazirmatn, sans-serif', fontSize: '0.75rem' }}
          >
            توضیحات:
          </Text>
          <Box
            component="ul"
            style={{ margin: 0, paddingRight: 16, color: rallyColors.textDimmed, fontSize: '0.7rem' }}
          >
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
          <SectionTitle icon={<IconAlertCircle size={18} />}>تحلیل سناریوها</SectionTitle>
          <Box style={{ backgroundColor: '#000', borderRadius: 6, overflow: 'hidden' }} mb="sm">
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
        mt="md"
        p="sm"
        style={{
          backgroundColor: loan.npv > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: 6,
          border: loan.npv > 0 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
        }}
      >
        <Group gap="xs" mb="xs">
          <IconAlertCircle size={16} color={loan.npv > 0 ? '#10b981' : '#ef4444'} />
          <Text
            size="sm"
            fw={600}
            c={loan.npv > 0 ? '#10b981' : '#ef4444'}
            style={{ fontFamily: 'Vazirmatn, sans-serif' }}
          >
            توصیه نهایی: {
              loan.recommendation === 'WAIT' ? 'منتظر بمانید' :
              loan.recommendation === 'BUY_PRIVILEGE' ? 'خرید امتیاز' :
              loan.recommendation === 'NEGOTIATE' ? 'مذاکره کنید' :
              'رد کنید'
            }
          </Text>
        </Group>
        {loan.reasoning && (
          <Text
            size="xs"
            c={rallyColors.textDimmed}
            style={{ fontFamily: 'Vazirmatn, sans-serif', fontSize: '0.75rem' }}
          >
            {loan.reasoning}
          </Text>
        )}
      </Box>
    </Box>
  );
});

export default LoanCalculationDetail;
