/**
 * Shared parsers for loan data — Persian digit normalization, amount/rate extraction.
 */

/** Normalize Persian/Arabic digits to English and extract a numeric amount. */
export function extractAmount(amountStr?: string): number {
  if (!amountStr) return 0;

  const normalized = amountStr
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  const match = normalized.match(/(\d+(?:,\d+)*)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }

  if (normalized.includes('میلیون') || normalized.toLowerCase().includes('million')) {
    const numMatch = normalized.match(/(\d+)/);
    if (numMatch) {
      return parseFloat(numMatch[1]) * 1000000;
    }
  }

  return 0;
}

/** Extract a numeric interest rate from a string or direct numeric value. */
export function extractRate(rateStr?: string, rateNum?: number): number {
  if (rateNum) return rateNum;
  if (!rateStr) return 0;

  const match = rateStr.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
}
