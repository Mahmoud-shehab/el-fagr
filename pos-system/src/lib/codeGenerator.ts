/**
 * Code generation functions for invoices, customers, suppliers, etc.
 * Ensures unique code generation with proper formatting
 */

/**
 * Generate unique invoice number
 * Format: INV-YYYYMMDD-NNNN
 * @param date - Invoice date
 * @param sequence - Sequence number for the day
 * @returns Formatted invoice number
 */
export function generateInvoiceNumber(date: Date, sequence: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  return `INV-${year}${month}${day}-${seq}`;
}

/**
 * Generate unique customer code
 * Format: CUST-NNNNNN
 * @param sequence - Customer sequence number
 * @returns Formatted customer code
 */
export function generateCustomerCode(sequence: number): string {
  if (sequence < 0) {
    throw new Error('Sequence must be non-negative');
  }

  const seq = String(sequence).padStart(6, '0');
  return `CUST-${seq}`;
}

/**
 * Generate unique supplier code
 * Format: SUPP-NNNNNN
 * @param sequence - Supplier sequence number
 * @returns Formatted supplier code
 */
export function generateSupplierCode(sequence: number): string {
  if (sequence < 0) {
    throw new Error('Sequence must be non-negative');
  }

  const seq = String(sequence).padStart(6, '0');
  return `SUPP-${seq}`;
}

/**
 * Generate unique product code
 * Format: PROD-NNNNNN
 * @param sequence - Product sequence number
 * @returns Formatted product code
 */
export function generateProductCode(sequence: number): string {
  if (sequence < 0) {
    throw new Error('Sequence must be non-negative');
  }

  const seq = String(sequence).padStart(6, '0');
  return `PROD-${seq}`;
}

/**
 * Generate unique return number
 * Format: RET-YYYYMMDD-NNNN
 * @param date - Return date
 * @param sequence - Sequence number for the day
 * @returns Formatted return number
 */
export function generateReturnNumber(date: Date, sequence: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  return `RET-${year}${month}${day}-${seq}`;
}

/**
 * Generate unique transfer number
 * Format: TRF-YYYYMMDD-NNNN
 * @param date - Transfer date
 * @param sequence - Sequence number for the day
 * @returns Formatted transfer number
 */
export function generateTransferNumber(date: Date, sequence: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  return `TRF-${year}${month}${day}-${seq}`;
}

/**
 * Generate unique damage number
 * Format: DMG-YYYYMMDD-NNNN
 * @param date - Damage date
 * @param sequence - Sequence number for the day
 * @returns Formatted damage number
 */
export function generateDamageNumber(date: Date, sequence: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');

  return `DMG-${year}${month}${day}-${seq}`;
}

/**
 * Check if codes in array are unique
 * @param codes - Array of codes to check
 * @returns True if all codes are unique
 */
export function areCodesUnique(codes: string[]): boolean {
  const uniqueCodes = new Set(codes);
  return uniqueCodes.size === codes.length;
}

/**
 * Extract sequence number from code
 * @param code - Code to parse
 * @returns Sequence number or null if invalid
 */
export function extractSequence(code: string): number | null {
  const match = code.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}
