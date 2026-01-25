/**
 * Calculation functions for POS system
 * Handles cart items, invoice totals, and monetary calculations
 */

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface InvoiceCalculation {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

/**
 * Calculate the total price for a single cart item
 * @param item - Cart item with quantity and unit price
 * @returns Total price (quantity × unitPrice)
 */
export function calculateItemTotal(item: CartItem): number {
  if (item.quantity < 0 || item.unitPrice < 0) {
    throw new Error('Quantity and unit price must be non-negative');
  }
  
  const total = item.quantity * item.unitPrice;
  return roundMoney(total);
}

/**
 * Calculate subtotal from array of cart items
 * @param items - Array of cart items
 * @returns Sum of all item totals
 */
export function calculateSubtotal(items: CartItem[]): number {
  if (!items || items.length === 0) {
    return 0;
  }
  
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateItemTotal(item);
  }, 0);
  
  return roundMoney(subtotal);
}

/**
 * Calculate invoice total amount
 * Formula: subtotal - discountAmount + taxAmount
 * @param subtotal - Invoice subtotal
 * @param discountAmount - Discount to apply
 * @param taxAmount - Tax to add
 * @returns Total amount
 */
export function calculateInvoiceTotal(
  subtotal: number,
  discountAmount: number,
  taxAmount: number
): number {
  if (subtotal < 0 || discountAmount < 0 || taxAmount < 0) {
    throw new Error('All amounts must be non-negative');
  }
  
  if (discountAmount > subtotal) {
    throw new Error('Discount amount cannot exceed subtotal');
  }
  
  const total = subtotal - discountAmount + taxAmount;
  return roundMoney(total);
}

/**
 * Calculate remaining amount to be paid
 * Formula: totalAmount - paidAmount
 * @param totalAmount - Total invoice amount
 * @param paidAmount - Amount already paid
 * @returns Remaining amount
 */
export function calculateRemainingAmount(
  totalAmount: number,
  paidAmount: number
): number {
  if (totalAmount < 0 || paidAmount < 0) {
    throw new Error('Amounts must be non-negative');
  }
  
  const remaining = totalAmount - paidAmount;
  return roundMoney(remaining);
}

/**
 * Round monetary value to 2 decimal places
 * @param value - Value to round
 * @returns Rounded value
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate complete invoice with all amounts
 * @param items - Cart items
 * @param discountAmount - Discount to apply
 * @param taxAmount - Tax to add
 * @param paidAmount - Amount paid
 * @returns Complete invoice calculation
 */
export function calculateInvoice(
  items: CartItem[],
  discountAmount: number = 0,
  taxAmount: number = 0,
  paidAmount: number = 0
): InvoiceCalculation {
  const subtotal = calculateSubtotal(items);
  const totalAmount = calculateInvoiceTotal(subtotal, discountAmount, taxAmount);
  const remainingAmount = calculateRemainingAmount(totalAmount, paidAmount);
  
  return {
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    paidAmount,
    remainingAmount,
  };
}
