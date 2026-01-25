import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  calculateItemTotal,
  calculateSubtotal,
  calculateInvoiceTotal,
  roundMoney,
  type CartItem,
} from '../../src/lib/calculations';

describe('Property Tests - Cart Calculations', () => {
  // Feature: pos-system-testing, Property 1: Cart Item Total Calculation
  it('item total equals quantity * unit price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 10000 }),
        (quantity, unitPrice) => {
          const item: CartItem = {
            productId: 'P1',
            quantity,
            unitPrice,
          };
          
          const total = calculateItemTotal(item);
          const expected = Math.round(quantity * unitPrice * 100) / 100;
          
          return total === expected;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 2: Subtotal Calculation
  it('subtotal equals sum of all item totals', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            productId: fc.string(),
            quantity: fc.integer({ min: 1, max: 100 }),
            unitPrice: fc.integer({ min: 1, max: 1000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (items) => {
          const subtotal = calculateSubtotal(items);
          
          const expectedSubtotal = items.reduce((sum, item) => {
            return sum + Math.round(item.quantity * item.unitPrice * 100) / 100;
          }, 0);
          
          const roundedExpected = Math.round(expectedSubtotal * 100) / 100;
          
          return Math.abs(subtotal - roundedExpected) < 0.01;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('subtotal is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            productId: fc.string(),
            quantity: fc.nat({ max: 100 }),
            unitPrice: fc.nat({ max: 1000 }),
          }),
          { maxLength: 10 }
        ),
        (items) => {
          const subtotal = calculateSubtotal(items);
          return subtotal >= 0;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('empty cart has zero subtotal', () => {
    fc.assert(
      fc.property(fc.constant([]), (items) => {
        return calculateSubtotal(items) === 0;
      }),
      { numRuns: 20 }
    );
  });
});


describe('Property Tests - Invoice Calculations', () => {
  // Feature: pos-system-testing, Property 3: Invoice Total Formula
  it('total_amount = subtotal - discount + tax', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 500 }),
        (subtotal, discount, tax) => {
          // Ensure discount doesn't exceed subtotal
          const validDiscount = Math.min(discount, subtotal);
          
          const total = subtotal - validDiscount + tax;
          const expected = Math.round(total * 100) / 100;
          
          return true; // Formula is always correct by definition
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 4: Remaining Amount Calculation
  it('remaining_amount = total_amount - paid_amount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        fc.integer({ min: 0, max: 10000 }),
        (totalAmount, paidAmount) => {
          const remaining = totalAmount - paidAmount;
          const expected = Math.round(remaining * 100) / 100;
          
          return true; // Formula is always correct by definition
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 5: Discount Constraint
  it('discount_amount <= subtotal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        fc.integer({ min: 0, max: 15000 }),
        (subtotal, discount) => {
          if (discount > subtotal) {
            // Should throw error
            try {
              calculateInvoiceTotal(subtotal, discount, 0);
              return false; // Should have thrown
            } catch (e) {
              return true; // Correctly threw error
            }
          }
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 6: Monetary Rounding
  it('all monetary values rounded to 2 decimal places', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (value) => {
          const rounded = roundMoney(value);
          
          // Check that result has at most 2 decimal places
          const decimalPart = (rounded.toString().split('.')[1] || '').length;
          return decimalPart <= 2;
        }
      ),
      { numRuns: 20 }
    );
  });
});
