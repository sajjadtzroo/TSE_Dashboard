import { memo } from 'react';
import { Group, Text, Box, SimpleGrid, Badge, Table } from '@mantine/core';
import { IconCalculator, IconTrendingUp, IconShield, IconCash, IconClock } from '@tabler/icons-react';
import rallyColors from '../../../../theme/rallyColors';
import type { LoanType } from '@/types';

interface LoanFinancialInfoProps {
  loan: LoanType;
}

export const LoanFinancialInfo = memo(function LoanFinancialInfo({
  loan,
}: LoanFinancialInfoProps) {
  const hasMonthlyPayment = !!loan.monthlyPayment;
  const hasFees = loan.fee || loan.creditCheckFee || loan.applicationFee;
  const hasRates = loan.depositRate || loan.latePaymentRate;
  const hasTotals = loan.totalRepayment || loan.totalInterest;
  const hasCollateral = !!loan.collateral;
  const hasAveragePeriod = !!loan.minAveragePeriod;
  const hasAvailableAmounts = loan.availableAmounts || loan.amounts;
  const hasFormula = loan.loanMultiplier || loan.formula;
  const hasDepositDuration = loan.depositAmountOneMonth || loan.depositAmountThreeMonths || loan.depositAmountSixMonths;
  const hasFeeByDuration = loan.feeByDuration && Object.keys(loan.feeByDuration).length > 0;

  if (!hasMonthlyPayment && !hasFees && !hasRates && !hasTotals && !hasCollateral && !hasAveragePeriod && !hasAvailableAmounts && !hasFormula && !hasDepositDuration && !hasFeeByDuration) {
    return null;
  }

  return (
    <>
      {hasMonthlyPayment && (
        <Box
          p="md"
          style={{
            backgroundColor: 'rgba(34, 197, 94,0.1)',
            borderRadius: 8,
            border: '1px solid rgba(34, 197, 94,0.2)',
          }}
        >
          <Group gap={8} mb="xs">
            <IconCalculator size={20} color={rallyColors.green} />
            <Text fw={500} c={rallyColors.green}>قسط ماهانه</Text>
          </Group>
          <Text size="xl" fw={700} c={rallyColors.green}>
            {loan.monthlyPayment}
          </Text>
          {loan.monthlyPaymentFA && (
            <Text size="sm" c={rallyColors.green} opacity={0.7} mt={4}>
              {loan.monthlyPaymentFA}
            </Text>
          )}
        </Box>
      )}

      {hasFees && (
        <Group gap="sm" wrap="wrap">
          {loan.fee && (
            <Box px="md" py="xs" style={{ backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)' }}>
              <Text size="sm" c="#fb923c" span>کارمزد: </Text>
              <Text fw={700} c="#fed7aa" span>{loan.fee}</Text>
              {loan.feeFA && <Text size="xs" c="#fb923c" opacity={0.7} mt={4}>{loan.feeFA}</Text>}
            </Box>
          )}
          {loan.creditCheckFee && (
            <Box px="md" py="xs" style={{ backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)' }}>
              <Text size="sm" c="#fb923c" span>هزینه اعتبارسنجی: </Text>
              <Text fw={700} c="#fed7aa" span>{loan.creditCheckFee}</Text>
              {loan.creditCheckFeeFA && <Text size="xs" c="#fb923c" opacity={0.7} mt={4}>{loan.creditCheckFeeFA}</Text>}
            </Box>
          )}
          {loan.applicationFee && (
            <Box px="md" py="xs" style={{ backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 8, border: '1px solid rgba(249,115,22,0.2)' }}>
              <Text size="sm" c="#fb923c" span>هزینه درخواست: </Text>
              <Text fw={700} c="#fed7aa" span>{loan.applicationFee}</Text>
              {loan.applicationFeeFA && <Text size="xs" c="#fb923c" opacity={0.7} mt={4}>{loan.applicationFeeFA}</Text>}
            </Box>
          )}
        </Group>
      )}

      {hasRates && (
        <Group gap="sm" wrap="wrap">
          {loan.depositRate && (
            <Box px="md" py="xs" style={{ backgroundColor: 'rgba(20,184,166,0.1)', borderRadius: 8, border: '1px solid rgba(20,184,166,0.2)' }}>
              <Text size="sm" c="#14b8a6" span>نرخ سپرده: </Text>
              <Text fw={700} c="#5eead4" span>{loan.depositRate}</Text>
              {loan.depositRateFA && <Text size="xs" c="#14b8a6" opacity={0.7} mt={4}>{loan.depositRateFA}</Text>}
            </Box>
          )}
          {loan.latePaymentRate && (
            <Box px="md" py="xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
              <Text size="sm" c="#ef4444" span>نرخ دیرکرد: </Text>
              <Text fw={700} c="#fca5a5" span>{loan.latePaymentRate}</Text>
              {loan.latePaymentRateFA && <Text size="xs" c="#ef4444" opacity={0.7} mt={4}>{loan.latePaymentRateFA}</Text>}
            </Box>
          )}
        </Group>
      )}

      {hasTotals && (
        <Box
          p="md"
          style={{
            backgroundColor: 'rgba(167,139,250,0.1)',
            borderRadius: 8,
            border: '1px solid rgba(167,139,250,0.2)',
          }}
        >
          <Group gap={8} mb="xs">
            <IconTrendingUp size={20} color="#a78bfa" />
            <Text fw={500} c="#a78bfa">اطلاعات بازپرداخت کل</Text>
          </Group>
          <SimpleGrid cols={2} spacing="md">
            {loan.totalRepayment && (
              <div>
                <Text size="xs" c="#a78bfa" opacity={0.7}>کل بازپرداخت</Text>
                <Text fw={700} c="#c4b5fd">{loan.totalRepayment}</Text>
              </div>
            )}
            {loan.totalInterest && (
              <div>
                <Text size="xs" c="#a78bfa" opacity={0.7}>کل سود</Text>
                <Text fw={700} c="#c4b5fd">{loan.totalInterest}</Text>
              </div>
            )}
          </SimpleGrid>
        </Box>
      )}

      {hasCollateral && (
        <Box
          p="md"
          style={{
            backgroundColor: 'rgba(234,179,8,0.1)',
            borderRadius: 8,
            border: '1px solid rgba(234,179,8,0.2)',
          }}
        >
          <Group gap={8} mb="xs">
            <IconShield size={20} color="#eab308" />
            <Text fw={500} c="#eab308">وثیقه</Text>
          </Group>
          <Text c="#fde047">{loan.collateral}</Text>
          {loan.collateralFA && (
            <Text size="sm" c="#eab308" opacity={0.7} mt={4}>{loan.collateralFA}</Text>
          )}
        </Box>
      )}

      {hasAveragePeriod && (
        <Box px="md" py="xs" style={{ backgroundColor: 'rgba(6,182,212,0.1)', borderRadius: 8, border: '1px solid rgba(6,182,212,0.2)' }}>
          <Text size="sm" c="#06b6d4" span>حداقل مدت معدل‌گیری: </Text>
          <Text fw={700} c="#67e8f9" span>{loan.minAveragePeriod}</Text>
          {loan.averagePeriodFA && <Text size="xs" c="#06b6d4" opacity={0.7} mt={4}>{loan.averagePeriodFA}</Text>}
        </Box>
      )}

      {hasFormula && (
        <Box
          p="md"
          style={{
            backgroundColor: 'rgba(6,182,212,0.1)',
            borderRadius: 8,
            border: '1px solid rgba(6,182,212,0.2)',
          }}
        >
          <Group gap={8} mb="xs">
            <IconCalculator size={20} color="#06b6d4" />
            <Text fw={500} c="#06b6d4">فرمول محاسبه</Text>
          </Group>
          {loan.loanMultiplier && (
            <Text fw={700} c="#67e8f9">ضریب: {loan.loanMultiplier}</Text>
          )}
          {loan.loanMultiplierFA && (
            <Text size="sm" c="#06b6d4" opacity={0.7}>{loan.loanMultiplierFA}</Text>
          )}
          {loan.formulaFA && (
            <Text size="sm" c="#67e8f9" mt="xs">{loan.formulaFA}</Text>
          )}
        </Box>
      )}

      {hasAvailableAmounts && (
        <div>
          <Group gap={8} mb="sm">
            <IconCash size={20} color={rallyColors.textSecondary} />
            <Text fw={500} c={rallyColors.textSecondary}>مبالغ قابل دریافت</Text>
          </Group>
          <Group gap="xs" wrap="wrap">
            {(loan.availableAmounts || loan.amounts)?.map((amount, idx) => (
              <Badge key={idx} variant="light" color="gray" radius="xl" size="md">
                {amount}
              </Badge>
            ))}
          </Group>
        </div>
      )}

      {hasDepositDuration && (
        <Box
          p="md"
          style={{
            backgroundColor: 'rgba(6,182,212,0.1)',
            borderRadius: 8,
            border: '1px solid rgba(6,182,212,0.2)',
          }}
        >
          <Group gap={8} mb="sm">
            <IconClock size={20} color="#06b6d4" />
            <Text fw={500} c="#06b6d4">مبلغ سپرده بر اساس مدت</Text>
          </Group>
          <Table
            striped
            highlightOnHover
            withTableBorder
            styles={{
              th: { color: rallyColors.textDimmed, fontSize: 12 },
              td: { color: rallyColors.textPrimary },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>مدت</Table.Th>
                <Table.Th>مبلغ سپرده</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loan.depositAmountOneMonth && (
                <Table.Tr>
                  <Table.Td>۱ ماه</Table.Td>
                  <Table.Td>{loan.depositAmountOneMonth}</Table.Td>
                </Table.Tr>
              )}
              {loan.depositAmountThreeMonths && (
                <Table.Tr>
                  <Table.Td>۳ ماه</Table.Td>
                  <Table.Td>{loan.depositAmountThreeMonths}</Table.Td>
                </Table.Tr>
              )}
              {loan.depositAmountSixMonths && (
                <Table.Tr>
                  <Table.Td>۶ ماه</Table.Td>
                  <Table.Td>{loan.depositAmountSixMonths}</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Box>
      )}

      {hasFeeByDuration && (
        <Box
          p="md"
          style={{
            backgroundColor: 'rgba(249,115,22,0.08)',
            borderRadius: 8,
            border: '1px solid rgba(249,115,22,0.2)',
          }}
        >
          <Group gap={8} mb="sm">
            <IconCalculator size={20} color="#fb923c" />
            <Text fw={500} c="#fb923c">کارمزد بر اساس مدت</Text>
          </Group>
          <Table
            striped
            highlightOnHover
            withTableBorder
            styles={{
              th: { color: rallyColors.textDimmed, fontSize: 12 },
              td: { color: rallyColors.textPrimary },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>مدت</Table.Th>
                <Table.Th>کارمزد</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Object.entries(loan.feeByDuration!).map(([period, fee]) => (
                <Table.Tr key={period}>
                  <Table.Td>{period}</Table.Td>
                  <Table.Td>{fee}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}
    </>
  );
});
