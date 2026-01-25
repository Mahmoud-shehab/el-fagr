/**
 * Inventory management functions for POS system
 * Handles stock operations, transfers, and inventory tracking
 */

export type OperationType = 
  | 'SALE' 
  | 'PURCHASE' 
  | 'TRANSFER_OUT' 
  | 'TRANSFER_IN' 
  | 'RETURN' 
  | 'DAMAGE';

export interface InventoryOperation {
  productId: string;
  branchId: string;
  quantity: number;
  operationType: OperationType;
}

export interface InventoryState {
  productId: string;
  branchId: string;
  quantity: number;
  minQuantity: number;
  reservedQuantity?: number;
}

export interface TransferOperation {
  productId: string;
  fromBranchId: string;
  toBranchId: string;
  quantity: number;
}

/**
 * Apply an inventory operation to update stock quantity
 * @param state - Current inventory state
 * @param operation - Operation to apply
 * @returns Updated inventory state
 */
export function applyInventoryOperation(
  state: InventoryState,
  operation: InventoryOperation
): InventoryState {
  if (operation.quantity < 0) {
    throw new Error('Operation quantity must be non-negative');
  }

  if (state.productId !== operation.productId || state.branchId !== operation.branchId) {
    throw new Error('Operation does not match inventory state');
  }

  let newQuantity = state.quantity;

  switch (operation.operationType) {
    case 'SALE':
    case 'TRANSFER_OUT':
    case 'DAMAGE':
      // Decrease inventory
      newQuantity = state.quantity - operation.quantity;
      if (newQuantity < 0) {
        throw new Error('Insufficient inventory for operation');
      }
      break;

    case 'PURCHASE':
    case 'TRANSFER_IN':
    case 'RETURN':
      // Increase inventory
      newQuantity = state.quantity + operation.quantity;
      break;

    default:
      throw new Error(`Unknown operation type: ${operation.operationType}`);
  }

  return {
    ...state,
    quantity: newQuantity,
  };
}

/**
 * Check if product is low stock
 * @param state - Inventory state
 * @returns True if quantity is below minimum
 */
export function isLowStock(state: InventoryState): boolean {
  return state.quantity < state.minQuantity;
}

/**
 * Check if transfer is possible (source has enough quantity)
 * @param sourceQuantity - Available quantity at source
 * @param transferQuantity - Quantity to transfer
 * @returns True if transfer is possible
 */
export function canTransfer(
  sourceQuantity: number,
  transferQuantity: number
): boolean {
  if (sourceQuantity < 0 || transferQuantity < 0) {
    throw new Error('Quantities must be non-negative');
  }
  
  return sourceQuantity >= transferQuantity;
}

/**
 * Apply a stock transfer between branches
 * @param sourceState - Source branch inventory
 * @param destinationState - Destination branch inventory
 * @param quantity - Quantity to transfer
 * @returns Updated states for both branches
 */
export function applyStockTransfer(
  sourceState: InventoryState,
  destinationState: InventoryState,
  quantity: number
): { source: InventoryState; destination: InventoryState } {
  if (quantity <= 0) {
    throw new Error('Transfer quantity must be positive');
  }

  if (sourceState.productId !== destinationState.productId) {
    throw new Error('Product mismatch in transfer');
  }

  if (!canTransfer(sourceState.quantity, quantity)) {
    throw new Error('Insufficient quantity at source branch');
  }

  const source = applyInventoryOperation(sourceState, {
    productId: sourceState.productId,
    branchId: sourceState.branchId,
    quantity,
    operationType: 'TRANSFER_OUT',
  });

  const destination = applyInventoryOperation(destinationState, {
    productId: destinationState.productId,
    branchId: destinationState.branchId,
    quantity,
    operationType: 'TRANSFER_IN',
  });

  return { source, destination };
}

/**
 * Get available quantity (total - reserved)
 * @param state - Inventory state
 * @returns Available quantity
 */
export function getAvailableQuantity(state: InventoryState): number {
  const reserved = state.reservedQuantity || 0;
  return Math.max(0, state.quantity - reserved);
}

/**
 * Check if product is in stock
 * @param state - Inventory state
 * @returns True if quantity > 0
 */
export function isInStock(state: InventoryState): boolean {
  return state.quantity > 0;
}

/**
 * Validate inventory operation before applying
 * @param state - Current inventory state
 * @param operation - Operation to validate
 * @returns Validation result with error message if invalid
 */
export function validateInventoryOperation(
  state: InventoryState,
  operation: InventoryOperation
): { valid: boolean; error?: string } {
  if (operation.quantity < 0) {
    return { valid: false, error: 'Operation quantity must be non-negative' };
  }

  if (state.productId !== operation.productId || state.branchId !== operation.branchId) {
    return { valid: false, error: 'Operation does not match inventory state' };
  }

  // Check for operations that decrease inventory
  if (['SALE', 'TRANSFER_OUT', 'DAMAGE'].includes(operation.operationType)) {
    if (state.quantity < operation.quantity) {
      return { 
        valid: false, 
        error: `Insufficient inventory. Available: ${state.quantity}, Required: ${operation.quantity}` 
      };
    }
  }

  return { valid: true };
}
