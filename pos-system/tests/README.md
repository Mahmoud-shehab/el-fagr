# POS System Tests

This directory contains comprehensive tests for the POS system, including both unit tests and property-based tests.

## 📊 Test Statistics

- **Total Tests**: 210 ✅
- **Unit Tests**: 172
- **Property-Based Tests**: 38
- **Code Coverage**: 98.48%
- **Success Rate**: 100%
- **Execution Time**: ~1 second

## 📁 Structure

```
tests/
├── unit/                    # Unit tests (172 tests)
│   ├── balance.test.ts      # Customer & supplier balance tests (33)
│   ├── calculations.test.ts # Invoice & cart calculations (25)
│   ├── codeGenerator.test.ts # Code generation tests (22)
│   ├── damaged.test.ts      # Damage cost tests (10)
│   ├── inventory.test.ts    # Inventory operations (30)
│   ├── returns.test.ts      # Return validations (16)
│   ├── validators.test.ts   # Data validation (32)
│   └── setup.test.ts        # Setup verification (2)
│
├── properties/              # Property-based tests (38 tests)
│   ├── balance.property.test.ts        # Balance properties (3)
│   ├── calculations.property.test.ts   # Calculation properties (8)
│   ├── codeGenerator.property.test.ts  # Code uniqueness (8)
│   ├── inventory.property.test.ts      # Inventory properties (7)
│   ├── returns-damage.property.test.ts # Returns & damage (4)
│   ├── validators.property.test.ts     # Validation properties (8)
│   └── setup.property.test.ts          # Setup properties (2)
│
├── setup.ts                 # Test environment configuration
├── README.md               # This file
└── TEST_SUMMARY.md         # Detailed test report
```

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (interactive UI)
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run once (CI mode)
npm run test:run
```

### Advanced Usage

```bash
# Run specific test file
npm test -- balance.test.ts

# Run tests matching pattern
npm test -- --grep "calculation"

# Run with verbose output
npm test -- --reporter=verbose
```

## 🧪 Test Framework

- **Test Runner**: Vitest v4.0.17
- **Property Testing**: fast-check
- **Coverage**: @vitest/coverage-v8
- **Environment**: Node.js

## 📋 Test Categories

### 1. Calculation Tests

- **Unit Tests**: 25 | **Property Tests**: 8
- Tests invoice calculations, cart totals, discounts, and rounding
- **Coverage**: 100%

### 2. Inventory Tests

- **Unit Tests**: 30 | **Property Tests**: 7
- Tests stock operations, transfers, and low stock detection
- **Coverage**: 97.36%

### 3. Balance Tests

- **Unit Tests**: 33 | **Property Tests**: 3
- Tests customer/supplier balances and credit limits
- **Coverage**: 94.73%

### 4. Validation Tests

- **Unit Tests**: 32 | **Property Tests**: 8
- Tests email, phone, date, and field validations
- **Coverage**: 100%

### 5. Returns & Damage Tests

- **Unit Tests**: 26 | **Property Tests**: 4
- Tests return validations and damage cost calculations
- **Coverage**: 100%

### 6. Code Generation Tests

- **Unit Tests**: 22 | **Property Tests**: 8
- Tests unique code generation for invoices, customers, etc.
- **Coverage**: 100%

## 🎯 Property-Based Testing

Property-based tests validate universal correctness properties across many randomly generated inputs. Each property test runs 20 iterations with different inputs.

### Example Properties Tested:

- Cart item total = quantity × unit price
- Inventory never goes negative
- Customer balance = sales - payments - refunds
- Generated codes are always unique
- Return quantity ≤ original quantity

## 📈 Coverage Report

| File              | Statements | Branches | Functions | Lines   |
|-------------------|------------|----------|-----------|---------|
| **All files**     | **98.48%** | **97.35%** | **100%** | **98.48%** |
| balance.ts        | 94.73%     | 91.66%   | 100%      | 94.73%  |
| calculations.ts   | 100%       | 100%     | 100%      | 100%    |
| codeGenerator.ts  | 100%       | 100%     | 100%      | 100%    |
| damaged.ts        | 100%       | 100%     | 100%      | 100%    |
| inventory.ts      | 97.36%     | 94.59%   | 100%      | 97.36%  |
| returns.ts        | 100%       | 100%     | 100%      | 100%    |
| validators.ts     | 100%       | 100%     | 100%      | 100%    |

## 🔍 Viewing Coverage

After running `npm run test:coverage`, open:

```
pos-system/coverage/index.html
```

## ✅ Requirements Coverage

All 11 system requirements are covered with tests:

- ✅ Requirement 1: Sales invoices
- ✅ Requirement 2: Purchase invoices
- ✅ Requirement 3: Inventory management
- ✅ Requirement 4: Customer management
- ✅ Requirement 5: Supplier management
- ✅ Requirement 6: Sales returns
- ✅ Requirement 7: Purchase returns
- ✅ Requirement 8: Stock transfers
- ✅ Requirement 9: Damaged items
- ✅ Requirement 10: Calculations
- ✅ Requirement 11: Data validation

## 📝 Writing New Tests

### Unit Test Example:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../src/lib/myModule';

describe('My Module', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Property Test Example:

```typescript
import { describe, it } from 'vitest';
import fc from 'fast-check';

describe('Property Tests', () => {
  it('property holds for all inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (value) => {
          // Test that property holds
          return myFunction(value) >= 0;
        }
      ),
      { numRuns: 20 }
    );
  });
});
```

## 🐛 Debugging Tests

```bash
# Run tests with debugging
npm test -- --inspect-brk

# Run single test file with logs
npm test -- balance.test.ts --reporter=verbose
```

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [fast-check Documentation](https://fast-check.dev/)
- [Test Summary Report](./TEST_SUMMARY.md)
- [Design Document](../.kiro/specs/pos-system-testing/design.md)
- [Requirements Document](../.kiro/specs/pos-system-testing/requirements.md)

---

**Last Updated**: 2026-01-18
**Status**: ✅ All 210 tests passing
