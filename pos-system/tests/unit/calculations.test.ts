import { describe, it, expect } from 'vitest';
import {
  calculateItemTotal,
  calculateSubtotal,
  calculateInvoiceTotal,
  calculateRemainingAmount,
  roundMoney,
  calculateInvoice,
  type CartItem,
} from '../../src/lib/calculations';

describe('Calculations - Item Total', () => {
  it('should calculate item total correctly', () => {
    const item: CartItem = {
      productId: '1',
      quantity: 5,
      unitPrice: 10.5,
    };
    
    expect(calculateItemTotal(item)).toBe(52.5);
  });

  it('should handle zero quantity', () => {
    const item: CartItem = {
      productId: '1',
      quantity: 0,
      unitPrice: 10,
    };
    
    expect(calculateItemTotal(item)).toBe(0);
  });

  it('should handle zero price', () => {
    const item: CartItem = {
      productId: '1',
      quantity: 5,
      unitPrice: 0,
    };
    
    expect(calculateItemTotal(item)).toBe(0);
  });

  it('should throw error for negative quantity', () => {
    const item: CartItem = {
      productId: '1',
      quantity: -5,
      unitPrice: 10,
    };
    
    expect(() => calculateItemTotal(item)).toThrow();
  });

  it('should throw error for negative price', () => {
    const item: CartItem = {
      productId: '1',
      quantity: 5,
      unitPrice: -10,
    };
    
    expect(() => calculateItemTotal(item)).toThrow();
  });
});

describe('Calculations - Subtotal', () => {
  it('should calculate subtotal for multiple items', () => {
    const items: CartItem[] = [
      { productId: '1', quantity: 2, unitPrice: 10 },
      { productId: '2', quantity: 3, unitPrice: 5 },
      { productId: '3', quantity: 1, unitPrice: 7.5 },
    ];
    
    expect(calculateSubtotal(items)).toBe(42.5);
  });

  it('should return 0 for empty cart', () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  it('should handle single item', () => {
    const items: CartItem[] = [
      { productId: '1', quantity: 5, unitPrice: 10 },
    ];
    
    expect(calculateSubtotal(items)).toBe(50);
  });
});

describe('Calculations - Invoice Total', () => {
  it('should calculate total with discount and tax', () => {
    const subtotal = 100;
    const discount = 10;
    const tax = 5;
    
    expect(calculateInvoiceTotal(subtotal, discount, tax)).toBe(95);
  });

  it('should handle zero discount', () => {
    expect(calculateInvoiceTotal(100, 0, 5)).toBe(105);
  });

  it('should handle zero tax', () => {
    expect(calculateInvoiceTotal(100, 10, 0)).toBe(90);
  });

  it('should handle zero discount and tax', () => {
    expect(calculateInvoiceTotal(100, 0, 0)).toBe(100);
  });

  it('should throw error if discount exceeds subtotal', () => {
    expect(() => calculateInvoiceTotal(100, 150, 5)).toThrow('Discount amount cannot exceed subtotal');
  });

  it('should throw error for negative values', () => {
    expect(() => calculateInvoiceTotal(-100, 10, 5)).toThrow();
    expect(() => calculateInvoiceTotal(100, -10, 5)).toThrow();
    expect(() => calculateInvoiceTotal(100, 10, -5)).toThrow();
  });
});

describe('Calculations - Remaining Amount', () => {
  it('should calculate remaining amount', () => {
    expect(calculateRemainingAmount(100, 30)).toBe(70);
  });

  it('should return 0 when fully paid', () => {
    expect(calculateRemainingAmount(100, 100)).toBe(0);
  });

  it('should handle overpayment', () => {
    expect(calculateRemainingAmount(100, 150)).toBe(-50);
  });

  it('should handle zero payment', () => {
    expect(calculateRemainingAmount(100, 0)).toBe(100);
  });

  it('should throw error for negative values', () => {
    expect(() => calculateRemainingAmount(-100, 50)).toThrow();
    expect(() => calculateRemainingAmount(100, -50)).toThrow();
  });
});

describe('Calculations - Round Money', () => {
  it('should round to 2 decimal places', () => {
    expect(roundMoney(10.123)).toBe(10.12);
    expect(roundMoney(10.126)).toBe(10.13);
    expect(roundMoney(10.125)).toBe(10.13);
  });

  it('should handle whole numbers', () => {
    expect(roundMoney(10)).toBe(10);
  });

  it('should handle numbers with 1 decimal', () => {
    expect(roundMoney(10.5)).toBe(10.5);
  });

  it('should handle very small numbers', () => {
    expect(roundMoney(0.001)).toBe(0);
    expect(roundMoney(0.005)).toBe(0.01);
  });
});

describe('Calculations - Complete Invoice', () => {
  it('should calculate complete invoice', () => {
    const items: CartItem[] = [
      { productId: '1', quantity: 2, unitPrice: 50 },
      { productId: '2', quantity: 1, unitPrice: 30 },
    ];
    
    const result = calculateInvoice(items, 10, 13, 50);
    
    expect(result.subtotal).toBe(130);
    expect(result.discountAmount).toBe(10);
    expect(result.taxAmount).toBe(13);
    expect(result.totalAmount).toBe(133);
    expect(result.paidAmount).toBe(50);
    expect(result.remainingAmount).toBe(83);
  });

  it('should handle invoice with no discount or tax', () => {
    const items: CartItem[] = [
      { productId: '1', quantity: 1, unitPrice: 100 },
    ];
    
    const result = calculateInvoice(items);
    
    expect(result.subtotal).toBe(100);
    expect(result.totalAmount).toBe(100);
    expect(result.remainingAmount).toBe(100);
  });
});
