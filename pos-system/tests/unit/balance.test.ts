import { describe, it, expect } from 'vitest';
import {
  calculateCustomerBalance,
  calculateSupplierBalance,
  exceedsCreditLimit,
  getAvailableCredit,
  canMakePurchase,
  getAccountStatus,
  type BalanceTransaction,
} from '../../src/lib/balance';

describe('Balance - Customer Balance', () => {
  it('should calculate balance with credit sales', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'CREDIT_SALE', amount: 100 },
      { type: 'CREDIT_SALE', amount: 50 },
    ];
    
    expect(calculateCustomerBalance(transactions)).toBe(150);
  });

  it('should decrease balance with payments', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'CREDIT_SALE', amount: 100 },
      { type: 'PAYMENT', amount: 30 },
    ];
    
    expect(calculateCustomerBalance(transactions)).toBe(70);
  });

  it('should decrease balance with refunds', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'CREDIT_SALE', amount: 100 },
      { type: 'REFUND', amount: 20 },
    ];
    
    expect(calculateCustomerBalance(transactions)).toBe(80);
  });

  it('should handle opening balance', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'OPENING_BALANCE', amount: 500 },
      { type: 'CREDIT_SALE', amount: 100 },
      { type: 'PAYMENT', amount: 200 },
    ];
    
    expect(calculateCustomerBalance(transactions)).toBe(400);
  });

  it('should return 0 for empty transactions', () => {
    expect(calculateCustomerBalance([])).toBe(0);
  });

  it('should handle negative balance (overpayment)', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'CREDIT_SALE', amount: 100 },
      { type: 'PAYMENT', amount: 150 },
    ];
    
    expect(calculateCustomerBalance(transactions)).toBe(-50);
  });

  it('should throw error for negative amounts', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'CREDIT_SALE', amount: -100 },
    ];
    
    expect(() => calculateCustomerBalance(transactions)).toThrow();
  });
});

describe('Balance - Supplier Balance', () => {
  it('should calculate balance with credit purchases', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'CREDIT_PURCHASE', amount: 200 },
      { type: 'CREDIT_PURCHASE', amount: 150 },
    ];
    
    expect(calculateSupplierBalance(transactions)).toBe(350);
  });

  it('should decrease balance with payments', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'CREDIT_PURCHASE', amount: 200 },
      { type: 'PAYMENT', amount: 80 },
    ];
    
    expect(calculateSupplierBalance(transactions)).toBe(120);
  });

  it('should decrease balance with returns', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'CREDIT_PURCHASE', amount: 200 },
      { type: 'RETURN', amount: 50 },
    ];
    
    expect(calculateSupplierBalance(transactions)).toBe(150);
  });

  it('should handle opening balance', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'OPENING_BALANCE', amount: 1000 },
      { type: 'CREDIT_PURCHASE', amount: 300 },
      { type: 'PAYMENT', amount: 500 },
    ];
    
    expect(calculateSupplierBalance(transactions)).toBe(800);
  });

  it('should return 0 for empty transactions', () => {
    expect(calculateSupplierBalance([])).toBe(0);
  });

  it('should throw error for negative amounts', () => {
    const transactions: BalanceTransaction[] = [
      { type: 'CREDIT_PURCHASE', amount: -200 },
    ];
    
    expect(() => calculateSupplierBalance(transactions)).toThrow();
  });
});

describe('Balance - Credit Limit Check', () => {
  it('should detect when balance exceeds limit', () => {
    expect(exceedsCreditLimit(1500, 1000)).toBe(true);
  });

  it('should allow balance equal to limit', () => {
    expect(exceedsCreditLimit(1000, 1000)).toBe(false);
  });

  it('should allow balance below limit', () => {
    expect(exceedsCreditLimit(500, 1000)).toBe(false);
  });

  it('should handle zero balance', () => {
    expect(exceedsCreditLimit(0, 1000)).toBe(false);
  });

  it('should throw error for negative credit limit', () => {
    expect(() => exceedsCreditLimit(500, -1000)).toThrow();
  });
});

describe('Balance - Available Credit', () => {
  it('should calculate available credit', () => {
    expect(getAvailableCredit(300, 1000)).toBe(700);
  });

  it('should return 0 when at limit', () => {
    expect(getAvailableCredit(1000, 1000)).toBe(0);
  });

  it('should return 0 when over limit', () => {
    expect(getAvailableCredit(1200, 1000)).toBe(0);
  });

  it('should return full limit when balance is 0', () => {
    expect(getAvailableCredit(0, 1000)).toBe(1000);
  });

  it('should throw error for negative credit limit', () => {
    expect(() => getAvailableCredit(500, -1000)).toThrow();
  });
});

describe('Balance - Can Make Purchase', () => {
  it('should allow purchase within limit', () => {
    expect(canMakePurchase(500, 300, 1000)).toBe(true);
  });

  it('should allow purchase up to limit', () => {
    expect(canMakePurchase(700, 300, 1000)).toBe(true);
  });

  it('should reject purchase exceeding limit', () => {
    expect(canMakePurchase(800, 300, 1000)).toBe(false);
  });

  it('should allow purchase when balance is 0', () => {
    expect(canMakePurchase(0, 500, 1000)).toBe(true);
  });

  it('should throw error for negative purchase amount', () => {
    expect(() => canMakePurchase(500, -100, 1000)).toThrow();
  });
});

describe('Balance - Account Status', () => {
  it('should return CLEAR for zero balance', () => {
    expect(getAccountStatus(0, 1000)).toBe('CLEAR');
  });

  it('should return CLEAR for negative balance', () => {
    expect(getAccountStatus(-50, 1000)).toBe('CLEAR');
  });

  it('should return ACTIVE for balance within limit', () => {
    expect(getAccountStatus(500, 1000)).toBe('ACTIVE');
  });

  it('should return ACTIVE for balance at limit', () => {
    expect(getAccountStatus(1000, 1000)).toBe('ACTIVE');
  });

  it('should return OVER_LIMIT for balance exceeding limit', () => {
    expect(getAccountStatus(1200, 1000)).toBe('OVER_LIMIT');
  });
});
