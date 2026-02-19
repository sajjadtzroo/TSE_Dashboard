/**
 * Persian Number Formatting and Parsing Utilities
 */

/**
 * Parse Persian amount strings to numbers
 * Handles formats like: "۵۰ میلیون", "1.5 میلیارد", "100,000,000"
 */
export function parsePersianAmount(amount: string | undefined | null): number {
  if (!amount) return 0;

  // Remove Persian/Arabic digits and convert to English
  const englishAmount = amount
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));

  // Extract number
  const numberMatch = englishAmount.match(/[\d.,]+/);
  if (!numberMatch) return 0;

  const numValue = parseFloat(numberMatch[0].replace(/,/g, ''));

  // Handle millions and billions
  if (englishAmount.includes('میلیارد') || englishAmount.toLowerCase().includes('billion')) {
    return numValue * 1_000_000_000;
  }
  if (englishAmount.includes('میلیون') || englishAmount.toLowerCase().includes('million')) {
    return numValue * 1_000_000;
  }
  if (englishAmount.includes('هزار') || englishAmount.toLowerCase().includes('thousand')) {
    return numValue * 1_000;
  }

  return numValue;
}

/**
 * Format number to Persian with thousands separator
 */
export function formatPersianNumber(num: number | string): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '۰';

  // Format with thousands separator
  const formatted = numValue.toLocaleString('en-US');

  // Convert to Persian digits
  return formatted.replace(/\d/g, (d) => String.fromCharCode(d.charCodeAt(0) + 1728));
}

/**
 * Format amount in Persian with unit (million/billion)
 */
export function formatPersianAmount(amount: number | string | undefined | null): string {
  if (!amount && amount !== 0) return '-';

  const numValue = typeof amount === 'string' ? parsePersianAmount(amount) : amount;

  if (numValue >= 1_000_000_000) {
    const billions = numValue / 1_000_000_000;
    return `${formatPersianNumber(billions)} میلیارد`;
  }
  if (numValue >= 1_000_000) {
    const millions = numValue / 1_000_000;
    return `${formatPersianNumber(millions)} میلیون`;
  }
  if (numValue >= 1_000) {
    const thousands = numValue / 1_000;
    return `${formatPersianNumber(thousands)} هزار`;
  }

  return formatPersianNumber(numValue);
}

/**
 * Parse interest rate to number
 */
export function parseInterestRate(rate: string | undefined | null): number {
  if (!rate) return 0;

  // Extract number from string like "18%" or "۱۸ درصد"
  const match = rate.match(/[\d.۰-۹]+/);
  if (!match) return 0;

  // Convert Persian digits to English
  const englishNumber = match[0].replace(/[۰-۹]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 1728)
  );

  return parseFloat(englishNumber);
}

/**
 * Format interest rate
 */
export function formatInterestRate(rate: number): string {
  return `${formatPersianNumber(rate)}٪`;
}

/**
 * Convert Persian digits to English
 */
export function toEnglishDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));
}
