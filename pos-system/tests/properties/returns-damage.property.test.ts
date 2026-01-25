import { describe, it } from 'vitest';
import fc from 'fast-check';
import { validateReturnQuantity, canReturn } from '../../src/lib/returns';
import { calculateDamageCost } from '../../src/lib/damaged';

describe('Property Tests - Returns and Damage', () => {
  // Feature: pos-system-testing, Property 17: Return Quantity Constraint
  it('return quantity cannot exceed original invoice quantity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 200 }),
        (originalQuantity, returnQuantity) => {
          const result = validateReturnQuantity(returnQuantity, originalQuantity);

          if (returnQuantity > originalQuantity) {
            return result.valid === false;
          } else if (returnQuantity >= 0 && returnQuantity <= originalQuantity) {
            return result.valid === true;
          } else {
            return result.valid === false; // Negative returns
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('return is possible only when quantity is valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (originalQuantity, previousReturns) => {
          // Ensure previousReturns doesn't exceed originalQuantity
          const validPreviousReturns = Math.min(previousReturns, originalQuantity);
          const canDoReturn = canReturn(originalQuantity, validPreviousReturns);
          const remainingQuantity = originalQuantity - validPreviousReturns;

          if (remainingQuantity > 0) {
            return canDoReturn === true;
          } else {
            return canDoReturn === false;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 24: Damage Cost Calculation
  it('damage cost = quantity * product_cost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 1000 }),
        (quantity, productCost) => {
          const totalCost = calculateDamageCost(quantity, productCost);
          const expected = Math.round(quantity * productCost * 100) / 100;

          return Math.abs(totalCost - expected) < 0.01;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('damage cost is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }),
        fc.nat({ max: 1000 }),
        (quantity, productCost) => {
          const totalCost = calculateDamageCost(quantity, productCost);
          return totalCost >= 0;
        }
      ),
      { numRuns: 20 }
    );
  });
});
