/**
 * Tests for Persian Number Formatting and Parsing Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parsePersianAmount,
  formatPersianNumber,
  formatPersianAmount,
  parseInterestRate,
  formatInterestRate,
  toPersianDigits,
  toEnglishDigits,
} from '../persianNumber';

describe('parsePersianAmount', () => {
  it('should return 0 for null/undefined/empty', () => {
    expect(parsePersianAmount(null)).toBe(0);
    expect(parsePersianAmount(undefined)).toBe(0);
    expect(parsePersianAmount('')).toBe(0);
  });

  it('should parse Persian digits', () => {
    expect(parsePersianAmount('۵۰')).toBe(50);
    expect(parsePersianAmount('۱۲۳۴۵')).toBe(12345);
  });

  it('should parse Arabic-Indic digits', () => {
    expect(parsePersianAmount('٥٠')).toBe(50);
    expect(parsePersianAmount('١٢٣٤٥')).toBe(12345);
  });

  it('should parse amounts with میلیون (million)', () => {
    expect(parsePersianAmount('۵۰ میلیون')).toBe(50_000_000);
    expect(parsePersianAmount('1.5 میلیون')).toBe(1_500_000);
    expect(parsePersianAmount('100 میلیون')).toBe(100_000_000);
  });

  it('should parse amounts with میلیارد (billion)', () => {
    expect(parsePersianAmount('۱ میلیارد')).toBe(1_000_000_000);
    expect(parsePersianAmount('2.5 میلیارد')).toBe(2_500_000_000);
  });

  it('should parse amounts with هزار (thousand)', () => {
    expect(parsePersianAmount('۵۰ هزار')).toBe(50_000);
    expect(parsePersianAmount('100 هزار')).toBe(100_000);
  });

  it('should parse amounts with English units', () => {
    expect(parsePersianAmount('50 million')).toBe(50_000_000);
    expect(parsePersianAmount('1.5 billion')).toBe(1_500_000_000);
    expect(parsePersianAmount('100 thousand')).toBe(100_000);
  });

  it('should handle comma-separated numbers', () => {
    expect(parsePersianAmount('100,000,000')).toBe(100_000_000);
    expect(parsePersianAmount('1,500,000')).toBe(1_500_000);
  });

  it('should handle decimal numbers', () => {
    expect(parsePersianAmount('۱.۵')).toBe(1.5);
    expect(parsePersianAmount('2.75')).toBe(2.75);
  });

  it('should parse plain numeric strings', () => {
    expect(parsePersianAmount('12345')).toBe(12345);
    expect(parsePersianAmount('۱۲۳۴۵')).toBe(12345);
  });
});

describe('formatPersianNumber', () => {
  it('should format numbers with Persian digits', () => {
    expect(formatPersianNumber(123)).toBe('۱۲۳');
    expect(formatPersianNumber(12345)).toBe('۱۲,۳۴۵');
  });

  it('should add thousands separator', () => {
    expect(formatPersianNumber(1000)).toBe('۱,۰۰۰');
    expect(formatPersianNumber(1000000)).toBe('۱,۰۰۰,۰۰۰');
    expect(formatPersianNumber(1234567890)).toBe('۱,۲۳۴,۵۶۷,۸۹۰');
  });

  it('should handle decimal numbers', () => {
    expect(formatPersianNumber(1234.56)).toBe('۱,۲۳۴.۵۶');
    expect(formatPersianNumber(1.5)).toBe('۱.۵');
  });

  it('should handle string input', () => {
    expect(formatPersianNumber('1000')).toBe('۱,۰۰۰');
    expect(formatPersianNumber('12345')).toBe('۱۲,۳۴۵');
  });

  it('should return ۰ for invalid input', () => {
    expect(formatPersianNumber('invalid')).toBe('۰');
    expect(formatPersianNumber(NaN)).toBe('۰');
  });

  it('should handle zero', () => {
    expect(formatPersianNumber(0)).toBe('۰');
  });

  it('should handle negative numbers', () => {
    expect(formatPersianNumber(-1234)).toBe('-۱,۲۳۴');
  });
});

describe('formatPersianAmount', () => {
  it('should return - for null/undefined', () => {
    expect(formatPersianAmount(null)).toBe('-');
    expect(formatPersianAmount(undefined)).toBe('-');
  });

  it('should format zero', () => {
    expect(formatPersianAmount(0)).toBe('۰');
  });

  it('should format billions with میلیارد', () => {
    expect(formatPersianAmount(1_000_000_000)).toBe('۱ میلیارد');
    expect(formatPersianAmount(2_500_000_000)).toBe('۲.۵ میلیارد');
    expect(formatPersianAmount(15_000_000_000)).toBe('۱۵ میلیارد');
  });

  it('should format millions with میلیون', () => {
    expect(formatPersianAmount(1_000_000)).toBe('۱ میلیون');
    expect(formatPersianAmount(50_000_000)).toBe('۵۰ میلیون');
    expect(formatPersianAmount(1_500_000)).toBe('۱.۵ میلیون');
  });

  it('should format thousands with هزار', () => {
    expect(formatPersianAmount(1_000)).toBe('۱ هزار');
    expect(formatPersianAmount(50_000)).toBe('۵۰ هزار');
    expect(formatPersianAmount(1_500)).toBe('۱.۵ هزار');
  });

  it('should format numbers below 1000 without unit', () => {
    expect(formatPersianAmount(999)).toBe('۹۹۹');
    expect(formatPersianAmount(500)).toBe('۵۰۰');
    expect(formatPersianAmount(1)).toBe('۱');
  });

  it('should handle string input', () => {
    expect(formatPersianAmount('1000000')).toBe('۱ میلیون');
    expect(formatPersianAmount('50 میلیون')).toBe('۵۰ میلیون');
  });

  it('should prioritize larger units', () => {
    // 1.5 billion, not 1500 million
    expect(formatPersianAmount(1_500_000_000)).toBe('۱.۵ میلیارد');
    // 1.5 million, not 1500 thousand
    expect(formatPersianAmount(1_500_000)).toBe('۱.۵ میلیون');
  });
});

describe('parseInterestRate', () => {
  it('should return 0 for null/undefined/empty', () => {
    expect(parseInterestRate(null)).toBe(0);
    expect(parseInterestRate(undefined)).toBe(0);
    expect(parseInterestRate('')).toBe(0);
  });

  it('should parse Persian digits', () => {
    expect(parseInterestRate('۱۸')).toBe(18);
    expect(parseInterestRate('۱۸٪')).toBe(18);
    expect(parseInterestRate('۱۸ درصد')).toBe(18);
  });

  it('should parse English digits', () => {
    expect(parseInterestRate('18')).toBe(18);
    expect(parseInterestRate('18%')).toBe(18);
    expect(parseInterestRate('18 percent')).toBe(18);
  });

  it('should parse decimal rates', () => {
    expect(parseInterestRate('۱۸.۵')).toBe(18.5);
    expect(parseInterestRate('18.5%')).toBe(18.5);
  });

  it('should handle rates without symbols', () => {
    expect(parseInterestRate('18')).toBe(18);
    expect(parseInterestRate('۱۸')).toBe(18);
  });

  it('should return 0 for non-numeric strings', () => {
    expect(parseInterestRate('no numbers')).toBe(0);
    expect(parseInterestRate('N/A')).toBe(0);
  });
});

describe('formatInterestRate', () => {
  it('should format rate with Persian percent symbol', () => {
    expect(formatInterestRate(18)).toBe('۱۸٪');
    expect(formatInterestRate(0)).toBe('۰٪');
  });

  it('should handle decimal rates', () => {
    expect(formatInterestRate(18.5)).toBe('۱۸.۵٪');
    expect(formatInterestRate(12.75)).toBe('۱۲.۷۵٪');
  });

  it('should format with thousands separator for large rates', () => {
    expect(formatInterestRate(1000)).toBe('۱,۰۰۰٪');
  });

  it('should handle negative rates', () => {
    expect(formatInterestRate(-5)).toBe('-۵٪');
  });
});

describe('toPersianDigits', () => {
  it('should convert English digits to Persian', () => {
    expect(toPersianDigits('123')).toBe('۱۲۳');
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
  });

  it('should handle number input', () => {
    expect(toPersianDigits(123)).toBe('۱۲۳');
    expect(toPersianDigits(0)).toBe('۰');
  });

  it('should preserve non-digit characters', () => {
    expect(toPersianDigits('ABC123')).toBe('ABC۱۲۳');
    expect(toPersianDigits('100,000')).toBe('۱۰۰,۰۰۰');
    expect(toPersianDigits('18%')).toBe('۱۸%');
  });

  it('should handle empty string', () => {
    expect(toPersianDigits('')).toBe('');
  });

  it('should handle strings with mixed content', () => {
    expect(toPersianDigits('قیمت: 1000 تومان')).toBe('قیمت: ۱۰۰۰ تومان');
  });
});

describe('toEnglishDigits', () => {
  it('should convert Persian digits to English', () => {
    expect(toEnglishDigits('۱۲۳')).toBe('123');
    expect(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('should convert Arabic-Indic digits to English', () => {
    expect(toEnglishDigits('١٢٣')).toBe('123');
    expect(toEnglishDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('should handle mixed Persian and Arabic-Indic digits', () => {
    expect(toEnglishDigits('۱٢۳')).toBe('123');
  });

  it('should preserve non-digit characters', () => {
    expect(toEnglishDigits('ABC۱۲۳')).toBe('ABC123');
    expect(toEnglishDigits('۱۰۰,۰۰۰')).toBe('100,000');
    expect(toEnglishDigits('۱۸٪')).toBe('18٪');
  });

  it('should handle empty string', () => {
    expect(toEnglishDigits('')).toBe('');
  });

  it('should handle strings with mixed content', () => {
    expect(toEnglishDigits('قیمت: ۱۰۰۰ تومان')).toBe('قیمت: 1000 تومان');
  });

  it('should handle already English digits', () => {
    expect(toEnglishDigits('123')).toBe('123');
  });
});

describe('Integration tests', () => {
  it('should round-trip Persian amount formatting and parsing', () => {
    const original = 50_000_000;
    const formatted = formatPersianAmount(original);
    const parsed = parsePersianAmount(formatted);
    expect(parsed).toBe(original);
  });

  it('should round-trip digit conversion', () => {
    const original = '0123456789';
    const persian = toPersianDigits(original);
    const english = toEnglishDigits(persian);
    expect(english).toBe(original);
  });

  it('should handle complex amount scenarios', () => {
    // Format a large amount
    const formatted = formatPersianAmount(123_456_789);
    expect(formatted).toMatch(/میلیون/);

    // Parse it back
    const parsed = parsePersianAmount(formatted);
    expect(parsed).toBeCloseTo(123_456_789, -4); // Allow small rounding difference
  });

  it('should handle interest rate round-trip', () => {
    const original = 18.5;
    const formatted = formatInterestRate(original);
    const parsed = parseInterestRate(formatted);
    expect(parsed).toBe(original);
  });
});
