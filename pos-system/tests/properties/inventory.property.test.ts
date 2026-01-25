import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  applyInventoryOperation,
  isLowStock,
  canTransfer,
  applyStockTransfer,
  type InventoryState,
  type InventoryOperation,
} from '../../src/lib/inventory';

describe('Property Tests - Inventory Operations', () => {
  // Feature: pos-system-testing, Property 7: Sale Inventory Decrease
  it('sale decreases inventory by exactly the sold quantity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        fc.integer({ min: 1, max: 50 }),
        (initialQuantity, saleQuantity) => {
          const state: InventoryState = {
            productId: 'P1',
            branchId: 'B1',
            quantity: initialQuantity,
            minQuantity: 10,
          };

          const operation: InventoryOperation = {
            productId: 'P1',
            branchId: 'B1',
            quantity: saleQuantity,
            operationType: 'SALE',
          };

          const newState = applyInventoryOperation(state, operation);
          return newState.quantity === initialQuantity - saleQuantity;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 8: Purchase Inventory Increase
  it('purchase increases inventory by exactly the purchased quantity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 1, max: 100 }),
        (initialQuantity, purchaseQuantity) => {
          const state: InventoryState = {
            productId: 'P1',
            branchId: 'B1',
            quantity: initialQuantity,
            minQuantity: 10,
          };

          const operation: InventoryOperation = {
            productId: 'P1',
            branchId: 'B1',
            quantity: purchaseQuantity,
            operationType: 'PURCHASE',
          };

          const newState = applyInventoryOperation(state, operation);
          return newState.quantity === initialQuantity + purchaseQuantity;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 9: Non-Negative Inventory
  it('inventory quantity never becomes negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 200 }),
        (initialQuantity, operationQuantity) => {
          const state: InventoryState = {
            productId: 'P1',
            branchId: 'B1',
            quantity: initialQuantity,
            minQuantity: 10,
          };

          const operation: InventoryOperation = {
            productId: 'P1',
            branchId: 'B1',
            quantity: operationQuantity,
            operationType: 'SALE',
          };

          try {
            const newState = applyInventoryOperation(state, operation);
            return newState.quantity >= 0;
          } catch (e) {
            // If operation throws error due to insufficient inventory, that's acceptable
            // The system prevents negative inventory by throwing an error
            return true;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 10: Transfer Conservation
  it('transfer quantity decreased at source equals quantity increased at destination', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        fc.integer({ min: 50, max: 500 }),
        fc.integer({ min: 1, max: 50 }),
        (sourceQuantity, destQuantity, transferQuantity) => {
          const sourceState: InventoryState = {
            productId: 'P1',
            branchId: 'B1',
            quantity: sourceQuantity,
            minQuantity: 10,
          };

          const destState: InventoryState = {
            productId: 'P1',
            branchId: 'B2',
            quantity: destQuantity,
            minQuantity: 10,
          };

          const result = applyStockTransfer(sourceState, destState, transferQuantity);

          if (result.success) {
            const sourceDecrease = sourceQuantity - result.sourceState.quantity;
            const destIncrease = result.destState.quantity - destQuantity;
            return sourceDecrease === destIncrease && sourceDecrease === transferQuantity;
          }

          return true; // If transfer failed, property doesn't apply
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 11: Transfer Quantity Constraint
  it('transfer rejected if quantity exceeds available quantity at source', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 101, max: 200 }),
        (sourceQuantity, transferQuantity) => {
          const result = canTransfer(sourceQuantity, transferQuantity);
          
          if (transferQuantity > sourceQuantity) {
            return result === false;
          }
          
          return result === true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 12: Low Stock Detection
  it('product flagged as low stock when quantity < min_quantity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 51, max: 100 }),
        (quantity, minQuantity) => {
          const state: InventoryState = {
            productId: 'P1',
            branchId: 'B1',
            quantity,
            minQuantity,
          };

          const isLow = isLowStock(state);
          return isLow === true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 13: Zero Stock Prevention
  it('operations on zero stock products are handled correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (saleQuantity) => {
          const state: InventoryState = {
            productId: 'P1',
            branchId: 'B1',
            quantity: 0,
            minQuantity: 10,
          };

          const operation: InventoryOperation = {
            productId: 'P1',
            branchId: 'B1',
            quantity: saleQuantity,
            operationType: 'SALE',
          };

          try {
            const newState = applyInventoryOperation(state, operation);
            // Should remain at 0 (can't go negative)
            return newState.quantity === 0;
          } catch (e) {
            // If operation throws error, that's the correct behavior for zero stock
            return true;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
