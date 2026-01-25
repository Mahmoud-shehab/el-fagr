import { describe, it } from 'vitest';
import fc from 'fast-check';

describe('Property-Based Testing Setup', () => {
  it('should run basic property test', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a; // Commutative property
      }),
      { numRuns: 20 }
    );
  });

  it('should have fast-check available', () => {
    fc.assert(
      fc.property(fc.nat(), (n) => {
        return n >= 0; // Natural numbers are non-negative
      }),
      { numRuns: 20 }
    );
  });
});
