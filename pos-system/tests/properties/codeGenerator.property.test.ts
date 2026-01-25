import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  generateInvoiceNumber,
  generateCustomerCode,
  generateSupplierCode,
  generateProductCode,
  generateReturnNumber,
  generateTransferNumber,
  generateDamageNumber,
  areCodesUnique,
} from '../../src/lib/codeGenerator';

describe('Property Tests - Code Generation', () => {
  // Feature: pos-system-testing, Property 18: Unique Code Generation
  it('all generated invoice numbers are unique', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 10, maxLength: 50 }),
        (date, sequences) => {
          // Remove duplicates from input to ensure uniqueness
          const uniqueSeqs = Array.from(new Set(sequences));
          const codes = uniqueSeqs.map((seq) => generateInvoiceNumber(date, seq));
          return areCodesUnique(codes);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('all generated customer codes are unique', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 10, maxLength: 50 }),
        (sequences) => {
          // Remove duplicates from input to ensure uniqueness
          const uniqueSeqs = Array.from(new Set(sequences));
          const codes = uniqueSeqs.map((seq) => generateCustomerCode(seq));
          return areCodesUnique(codes);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('all generated supplier codes are unique', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 10, maxLength: 50 }),
        (sequences) => {
          // Remove duplicates from input to ensure uniqueness
          const uniqueSeqs = Array.from(new Set(sequences));
          const codes = uniqueSeqs.map((seq) => generateSupplierCode(seq));
          return areCodesUnique(codes);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('all generated product codes are unique', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10000 }), { minLength: 10, maxLength: 50 }),
        (sequences) => {
          // Remove duplicates from input to ensure uniqueness
          const uniqueSeqs = Array.from(new Set(sequences));
          const codes = uniqueSeqs.map((seq) => generateProductCode(seq));
          return areCodesUnique(codes);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('all generated return numbers are unique', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 10, maxLength: 50 }),
        (date, sequences) => {
          // Remove duplicates from input to ensure uniqueness
          const uniqueSeqs = Array.from(new Set(sequences));
          const codes = uniqueSeqs.map((seq) => generateReturnNumber(date, seq));
          return areCodesUnique(codes);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('all generated transfer numbers are unique', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 10, maxLength: 50 }),
        (date, sequences) => {
          // Remove duplicates from input to ensure uniqueness
          const uniqueSeqs = Array.from(new Set(sequences));
          const codes = uniqueSeqs.map((seq) => generateTransferNumber(date, seq));
          return areCodesUnique(codes);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('all generated damage numbers are unique', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 10, maxLength: 50 }),
        (date, sequences) => {
          // Remove duplicates from input to ensure uniqueness
          const uniqueSeqs = Array.from(new Set(sequences));
          const codes = uniqueSeqs.map((seq) => generateDamageNumber(date, seq));
          return areCodesUnique(codes);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('codes with different prefixes can have same sequence', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.integer({ min: 1, max: 10000 }),
        (date, sequence) => {
          const invoice = generateInvoiceNumber(date, sequence);
          const customer = generateCustomerCode(sequence);
          const supplier = generateSupplierCode(sequence);
          const product = generateProductCode(sequence);

          // All should be different despite same sequence
          const allCodes = [invoice, customer, supplier, product];
          return areCodesUnique(allCodes);
        }
      ),
      { numRuns: 20 }
    );
  });
});
