/**
 * Islamic banking and calculation method labels
 * Maps backend LoanCalculationMethod enum to Persian/Islamic terminology
 */

export const CALCULATION_METHOD_LABELS: Record<string, string> = {
  zero_interest: 'قرض‌الحسنه',
  average_based: 'مرابحه (میانگین‌محور)',
  gold_backed: 'اجاره به شرط تملیک (طلا‌پشتوانه)',
  credit_card: 'مضاربه (کارت اعتباری)',
  pos_based: 'جعاله (دستگاه فروش)',
  installment: 'فروش اقساطی',
  other: 'سایر',
};

export const CALCULATION_METHOD_DESCRIPTIONS: Record<string, string> = {
  zero_interest: 'وام بدون سود بر اساس شریعت اسلامی',
  average_based: 'تسهیلات بر مبنای میانگین موجودی حساب',
  gold_backed: 'تسهیلات با پشتوانه طلا و سکه',
  credit_card: 'اعتبار بر مبنای کارت بانکی',
  pos_based: 'تسهیلات بر مبنای گردش دستگاه POS',
  installment: 'خرید کالا به صورت اقساطی',
  other: 'سایر روش‌های محاسبه',
};

/** Eligibility badge types */
export const ELIGIBILITY_BADGES = {
  noGuarantor: { label: 'بدون ضامن', color: 'green' },
  depositBased: { label: 'امتیاز سپرده', color: 'blue' },
  creditCard: { label: 'کارت اعتباری', color: 'violet' },
  goldBacked: { label: 'طلا‌پشتوانه', color: 'yellow' },
  zeroInterest: { label: 'قرض‌الحسنه', color: 'teal' },
} as const;

export function getMethodLabel(method?: string | null): string {
  if (!method) return 'نامشخص';
  return CALCULATION_METHOD_LABELS[method] || method;
}

export function getEligibilityBadges(loan: {
  guarantor?: boolean | string;
  calculationMethod?: string;
  category?: string;
  depositToFacilityRatio?: string;
}): Array<{ label: string; color: string }> {
  const badges: Array<{ label: string; color: string }> = [];

  if (loan.guarantor === false || loan.guarantor === 'false' || loan.guarantor === 'no') {
    badges.push(ELIGIBILITY_BADGES.noGuarantor);
  }

  if (loan.calculationMethod === 'zero_interest') {
    badges.push(ELIGIBILITY_BADGES.zeroInterest);
  }

  if (loan.calculationMethod === 'credit_card') {
    badges.push(ELIGIBILITY_BADGES.creditCard);
  }

  if (loan.calculationMethod === 'gold_backed') {
    badges.push(ELIGIBILITY_BADGES.goldBacked);
  }

  if (loan.depositToFacilityRatio || loan.calculationMethod === 'average_based') {
    badges.push(ELIGIBILITY_BADGES.depositBased);
  }

  return badges;
}
