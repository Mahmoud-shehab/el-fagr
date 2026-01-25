import { describe, it, expect } from 'vitest';
import {
  applyInventoryOperation,
  isLowStock,
  canTransfer,
  applyStockTransfer,
  getAvailableQuantity,
  isInStock,
  validateInventoryOperation,
  type InventoryState,
  type InventoryOperation,
} from '../../src/lib/inventory';

describe('Inventory - Apply Operation', () => {
  const baseState: InventoryState = {
    productId: 'P1',
    branchId: 'B1',
    quantity: 100,
    minQuantity: 10,
  };

  it('should decrease quantity for SALE', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 20,
      operationType: 'SALE',
    };
    
    const result = applyInventoryOperation(baseState, operation);
    expect(result.quantity).toBe(80);
  });

  it('should increase quantity for PURCHASE', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 50,
      operationType: 'PURCHASE',
    };
    
    const result = applyInventoryOperation(baseState, operation);
    expect(result.quantity).toBe(150);
  });

  it('should decrease quantity for TRANSFER_OUT', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 30,
      operationType: 'TRANSFER_OUT',
    };
    
    const result = applyInventoryOperation(baseState, operation);
    expect(result.quantity).toBe(70);
  });

  it('should increase quantity for TRANSFER_IN', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 25,
      operationType: 'TRANSFER_IN',
    };
    
    const result = applyInventoryOperation(baseState, operation);
    expect(result.quantity).toBe(125);
  });

  it('should increase quantity for RETURN', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 15,
      operationType: 'RETURN',
    };
    
    const result = applyInventoryOperation(baseState, operation);
    expect(result.quantity).toBe(115);
  });

  it('should decrease quantity for DAMAGE', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 5,
      operationType: 'DAMAGE',
    };
    
    const result = applyInventoryOperation(baseState, operation);
    expect(result.quantity).toBe(95);
  });

  it('should throw error for insufficient inventory', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 150,
      operationType: 'SALE',
    };
    
    expect(() => applyInventoryOperation(baseState, operation)).toThrow('Insufficient inventory');
  });

  it('should throw error for negative quantity', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: -10,
      operationType: 'SALE',
    };
    
    expect(() => applyInventoryOperation(baseState, operation)).toThrow();
  });

  it('should throw error for mismatched product', () => {
    const operation: InventoryOperation = {
      productId: 'P2',
      branchId: 'B1',
      quantity: 10,
      operationType: 'SALE',
    };
    
    expect(() => applyInventoryOperation(baseState, operation)).toThrow();
  });
});

describe('Inventory - Low Stock Detection', () => {
  it('should detect low stock', () => {
    const state: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 5,
      minQuantity: 10,
    };
    
    expect(isLowStock(state)).toBe(true);
  });

  it('should not flag as low stock when above minimum', () => {
    const state: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 15,
      minQuantity: 10,
    };
    
    expect(isLowStock(state)).toBe(false);
  });

  it('should not flag as low stock when equal to minimum', () => {
    const state: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 10,
      minQuantity: 10,
    };
    
    expect(isLowStock(state)).toBe(false);
  });
});

describe('Inventory - Can Transfer', () => {
  it('should allow transfer when sufficient quantity', () => {
    expect(canTransfer(100, 50)).toBe(true);
  });

  it('should allow transfer of exact quantity', () => {
    expect(canTransfer(50, 50)).toBe(true);
  });

  it('should not allow transfer when insufficient quantity', () => {
    expect(canTransfer(30, 50)).toBe(false);
  });

  it('should allow zero transfer', () => {
    expect(canTransfer(100, 0)).toBe(true);
  });

  it('should throw error for negative quantities', () => {
    expect(() => canTransfer(-10, 5)).toThrow();
    expect(() => canTransfer(10, -5)).toThrow();
  });
});


describe('Inventory - Stock Transfer', () => {
  it('should transfer stock between branches', () => {
    const sourceState: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 100,
      minQuantity: 10,
    };

    const destState: InventoryState = {
      productId: 'P1',
      branchId: 'B2',
      quantity: 50,
      minQuantity: 10,
    };

    const result = applyStockTransfer(sourceState, destState, 30);
    
    expect(result.source.quantity).toBe(70);
    expect(result.destination.quantity).toBe(80);
  });

  it('should throw error for insufficient source quantity', () => {
    const sourceState: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 20,
      minQuantity: 10,
    };

    const destState: InventoryState = {
      productId: 'P1',
      branchId: 'B2',
      quantity: 50,
      minQuantity: 10,
    };

    expect(() => applyStockTransfer(sourceState, destState, 30)).toThrow();
  });

  it('should throw error for product mismatch', () => {
    const sourceState: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 100,
      minQuantity: 10,
    };

    const destState: InventoryState = {
      productId: 'P2',
      branchId: 'B2',
      quantity: 50,
      minQuantity: 10,
    };

    expect(() => applyStockTransfer(sourceState, destState, 30)).toThrow('Product mismatch');
  });

  it('should throw error for zero or negative quantity', () => {
    const sourceState: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 100,
      minQuantity: 10,
    };

    const destState: InventoryState = {
      productId: 'P1',
      branchId: 'B2',
      quantity: 50,
      minQuantity: 10,
    };

    expect(() => applyStockTransfer(sourceState, destState, 0)).toThrow();
    expect(() => applyStockTransfer(sourceState, destState, -10)).toThrow();
  });
});

describe('Inventory - Available Quantity', () => {
  it('should calculate available quantity', () => {
    const state: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 100,
      minQuantity: 10,
      reservedQuantity: 20,
    };
    
    expect(getAvailableQuantity(state)).toBe(80);
  });

  it('should return full quantity when no reservations', () => {
    const state: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 100,
      minQuantity: 10,
    };
    
    expect(getAvailableQuantity(state)).toBe(100);
  });

  it('should return 0 when reserved exceeds quantity', () => {
    const state: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 50,
      minQuantity: 10,
      reservedQuantity: 60,
    };
    
    expect(getAvailableQuantity(state)).toBe(0);
  });
});

describe('Inventory - In Stock Check', () => {
  it('should return true when quantity > 0', () => {
    const state: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 10,
      minQuantity: 5,
    };
    
    expect(isInStock(state)).toBe(true);
  });

  it('should return false when quantity is 0', () => {
    const state: InventoryState = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 0,
      minQuantity: 5,
    };
    
    expect(isInStock(state)).toBe(false);
  });
});

describe('Inventory - Validate Operation', () => {
  const state: InventoryState = {
    productId: 'P1',
    branchId: 'B1',
    quantity: 50,
    minQuantity: 10,
  };

  it('should validate valid operation', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 20,
      operationType: 'SALE',
    };
    
    const result = validateInventoryOperation(state, operation);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject operation with insufficient inventory', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: 100,
      operationType: 'SALE',
    };
    
    const result = validateInventoryOperation(state, operation);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Insufficient inventory');
  });

  it('should reject operation with negative quantity', () => {
    const operation: InventoryOperation = {
      productId: 'P1',
      branchId: 'B1',
      quantity: -10,
      operationType: 'SALE',
    };
    
    const result = validateInventoryOperation(state, operation);
    expect(result.valid).toBe(false);
  });

  it('should reject operation with mismatched product', () => {
    const operation: InventoryOperation = {
      productId: 'P2',
      branchId: 'B1',
      quantity: 10,
      operationType: 'SALE',
    };
    
    const result = validateInventoryOperation(state, operation);
    expect(result.valid).toBe(false);
  });
});
