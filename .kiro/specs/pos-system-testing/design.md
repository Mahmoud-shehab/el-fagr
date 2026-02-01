# Design Document: POS System Testing

## Overview

هذا المستند يحدد تصميم اختبارات نظام نقاط البيع (POS) لشركة الفجر الجديدة. يشمل التصميم اختبارات الوحدات (Unit Tests) واختبارات الخصائص (Property-Based Tests) لضمان صحة العمليات الحسابية والمنطقية في النظام.

### Testing Framework

- **Unit Testing**: Vitest (متوافق مع Vite)
- **Property-Based Testing**: fast-check
- **Test Runner**: Vitest
- **Coverage**: @vitest/coverage-v8

## Architecture

```
pos-system/
├── src/
│   ├── lib/
│   │   ├── calculations.ts      # Invoice & cart calculations
│   │   ├── validators.ts        # Data validation functions
│   │   └── inventory.ts         # Inventory operations
│   └── ...
├── tests/
│   ├── unit/
│   │   ├── calculations.test.ts
│   │   ├── validators.test.ts
│   │   └── inventory.test.ts
│   └── properties/
│       ├── calculations.property.ts
│       ├── inventory.property.ts
│       └── balance.property.ts
└── vitest.config.ts
```

## Components and Interfaces

### 1. Calculation Functions

```typescript
// src/lib/calculations.ts

interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

interface InvoiceCalculation {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

// Calculate cart item total
function calculateItemTotal(item: CartItem): number;

// Calculate invoice subtotal from items
function calculateSubtotal(items: CartItem[]): number;

// Calculate invoice total
function calculateInvoiceTotal(
  subtotal: number,
  discountAmount: number,
  taxAmount: number
): number;

// Calculate remaining amount
function calculateRemainingAmount(
  totalAmount: number,
  paidAmount: number
): number;

// Round to 2 decimal places
function roundMoney(value: number): number;
```

### 2. Inventory Functions

```typescript
// src/lib/inventory.ts

interface InventoryOperation {
  productId: string;
  branchId: string;
  quantity: number;
  operationType: 'SALE' | 'PURCHASE' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'RETURN' | 'DAMAGE';
}

interface InventoryState {
  productId: string;
  branchId: string;
  quantity: number;
  minQuantity: number;
}

// Apply inventory operation
function applyInventoryOperation(
  state: InventoryState,
  operation: InventoryOperation
): InventoryState;

// Check if product is low stock
function isLowStock(state: InventoryState): boolean;

// Validate transfer (source has enough quantity)
function canTransfer(
  sourceQuantity: number,
  transferQuantity: number
): boolean;
```

### 3. Validation Functions

```typescript
// src/lib/validators.ts

// Validate email format
function isValidEmail(email: string): boolean;

// Validate phone format
function isValidPhone(phone: string): boolean;

// Validate required fields
function validateRequiredFields<T>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missingFields: string[] };

// Validate numeric value
function isValidNumber(value: unknown): boolean;

// Validate date format and order
function isValidDateRange(startDate: string, endDate: string): boolean;
```

### 4. Balance Functions

```typescript
// src/lib/balance.ts

interface BalanceTransaction {
  type: 'CREDIT_SALE' | 'PAYMENT' | 'REFUND' | 'CREDIT_PURCHASE' | 'RETURN';
  amount: number;
}

// Calculate customer balance
function calculateCustomerBalance(transactions: BalanceTransaction[]): number;

// Calculate supplier balance
function calculateSupplierBalance(transactions: BalanceTransaction[]): number;

// Check if exceeds credit limit
function exceedsCreditLimit(balance: number, creditLimit: number): boolean;
```

## Data Models

### Cart Item Model
```typescript
interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
}
```

### Invoice Model
```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
}
```

