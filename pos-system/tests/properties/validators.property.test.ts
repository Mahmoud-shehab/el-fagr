import { describe, it } from 'vitest';
import fc from 'fast-check';
import {
  isValidEmail,
  isValidPhone,
  validateRequiredFields,
  isValidNumber,
  isValidDateRange,
} from '../../src/lib/validators';

describe('Property Tests - Validation Functions', () => {
  // Feature: pos-system-testing, Property 19: Email Validation
  it('valid emails match standard email format pattern', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const isValid = isValidEmail(email);
          // fast-check generates valid emails, so they should pass
          return isValid === true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('invalid emails are rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('notanemail'),
          fc.constant('missing@domain'),
          fc.constant('@nodomain.com'),
          fc.constant('no@domain'),
          fc.constant('spaces in@email.com')
        ),
        (invalidEmail) => {
          const isValid = isValidEmail(invalidEmail);
          return isValid === false;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 20: Phone Validation
  it('valid Egyptian phone numbers are accepted', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('01012345678'),
          fc.constant('01112345678'),
          fc.constant('01212345678'),
          fc.constant('01512345678')
        ),
        (phone) => {
          const isValid = isValidPhone(phone);
          return isValid === true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('invalid phone numbers are rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('123'),
          fc.constant('0123456789'),
          fc.constant('02012345678'),
          fc.constant('not-a-phone')
        ),
        (invalidPhone) => {
          const isValid = isValidPhone(invalidPhone);
          return isValid === false;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 21: Required Fields Validation
  it('validation fails when required fields are missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.option(fc.string(), { nil: undefined }),
          email: fc.option(fc.string(), { nil: undefined }),
          phone: fc.option(fc.string(), { nil: undefined }),
        }),
        (data) => {
          const result = validateRequiredFields(data, ['name', 'email', 'phone']);

          const actualMissing = [];
          if (!data.name) actualMissing.push('name');
          if (!data.email) actualMissing.push('email');
          if (!data.phone) actualMissing.push('phone');

          if (actualMissing.length > 0) {
            return result.valid === false && result.missingFields.length === actualMissing.length;
          } else {
            return result.valid === true && result.missingFields.length === 0;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 22: Numeric Validation
  it('numeric validation accepts numbers and rejects non-numbers', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.float(),
          fc.constant('not-a-number'),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant('123abc')
        ),
        (value) => {
          const isValid = isValidNumber(value);

          if (typeof value === 'number' && !isNaN(value)) {
            return isValid === true;
          } else {
            return isValid === false;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Feature: pos-system-testing, Property 23: Date Range Validation
  it('start_date must be <= end_date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31'), noInvalidDate: true }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31'), noInvalidDate: true }),
        (date1, date2) => {
          const startDate = date1 < date2 ? date1.toISOString() : date2.toISOString();
          const endDate = date1 < date2 ? date2.toISOString() : date1.toISOString();

          const isValid = isValidDateRange(startDate, endDate);
          return isValid === true;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('invalid date ranges are rejected', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31'), noInvalidDate: true }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31'), noInvalidDate: true }),
        (date1, date2) => {
          if (date1.getTime() === date2.getTime()) {
            return true; // Skip equal dates
          }

          const startDate = date1 > date2 ? date1.toISOString() : date2.toISOString();
          const endDate = date1 > date2 ? date2.toISOString() : date1.toISOString();

          const isValid = isValidDateRange(startDate, endDate);
          return isValid === false;
        }
      ),
      { numRuns: 20 }
    );
  });
});
