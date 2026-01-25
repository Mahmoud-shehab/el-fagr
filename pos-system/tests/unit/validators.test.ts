import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidNumber,
  validateRequiredFields,
  isValidDateRange,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidLength,
} from '../../src/lib/validators';

describe('Validators - Email', () => {
  it('should validate correct email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('should reject empty or null email', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null as any)).toBe(false);
    expect(isValidEmail(undefined as any)).toBe(false);
  });

  it('should trim whitespace', () => {
    expect(isValidEmail('  test@example.com  ')).toBe(true);
  });
});

describe('Validators - Phone', () => {
  it('should validate Egyptian mobile numbers', () => {
    expect(isValidPhone('01012345678')).toBe(true);
    expect(isValidPhone('01112345678')).toBe(true);
    expect(isValidPhone('01212345678')).toBe(true);
    expect(isValidPhone('01512345678')).toBe(true);
  });

  it('should validate mobile with country code', () => {
    expect(isValidPhone('+20101234567')).toBe(false);
  });

  it('should validate Egyptian landline', () => {
    expect(isValidPhone('0224156242')).toBe(true);
    expect(isValidPhone('0224142417')).toBe(true);
  });

  it('should handle phone with formatting', () => {
    expect(isValidPhone('010-1234-5678')).toBe(true);
    expect(isValidPhone('010 1234 5678')).toBe(true);
    expect(isValidPhone('(010) 1234-5678')).toBe(true);
  });

  it('should reject invalid phone', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('00012345678')).toBe(false);
    expect(isValidPhone('invalid')).toBe(false);
  });

  it('should reject empty or null phone', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone(null as any)).toBe(false);
    expect(isValidPhone(undefined as any)).toBe(false);
  });
});


describe('Validators - Number', () => {
  it('should validate valid numbers', () => {
    expect(isValidNumber(123)).toBe(true);
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(-45)).toBe(true);
    expect(isValidNumber(3.14)).toBe(true);
    expect(isValidNumber('123')).toBe(true);
    expect(isValidNumber('3.14')).toBe(true);
  });

  it('should reject invalid numbers', () => {
    expect(isValidNumber('abc')).toBe(false);
    expect(isValidNumber('12abc')).toBe(false);
    expect(isValidNumber(NaN)).toBe(false);
    expect(isValidNumber(Infinity)).toBe(false);
    expect(isValidNumber(-Infinity)).toBe(false);
  });

  it('should reject empty, null, or undefined', () => {
    expect(isValidNumber('')).toBe(false);
    expect(isValidNumber(null)).toBe(false);
    expect(isValidNumber(undefined)).toBe(false);
  });
});

describe('Validators - Required Fields', () => {
  it('should validate all required fields present', () => {
    const data = {
      name: 'John',
      email: 'john@example.com',
      phone: '01012345678',
    };

    const result = validateRequiredFields(data, ['name', 'email', 'phone']);
    expect(result.valid).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  it('should detect missing fields', () => {
    const data = {
      name: 'John',
      email: '',
      phone: null,
    };

    const result = validateRequiredFields(data, ['name', 'email', 'phone']);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('email');
    expect(result.missingFields).toContain('phone');
  });

  it('should handle undefined fields', () => {
    const data = {
      name: 'John',
    };

    const result = validateRequiredFields(data, ['name', 'email' as any]);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('email');
  });

  it('should return valid for empty required fields array', () => {
    const data = { name: 'John' };
    const result = validateRequiredFields(data, []);
    expect(result.valid).toBe(true);
  });
});

describe('Validators - Date Range', () => {
  it('should validate valid date range', () => {
    expect(isValidDateRange('2024-01-01', '2024-12-31')).toBe(true);
    expect(isValidDateRange('2024-01-01', '2024-01-01')).toBe(true);
  });

  it('should reject invalid date range', () => {
    expect(isValidDateRange('2024-12-31', '2024-01-01')).toBe(false);
  });

  it('should reject invalid date formats', () => {
    expect(isValidDateRange('invalid', '2024-01-01')).toBe(false);
    expect(isValidDateRange('2024-01-01', 'invalid')).toBe(false);
  });

  it('should reject empty dates', () => {
    expect(isValidDateRange('', '2024-01-01')).toBe(false);
    expect(isValidDateRange('2024-01-01', '')).toBe(false);
  });
});

describe('Validators - Positive Number', () => {
  it('should validate positive numbers', () => {
    expect(isPositiveNumber(1)).toBe(true);
    expect(isPositiveNumber(100)).toBe(true);
    expect(isPositiveNumber(0.1)).toBe(true);
    expect(isPositiveNumber('5')).toBe(true);
  });

  it('should reject zero and negative numbers', () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(-0.5)).toBe(false);
  });

  it('should reject invalid values', () => {
    expect(isPositiveNumber('abc')).toBe(false);
    expect(isPositiveNumber(null)).toBe(false);
  });
});

describe('Validators - Non-Negative Number', () => {
  it('should validate non-negative numbers', () => {
    expect(isNonNegativeNumber(0)).toBe(true);
    expect(isNonNegativeNumber(1)).toBe(true);
    expect(isNonNegativeNumber(100)).toBe(true);
    expect(isNonNegativeNumber('5')).toBe(true);
  });

  it('should reject negative numbers', () => {
    expect(isNonNegativeNumber(-1)).toBe(false);
    expect(isNonNegativeNumber(-0.5)).toBe(false);
  });

  it('should reject invalid values', () => {
    expect(isNonNegativeNumber('abc')).toBe(false);
    expect(isNonNegativeNumber(null)).toBe(false);
  });
});

describe('Validators - String Length', () => {
  it('should validate string within length range', () => {
    expect(isValidLength('hello', 1, 10)).toBe(true);
    expect(isValidLength('test', 4, 4)).toBe(true);
  });

  it('should reject string outside length range', () => {
    expect(isValidLength('hi', 3, 10)).toBe(false);
    expect(isValidLength('very long string', 1, 5)).toBe(false);
  });

  it('should handle default min/max', () => {
    expect(isValidLength('test')).toBe(true);
    expect(isValidLength('')).toBe(true);
  });

  it('should trim whitespace before checking', () => {
    expect(isValidLength('  test  ', 4, 4)).toBe(true);
  });

  it('should reject non-string values', () => {
    expect(isValidLength(123 as any, 1, 10)).toBe(false);
    expect(isValidLength(null as any, 1, 10)).toBe(false);
  });
});