### Inventory Model
```typescript
interface Inventory {
  productId: string;
  branchId: string;
  quantity: number;
  reservedQuantity: number;
  minQuantity: number;
  avgCost: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cart Item Total Calculation
*For any* cart item with positive quantity and unit price, the item total SHALL equal quantity multiplied by unit price.
**Validates: Requirements 1.1**

### Property 2: Subtotal Calculation
*For any* list of cart items, the subtotal SHALL equal the sum of all item totals (quantity × unit_price for each item).
**Validates: Requirements 10.1**

### Property 3: Invoice Total Formula
*For any* invoice with subtotal, discount, and tax values, the total_amount SHALL equal subtotal - discount_amount + tax_amount.
**Validates: Requirements 1.7, 2.4**

### Property 4: Remaining Amount Calculation
*For any* invoice with total_amount and paid_amount, the remaining_amount SHALL equal total_amount - paid_amount.
**Validates: Requirements 2.5**

### Property 5: Discount Constraint
*For any* invoice, the discount_amount SHALL be less than or equal to the subtotal.
**Validates: Requirements 10.4**

### Property 6: Monetary Rounding
*For any* monetary calculation result, the value SHALL be rounded to exactly 2 decimal places.
**Validates: Requirements 10.5**

### Property 7: Sale Inventory Decrease
*For any* completed sale, the inventory quantity SHALL decrease by exactly the sold quantity.
**Validates: Requirements 1.4**

### Property 8: Purchase Inventory Increase
*For any* completed purchase, the inventory quantity SHALL increase by exactly the purchased quantity.
**Validates: Requirements 2.2**

### Property 9: Non-Negative Inventory
*For any* inventory operation, the resulting quantity SHALL never be negative.
**Validates: Requirements 3.6**

### Property 10: Transfer Conservation
*For any* completed stock transfer, the quantity decreased at source branch SHALL equal the quantity increased at destination branch.
**Validates: Requirements 3.4, 8.5**

### Property 11: Transfer Quantity Constraint
*For any* stock transfer request, the transfer SHALL be rejected if transfer quantity exceeds available quantity at source.
**Validates: Requirements 8.4**

### Property 12: Low Stock Detection
*For any* inventory state where quantity is less than min_quantity, the product SHALL be flagged as low stock.
**Validates: Requirements 3.5**

### Property 13: Zero Stock Prevention
*For any* product with zero inventory quantity, adding it to cart SHALL be prevented.
**Validates: Requirements 1.6**

### Property 14: Customer Balance Formula
*For any* customer, current_balance SHALL equal sum(credit_sales) - sum(payments) - sum(refunds).
**Validates: Requirements 4.6**

### Property 15: Supplier Balance Formula
*For any* supplier, current_balance SHALL equal sum(credit_purchases) - sum(payments) - sum(returns).
**Validates: Requirements 5.5**

### Property 16: Credit Limit Check
*For any* customer where current_balance exceeds credit_limit, the account SHALL be flagged for review.
**Validates: Requirements 4.5**

### Property 17: Return Quantity Constraint
*For any* return (sales or purchase), the return quantity SHALL NOT exceed the original invoice quantity.
**Validates: Requirements 6.5, 7.5**

### Property 18: Unique Code Generation
*For any* set of generated codes (invoice numbers, customer codes, supplier codes), all codes SHALL be unique.
**Validates: Requirements 1.3, 2.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 11.5**

### Property 19: Email Validation
*For any* string input to email validation, valid emails SHALL match the standard email format pattern.
**Validates: Requirements 11.3**

### Property 20: Phone Validation
*For any* string input to phone validation, valid phones SHALL match acceptable phone format patterns.
**Validates: Requirements 11.4**

### Property 21: Required Fields Validation
*For any* record with missing required fields, validation SHALL fail and identify the missing fields.
**Validates: Requirements 11.1**

### Property 22: Numeric Validation
*For any* input to numeric fields, non-numeric values SHALL be rejected.
**Validates: Requirements 11.2**

### Property 23: Date Range Validation
*For any* date range, start_date SHALL be less than or equal to end_date.
**Validates: Requirements 11.6**

### Property 24: Damage Cost Calculation
*For any* damaged item record, total_cost SHALL equal quantity multiplied by product cost.
**Validates: Requirements 9.3**

## Error Handling

### Calculation Errors
- Division by zero: Return 0 or throw specific error
- Negative quantities: Reject with validation error
- Invalid discount (> subtotal): Reject with validation error

### Inventory Errors
- Insufficient stock: Return error with available quantity
- Invalid branch: Return error with branch not found
- Negative result: Prevent operation, return current state

### Validation Errors
- Missing required fields: Return list of missing fields
- Invalid format: Return specific format error message
- Duplicate code: Return conflict error with existing code

## Testing Strategy

### Unit Tests
Unit tests verify specific examples and edge cases:
- Zero quantity calculations
- Empty cart handling
- Boundary values (min/max quantities)
- Error conditions (invalid inputs)
- Specific business scenarios

### Property-Based Tests
Property tests verify universal properties across all inputs:
- Use fast-check library for TypeScript
- Minimum 100 iterations per property
- Custom generators for domain-specific types
- Each property references design document property number

### Test Configuration
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Property Test Annotation Format
```typescript
// Feature: pos-system-testing, Property 1: Cart Item Total Calculation
test.prop([fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 10000 })])(
  'item total equals quantity * unit price',
  (quantity, unitPrice) => {
    // test implementation
  }
);
```
