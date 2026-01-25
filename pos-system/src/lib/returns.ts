/**
 * Return validation functions for sales and purchase returns
 * Ensures return quantities don't exceed original invoice quantities
 */

export interface ReturnValidation {
  valid: boolean;
  error?: string;
  allowedQuantity?: number;
}

/**
 * Validate return quantity against original invoice quantity
 * @param returnQuantity - Quantity being returned
 * @param originalQuantity - Original invoice quantity
 * @param previousReturns - Total quantity already returned
 * @returns Validation result
 */
export function validateReturnQuantity(
  returnQuantity: number,
  originalQuantity: number,
  previousReturns: number = 0
): ReturnValidation {
  if (returnQuantity < 0) {
    return {
      valid: false,
      error: 'Return quantity must be non-negative',
    };
  }

  if (originalQuantity < 0) {
    return {
      valid: false,
      error: 'Original quantity must be non-negative',
    };
  }

  if (previousReturns < 0) {
    return {
      valid: false,
      error: 'Previous returns must be non-negative',
    };
  }

  const remainingQuantity = originalQuantity - previousReturns;

  if (returnQuantity > remainingQuantity) {
    return {
      valid: false,
      error: `Return quantity (${returnQuantity}) exceeds remaining quantity (${remainingQuantity})`,
      allowedQuantity: remainingQuantity,
    };
  }

  return { valid: true };
}

/**
 * Calculate maximum allowed return quantity
 * @param originalQuantity - Original invoice quantity
 * @param previousReturns - Total quantity already returned
 * @returns Maximum quantity that can be returned
 */
export function getMaxReturnQuantity(
  originalQuantity: number,
  previousReturns: number = 0
): number {
  if (originalQuantity < 0 || previousReturns < 0) {
    throw new Error('Quantities must be non-negative');
  }

  return Math.max(0, originalQuantity - previousReturns);
}

/**
 * Check if item can be returned
 * @param originalQuantity - Original invoice quantity
 * @param previousReturns - Total quantity already returned
 * @returns True if any quantity can still be returned
 */
export function canReturn(
  originalQuantity: number,
  previousReturns: number = 0
): boolean {
  return getMaxReturnQuantity(originalQuantity, previousReturns) > 0;
}
