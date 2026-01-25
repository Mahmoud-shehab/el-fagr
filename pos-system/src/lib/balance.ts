/**
 * Balance calculation functions for customers and suppliers
 * Handles account balances, credit limits, and transaction tracking
 */

export type TransactionType =
  | 'CREDIT_SALE'
  | 'PAYMENT'
  | 'REFUND'
  | 'CREDIT_PURCHASE'
  | 'RETURN'
  | 'OPENING_BALANCE';

export interface BalanceTransaction {
  type: TransactionType;
  amount: number;
  date?: string;
  reference?: string;
}

/**
 * Calculate customer balance from transactions
 * Formula: sum(credit_sales) - sum(payments) - sum(refunds)
 * @param transactions - Array of customer transactions
 * @returns Current balance
 */
export function calculateCustomerBalance(
  transactions: BalanceTransaction[]
): number {
  let balance = 0;

  for (const transaction of transactions) {
    if (transaction.amount < 0) {
      throw new Error('Transaction amount must be non-negative');
    }

    switch (transaction.type) {
      case 'CREDIT_SALE':
      case 'OPENING_BALANCE':
        // Increase customer debt
        balance += transaction.amount;
        break;

      case 'PAYMENT':
      case 'REFUND':
        // Decrease customer debt
        balance -= transaction.amount;
        break;

      default:
        // Ignore other transaction types for customers
        break;
    }
  }

  return Math.round(balance * 100) / 100;
}

/**
 * Calculate supplier balance from transactions
 * Formula: sum(credit_purchases) - sum(payments) - sum(returns)
 * @param transactions - Array of supplier transactions
 * @returns Current balance (amount owed to supplier)
 */
export function calculateSupplierBalance(
  transactions: BalanceTransaction[]
): number {
  let balance = 0;

  for (const transaction of transactions) {
    if (transaction.amount < 0) {
      throw new Error('Transaction amount must be non-negative');
    }

    switch (transaction.type) {
      case 'CREDIT_PURCHASE':
      case 'OPENING_BALANCE':
        // Increase amount owed to supplier
        balance += transaction.amount;
        break;

      case 'PAYMENT':
      case 'RETURN':
        // Decrease amount owed to supplier
        balance -= transaction.amount;
        break;

      default:
        // Ignore other transaction types for suppliers
        break;
    }
  }

  return Math.round(balance * 100) / 100;
}

/**
 * Check if customer balance exceeds credit limit
 * @param balance - Current customer balance
 * @param creditLimit - Maximum allowed credit
 * @returns True if balance exceeds limit
 */
export function exceedsCreditLimit(
  balance: number,
  creditLimit: number
): boolean {
  if (creditLimit < 0) {
    throw new Error('Credit limit must be non-negative');
  }

  return balance > creditLimit;
}

/**
 * Calculate available credit for customer
 * @param balance - Current balance
 * @param creditLimit - Maximum credit limit
 * @returns Available credit amount
 */
export function getAvailableCredit(
  balance: number,
  creditLimit: number
): number {
  if (creditLimit < 0) {
    throw new Error('Credit limit must be non-negative');
  }

  const available = creditLimit - balance;
  return Math.max(0, available);
}

/**
 * Check if customer can make a purchase
 * @param currentBalance - Current customer balance
 * @param purchaseAmount - Amount of new purchase
 * @param creditLimit - Credit limit
 * @returns True if purchase is allowed
 */
export function canMakePurchase(
  currentBalance: number,
  purchaseAmount: number,
  creditLimit: number
): boolean {
  if (purchaseAmount < 0) {
    throw new Error('Purchase amount must be non-negative');
  }

  const newBalance = currentBalance + purchaseAmount;
  return !exceedsCreditLimit(newBalance, creditLimit);
}

/**
 * Get account status based on balance
 * @param balance - Current balance
 * @param creditLimit - Credit limit
 * @returns Account status
 */
export function getAccountStatus(
  balance: number,
  creditLimit: number
): 'CLEAR' | 'ACTIVE' | 'OVER_LIMIT' {
  if (balance <= 0) {
    return 'CLEAR';
  }

  if (exceedsCreditLimit(balance, creditLimit)) {
    return 'OVER_LIMIT';
  }

  return 'ACTIVE';
}
