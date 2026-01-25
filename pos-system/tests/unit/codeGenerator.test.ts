import { describe, it, expect } from 'vitest';
import {
  generateInvoiceNumber,
  generateCustomerCode,
  generateSupplierCode,
  generateProductCode,
  generateReturnNumber,
  generateTransferNumber,
  generateDamageNumber,
  areCodesUnique,
  extractSequence,
} from '../../src/lib/codeGenerator';

describe('Code Generator - Invoice Number', () => {
  it('should generate invoice number with correct format', () => {
    const date = new Date('2024-01-15');
    const code = generateInvoiceNumber(date, 1);
    expect(code).toBe('INV-20240115-0001');
  });

  it('should pad sequence with zeros', () => {
    const date = new Date('2024-01-15');
    expect(generateInvoiceNumber(date, 1)).toBe('INV-20240115-0001');
    expect(generateInvoiceNumber(date, 99)).toBe('INV-20240115-0099');
    expect(generateInvoiceNumber(date, 1234)).toBe('INV-20240115-1234');
  });

  it('should handle different dates', () => {
    expect(generateInvoiceNumber(new Date('2024-12-31'), 1)).toBe('INV-20241231-0001');
    expect(generateInvoiceNumber(new Date('2024-01-01'), 1)).toBe('INV-20240101-0001');
  });
});

describe('Code Generator - Customer Code', () => {
  it('should generate customer code with correct format', () => {
    expect(generateCustomerCode(1)).toBe('CUST-000001');
    expect(generateCustomerCode(123)).toBe('CUST-000123');
    expect(generateCustomerCode(999999)).toBe('CUST-999999');
  });

  it('should throw error for negative sequence', () => {
    expect(() => generateCustomerCode(-1)).toThrow();
  });
});

describe('Code Generator - Supplier Code', () => {
  it('should generate supplier code with correct format', () => {
    expect(generateSupplierCode(1)).toBe('SUPP-000001');
    expect(generateSupplierCode(456)).toBe('SUPP-000456');
    expect(generateSupplierCode(999999)).toBe('SUPP-999999');
  });

  it('should throw error for negative sequence', () => {
    expect(() => generateSupplierCode(-1)).toThrow();
  });
});

describe('Code Generator - Product Code', () => {
  it('should generate product code with correct format', () => {
    expect(generateProductCode(1)).toBe('PROD-000001');
    expect(generateProductCode(789)).toBe('PROD-000789');
  });

  it('should throw error for negative sequence', () => {
    expect(() => generateProductCode(-1)).toThrow();
  });
});

describe('Code Generator - Return Number', () => {
  it('should generate return number with correct format', () => {
    const date = new Date('2024-01-15');
    expect(generateReturnNumber(date, 1)).toBe('RET-20240115-0001');
  });
});

describe('Code Generator - Transfer Number', () => {
  it('should generate transfer number with correct format', () => {
    const date = new Date('2024-01-15');
    expect(generateTransferNumber(date, 1)).toBe('TRF-20240115-0001');
  });
});

describe('Code Generator - Damage Number', () => {
  it('should generate damage number with correct format', () => {
    const date = new Date('2024-01-15');
    expect(generateDamageNumber(date, 1)).toBe('DMG-20240115-0001');
  });
});

describe('Code Generator - Unique Codes', () => {
  it('should detect unique codes', () => {
    const codes = ['CUST-000001', 'CUST-000002', 'CUST-000003'];
    expect(areCodesUnique(codes)).toBe(true);
  });

  it('should detect duplicate codes', () => {
    const codes = ['CUST-000001', 'CUST-000002', 'CUST-000001'];
    expect(areCodesUnique(codes)).toBe(false);
  });

  it('should handle empty array', () => {
    expect(areCodesUnique([])).toBe(true);
  });

  it('should handle single code', () => {
    expect(areCodesUnique(['CUST-000001'])).toBe(true);
  });
});

describe('Code Generator - Extract Sequence', () => {
  it('should extract sequence from invoice number', () => {
    expect(extractSequence('INV-20240115-0001')).toBe(1);
    expect(extractSequence('INV-20240115-1234')).toBe(1234);
  });

  it('should extract sequence from customer code', () => {
    expect(extractSequence('CUST-000123')).toBe(123);
  });

  it('should return null for invalid format', () => {
    expect(extractSequence('INVALID')).toBe(null);
    expect(extractSequence('CUST')).toBe(null);
  });
});

describe('Code Generator - Uniqueness Property', () => {
  it('should generate unique invoice numbers for same date', () => {
    const date = new Date('2024-01-15');
    const codes = Array.from({ length: 100 }, (_, i) => 
      generateInvoiceNumber(date, i + 1)
    );
    expect(areCodesUnique(codes)).toBe(true);
  });

  it('should generate unique customer codes', () => {
    const codes = Array.from({ length: 100 }, (_, i) => 
      generateCustomerCode(i + 1)
    );
    expect(areCodesUnique(codes)).toBe(true);
  });

  it('should generate unique supplier codes', () => {
    const codes = Array.from({ length: 100 }, (_, i) => 
      generateSupplierCode(i + 1)
    );
    expect(areCodesUnique(codes)).toBe(true);
  });
});
