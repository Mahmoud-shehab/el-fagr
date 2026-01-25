import { describe, it, expect } from 'vitest';
import {
  validateReturnQuantity,
  getMaxReturnQuantity,
  canReturn,
} from '../../src/lib/returns';

describe('Returns - Validate Return Quantity', () => {
  it('should allow valid return', () => {
    const result = validateReturnQuantity(5, 10, 0);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should allow return of full quantity', () => {
    const result = validateReturnQuantity(10, 10, 0);
    expect(result.valid).toBe(true);
  });

  it('should reject return exceeding original quantity', () => {
    const result = validateReturnQuantity(15, 10, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds remaining quantity');
    expect(result.allowedQuantity).toBe(10);
  });

  it('should account for previous returns', () => {
    const result = validateReturnQuantity(5, 10, 3);
    expect(result.valid).toBe(true);
  });

  it('should reject return exceeding remaining quantity', () => {
    const result = validateReturnQuantity(8, 10, 3);
    expect(result.valid).toBe(false);
    expect(result.allowedQuantity).toBe(7);
  });

  it('should reject negative return quantity', () => {
    const result = validateReturnQuantity(-5, 10, 0);
    expect(result.valid).toBe(false);
  });

  it('should reject negative original quantity', () => {
    const result = validateReturnQuantity(5, -10, 0);
    expect(result.valid).toBe(false);
  });

  it('should reject negative previous returns', () => {
    const result = validateReturnQuantity(5, 10, -3);
    expect(result.valid).toBe(false);
  });

  it('should allow zero return', () => {
    const result = validateReturnQuantity(0, 10, 0);
    expect(result.valid).toBe(true);
  });
});

describe('Returns - Max Return Quantity', () => {
  it('should calculate max return quantity', () => {
    expect(getMaxReturnQuantity(10, 0)).toBe(10);
    expect(getMaxReturnQuantity(10, 3)).toBe(7);
    expect(getMaxReturnQuantity(10, 10)).toBe(0);
  });

  it('should return 0 when fully returned', () => {
    expect(getMaxReturnQuantity(10, 10)).toBe(0);
  });

  it('should return 0 when previous returns exceed original', () => {
    expect(getMaxReturnQuantity(10, 15)).toBe(0);
  });

  it('should throw error for negative quantities', () => {
    expect(() => getMaxReturnQuantity(-10, 0)).toThrow();
    expect(() => getMaxReturnQuantity(10, -5)).toThrow();
  });
});

describe('Returns - Can Return', () => {
  it('should return true when returns possible', () => {
    expect(canReturn(10, 0)).toBe(true);
    expect(canReturn(10, 5)).toBe(true);
  });

  it('should return false when fully returned', () => {
    expect(canReturn(10, 10)).toBe(false);
  });

  it('should return false when previous returns exceed original', () => {
    expect(canReturn(10, 15)).toBe(false);
  });
});
