import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  calculateCustomerBalance,
  calculateSupplierBalance,
  exceedsCreditLimit,
  type BalanceTransaction,
} from '../../src/lib/balance';

describe('Property Tests - Balance Calculations', () => {
  // Feature: pos-system-testing, Property 14: Customer Balance Formula
  it('customer balance = sum(credit_sales) - sum(payments) - sum(refunds)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('CREDIT_SALE', 'PAYMENT', 'REFUND'),
            amount: fc.integer({ min: 1, max: 1000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (transactions: BalanceTransaction[]) => {
          const balance = calculateCustomerBalance(transactions);

          const creditSales = transactions
            .filter((t) => t.type === 'CREDIT_SALE')
            .reduce((sum, t) => sum + t.amount, 0);

          const payments = transactions
            .filter((t) => t.type === 'PAYMENT')
            .reduce((sum, t) => sum + t.amount, 0);

          const refunds = transactions
            .filter((t) => t.type === 'REFUND')
            .reduce((sum, t) => sum + t.amount, 0);

          const expected = creditSales - payments - refunds;
          const roundedExpected = Math.round(expected * 100) / 100;

          return Math.abs(balance - roundedExpected) < 0.01;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 15: Supplier Balance Formula
  it('supplier balance = sum(credit_purchases) - sum(payments) - sum(returns)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('CREDIT_PURCHASE', 'PAYMENT', 'RETURN'),
            amount: fc.integer({ min: 1, max: 1000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (transactions: BalanceTransaction[]) => {
          const balance = calculateSupplierBalance(transactions);

          const creditPurchases = transactions
            .filter((t) => t.type === 'CREDIT_PURCHASE')
            .reduce((sum, t) => sum + t.amount, 0);

          const payments = transactions
            .filter((t) => t.type === 'PAYMENT')
            .reduce((sum, t) => sum + t.amount, 0);

          const returns = transactions
            .filter((t) => t.type === 'RETURN')
            .reduce((sum, t) => sum + t.amount, 0);

          const expected = creditPurchases - payments - returns;
          const roundedExpected = Math.round(expected * 100) / 100;

          return Math.abs(balance - roundedExpected) < 0.01;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 16: Credit Limit Check
  it('account flagged when balance exceeds credit limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 10000 }),
        (balance, creditLimit) => {
          const exceeds = exceedsCreditLimit(balance, creditLimit);

          if (balance > creditLimit) {
            return exceeds === true;
          } else {
            return exceeds === false;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
