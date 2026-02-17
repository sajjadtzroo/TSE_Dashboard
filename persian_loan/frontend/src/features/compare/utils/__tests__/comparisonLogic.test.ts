/**
 * Tests for Comparison Logic Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getCategories,
  getFieldsByCategory,
  compareValues,
  hasFieldDifference,
  getFieldsWithDifferences,
  COMPARISON_FIELDS,
  type ComparisonField,
} from '../comparisonLogic';
import { mockLoan, mockLoanWithGuarantor, mockLoanWithCoefficients, createMockLoan } from '@/test/mocks';

describe('comparisonLogic', () => {
  describe('getCategories', () => {
    it('should return all unique categories', () => {
      const categories = getCategories();

      expect(categories).toBeInstanceOf(Array);
      expect(categories.length).toBeGreaterThan(0);
      expect(new Set(categories).size).toBe(categories.length); // All unique
    });

    it('should include expected categories', () => {
      const categories = getCategories();

      expect(categories).toContain('اطلاعات پایه');
      expect(categories).toContain('نرخ‌های سود');
      expect(categories).toContain('مبالغ');
      expect(categories).toContain('مدت‌زمان');
      expect(categories).toContain('الزامات');
      expect(categories).toContain('هزینه‌ها');
    });
  });

  describe('getFieldsByCategory', () => {
    it('should return fields for اطلاعات پایه category', () => {
      const fields = getFieldsByCategory('اطلاعات پایه');

      expect(fields).toBeInstanceOf(Array);
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.every((f) => f.category === 'اطلاعات پایه')).toBe(true);
    });

    it('should return fields for نرخ‌های سود category', () => {
      const fields = getFieldsByCategory('نرخ‌های سود');

      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some((f) => f.key === 'interestRate')).toBe(true);
      expect(fields.some((f) => f.key === 'depositRate')).toBe(true);
      expect(fields.some((f) => f.key === 'latePaymentRate')).toBe(true);
    });

    it('should return fields for مبالغ category', () => {
      const fields = getFieldsByCategory('مبالغ');

      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some((f) => f.key === 'minAmount')).toBe(true);
      expect(fields.some((f) => f.key === 'maxAmount')).toBe(true);
      expect(fields.some((f) => f.key === 'monthlyPayment')).toBe(true);
    });

    it('should return fields for الزامات category', () => {
      const fields = getFieldsByCategory('الزامات');

      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some((f) => f.key === 'guarantor')).toBe(true);
      expect(fields.some((f) => f.key === 'collateral')).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const fields = getFieldsByCategory('غیرموجود');

      expect(fields).toEqual([]);
    });

    it('should return all fields with correct structure', () => {
      const fields = getFieldsByCategory('نرخ‌های سود');

      fields.forEach((field) => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('category');
        expect(field).toHaveProperty('getValue');
        expect(field).toHaveProperty('compareType');
        expect(typeof field.getValue).toBe('function');
      });
    });
  });

  describe('compareValues', () => {
    describe('lower-better comparison', () => {
      it('should identify best (lowest) interest rate', () => {
        const loans = [
          createMockLoan({ id: 'loan-1', interestRate: '۱۸٪' }),
          createMockLoan({ id: 'loan-2', interestRate: '۱۵٪' }),
          createMockLoan({ id: 'loan-3', interestRate: '۲۰٪' }),
        ];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'interestRate')!;
        const results = compareValues(loans, field);

        expect(results.get('loan-1')).toBe('neutral');
        expect(results.get('loan-2')).toBe('best'); // Lowest (15%)
        expect(results.get('loan-3')).toBe('worst'); // Highest (20%)
      });

      it('should identify best (lowest) monthly payment', () => {
        const loans = [
          createMockLoan({ id: 'loan-1', monthlyPayment: '۵ میلیون' }),
          createMockLoan({ id: 'loan-2', monthlyPayment: '۳ میلیون' }),
          createMockLoan({ id: 'loan-3', monthlyPayment: '۷ میلیون' }),
        ];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'monthlyPayment')!;
        const results = compareValues(loans, field);

        expect(results.get('loan-2')).toBe('best'); // Lowest (3 million)
        expect(results.get('loan-3')).toBe('worst'); // Highest (7 million)
      });
    });

    describe('higher-better comparison', () => {
      it('should identify best (highest) max amount', () => {
        const loans = [
          createMockLoan({ id: 'loan-1', maxAmount: '۱۰۰ میلیون' }),
          createMockLoan({ id: 'loan-2', maxAmount: '۵۰۰ میلیون' }),
          createMockLoan({ id: 'loan-3', maxAmount: '۲۰۰ میلیون' }),
        ];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'maxAmount')!;
        const results = compareValues(loans, field);

        expect(results.get('loan-1')).toBe('worst'); // Lowest (100 million)
        expect(results.get('loan-2')).toBe('best'); // Highest (500 million)
        expect(results.get('loan-3')).toBe('neutral');
      });

      it('should identify best (highest) max term', () => {
        const loans = [
          createMockLoan({ id: 'loan-1', maxTerm: '۶۰ ماه' }),
          createMockLoan({ id: 'loan-2', maxTerm: '۱۲۰ ماه' }),
          createMockLoan({ id: 'loan-3', maxTerm: '۹۰ ماه' }),
        ];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'maxTerm')!;
        const results = compareValues(loans, field);

        expect(results.get('loan-1')).toBe('worst'); // Shortest (60 months)
        expect(results.get('loan-2')).toBe('best'); // Longest (120 months)
        expect(results.get('loan-3')).toBe('neutral');
      });
    });

    describe('text comparison', () => {
      it('should mark all text fields as neutral', () => {
        const loans = [mockLoan, mockLoanWithGuarantor];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'nameFA')!;
        const results = compareValues(loans, field);

        expect(results.get(mockLoan.id)).toBe('neutral');
        expect(results.get(mockLoanWithGuarantor.id)).toBe('neutral');
      });
    });

    describe('boolean comparison', () => {
      it('should mark all boolean fields as neutral', () => {
        const loans = [mockLoan, mockLoanWithGuarantor];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'guarantor')!;
        const results = compareValues(loans, field);

        expect(results.get(mockLoan.id)).toBe('neutral');
        expect(results.get(mockLoanWithGuarantor.id)).toBe('neutral');
      });
    });

    describe('null/undefined handling', () => {
      it('should mark loans with null values as neutral', () => {
        const loans = [
          createMockLoan({ id: 'loan-1', interestRate: '۱۸٪' }),
          createMockLoan({ id: 'loan-2', interestRate: undefined }),
          createMockLoan({ id: 'loan-3', interestRate: '۲۰٪' }),
        ];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'interestRate')!;
        const results = compareValues(loans, field);

        expect(results.get('loan-2')).toBe('neutral'); // Null value
      });

      it('should handle all null values', () => {
        const loans = [
          createMockLoan({ id: 'loan-1', depositRate: undefined }),
          createMockLoan({ id: 'loan-2', depositRate: undefined }),
        ];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'depositRate')!;
        const results = compareValues(loans, field);

        expect(results.get('loan-1')).toBe('neutral');
        expect(results.get('loan-2')).toBe('neutral');
      });
    });

    describe('equal values', () => {
      it('should mark all as neutral when values are equal', () => {
        const loans = [
          createMockLoan({ id: 'loan-1', interestRate: '۱۸٪' }),
          createMockLoan({ id: 'loan-2', interestRate: '۱۸٪' }),
          createMockLoan({ id: 'loan-3', interestRate: '۱۸٪' }),
        ];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'interestRate')!;
        const results = compareValues(loans, field);

        expect(results.get('loan-1')).toBe('neutral');
        expect(results.get('loan-2')).toBe('neutral');
        expect(results.get('loan-3')).toBe('neutral');
      });
    });

    describe('numeric parsing', () => {
      it('should parse Persian numbers correctly', () => {
        const loans = [
          createMockLoan({ id: 'loan-1', minAmount: '۱۰ میلیون' }),
          createMockLoan({ id: 'loan-2', minAmount: '۵ میلیون' }),
        ];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'minAmount')!;
        const results = compareValues(loans, field);

        expect(results.get('loan-2')).toBe('best'); // Lower is better for minAmount
        expect(results.get('loan-1')).toBe('worst');
      });

      it('should parse English numbers correctly', () => {
        const loans = [
          createMockLoan({ id: 'loan-1', minAmount: '10 million' }),
          createMockLoan({ id: 'loan-2', minAmount: '5 million' }),
        ];

        const field = COMPARISON_FIELDS.find((f) => f.key === 'minAmount')!;
        const results = compareValues(loans, field);

        expect(results.get('loan-2')).toBe('best');
        expect(results.get('loan-1')).toBe('worst');
      });
    });
  });

  describe('hasFieldDifference', () => {
    it('should return true when loans have different interest rates', () => {
      const loans = [
        createMockLoan({ interestRate: '۱۸٪' }),
        createMockLoan({ interestRate: '۲۰٪' }),
      ];

      const field = COMPARISON_FIELDS.find((f) => f.key === 'interestRate')!;
      const result = hasFieldDifference(loans, field);

      expect(result).toBe(true);
    });

    it('should return false when loans have same interest rate', () => {
      const loans = [
        createMockLoan({ interestRate: '۱۸٪' }),
        createMockLoan({ interestRate: '۱۸٪' }),
      ];

      const field = COMPARISON_FIELDS.find((f) => f.key === 'interestRate')!;
      const result = hasFieldDifference(loans, field);

      expect(result).toBe(false);
    });

    it('should return true when loans have different guarantor requirements', () => {
      const loans = [mockLoan, mockLoanWithGuarantor];

      const field = COMPARISON_FIELDS.find((f) => f.key === 'guarantor')!;
      const result = hasFieldDifference(loans, field);

      expect(result).toBe(true);
    });

    it('should return false when all loans have same guarantor requirement', () => {
      const loans = [mockLoan, createMockLoan({ guarantor: false })];

      const field = COMPARISON_FIELDS.find((f) => f.key === 'guarantor')!;
      const result = hasFieldDifference(loans, field);

      expect(result).toBe(false);
    });

    it('should handle null/undefined values', () => {
      const loans = [
        createMockLoan({ depositRate: '۱۰٪' }),
        createMockLoan({ depositRate: undefined }),
      ];

      const field = COMPARISON_FIELDS.find((f) => f.key === 'depositRate')!;
      const result = hasFieldDifference(loans, field);

      expect(result).toBe(true);
    });
  });

  describe('getFieldsWithDifferences', () => {
    it('should return only fields that differ between loans', () => {
      const loans = [
        createMockLoan({
          id: 'loan-1',
          interestRate: '۱۸٪',
          guarantor: false,
          description: 'interest-free',
        }),
        createMockLoan({
          id: 'loan-2',
          interestRate: '۲۰٪', // Different
          guarantor: false, // Same
          description: 'declining-balance', // Different
        }),
      ];

      const fields = getFieldsWithDifferences(loans);

      const hasInterestRate = fields.some((f) => f.key === 'interestRate');
      const hasGuarantor = fields.some((f) => f.key === 'guarantor');

      expect(hasInterestRate).toBe(true); // Different values
      expect(hasGuarantor).toBe(false); // Same values
    });

    it('should return empty array when loans are identical', () => {
      const loans = [mockLoan, mockLoan];

      const fields = getFieldsWithDifferences(loans);

      expect(fields.length).toBe(0);
    });

    it('should handle multiple loans with various differences', () => {
      const loans = [
        mockLoan,
        mockLoanWithGuarantor,
        mockLoanWithCoefficients,
      ];

      const fields = getFieldsWithDifferences(loans);

      expect(fields.length).toBeGreaterThan(0);
      expect(fields.every((f) => hasFieldDifference(loans, f))).toBe(true);
    });

    it('should include fields with partial null values', () => {
      const loans = [
        createMockLoan({ depositRate: '۱۰٪' }),
        createMockLoan({ depositRate: undefined }),
        createMockLoan({ depositRate: '۱۲٪' }),
      ];

      const fields = getFieldsWithDifferences(loans);

      expect(fields.some((f) => f.key === 'depositRate')).toBe(true);
    });
  });

  describe('COMPARISON_FIELDS structure', () => {
    it('should have valid structure for all fields', () => {
      COMPARISON_FIELDS.forEach((field) => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('category');
        expect(field).toHaveProperty('getValue');
        expect(field).toHaveProperty('compareType');

        expect(typeof field.key).toBe('string');
        expect(typeof field.label).toBe('string');
        expect(typeof field.category).toBe('string');
        expect(typeof field.getValue).toBe('function');
        expect(['higher-better', 'lower-better', 'boolean', 'text']).toContain(field.compareType);
      });
    });

    it('should have unique keys', () => {
      const keys = COMPARISON_FIELDS.map((f) => f.key);
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should have getValue functions that work', () => {
      COMPARISON_FIELDS.forEach((field) => {
        // Should not throw an error
        expect(() => field.getValue(mockLoan)).not.toThrow();
      });
    });

    it('should have format functions where defined', () => {
      const fieldsWithFormat = COMPARISON_FIELDS.filter((f) => f.format);

      fieldsWithFormat.forEach((field) => {
        const value = field.getValue(mockLoan);
        const formatted = field.format!(value);
        expect(typeof formatted).toBe('string');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete comparison workflow', () => {
      const loans = [mockLoan, mockLoanWithGuarantor, mockLoanWithCoefficients];

      // Get all categories
      const categories = getCategories();
      expect(categories.length).toBeGreaterThan(0);

      // Get fields that differ
      const differentFields = getFieldsWithDifferences(loans);
      expect(differentFields.length).toBeGreaterThan(0);

      // Compare values for each differing field
      differentFields.forEach((field) => {
        const results = compareValues(loans, field);
        expect(results.size).toBe(loans.length);
      });
    });

    it('should handle comparison of two identical loans', () => {
      const loans = [mockLoan, mockLoan];

      const differentFields = getFieldsWithDifferences(loans);
      expect(differentFields.length).toBe(0);
    });

    it('should handle comparison with missing data', () => {
      const loans = [
        createMockLoan({
          id: 'loan-1',
          interestRate: '۱۸٪',
          depositRate: undefined,
        }),
        createMockLoan({
          id: 'loan-2',
          interestRate: undefined,
          depositRate: '۱۰٪',
        }),
      ];

      const differentFields = getFieldsWithDifferences(loans);
      expect(differentFields.length).toBeGreaterThan(0);

      differentFields.forEach((field) => {
        const results = compareValues(loans, field);
        // Should handle null values gracefully - creates result for each loan
        expect(results.size).toBeGreaterThanOrEqual(1);
        expect(results.size).toBeLessThanOrEqual(2);
      });
    });
  });
});
