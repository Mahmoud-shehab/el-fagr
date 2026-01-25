import { describe, it, expect } from 'vitest';

describe('Test Environment Setup', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have vitest globals available', () => {
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });
});
