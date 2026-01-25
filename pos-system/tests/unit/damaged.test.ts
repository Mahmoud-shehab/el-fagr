import { describe, it, expect } from 'vitest';
import {
  calculateDamageCost,
  createDamageRecord,
  isValidDamageType,
} from '../../src/lib/damaged';

describe('Damaged - Calculate Cost', () => {
  it('should calculate damage cost correctly', () => {
    expect(calculateDamageCost(10, 5.5)).toBe(55);
    expect(calculateDamageCost(3, 10)).toBe(30);
  });

  it('should handle zero quantity', () => {
    expect(calculateDamageCost(0, 10)).toBe(0);
  });

  it('should handle zero cost', () => {
    expect(calculateDamageCost(10, 0)).toBe(0);
  });

  it('should round to 2 decimal places', () => {
    expect(calculateDamageCost(3, 10.333)).toBe(31);
  });

  it('should throw error for negative quantity', () => {
    expect(() => calculateDamageCost(-5, 10)).toThrow();
  });

  it('should throw error for negative cost', () => {
    expect(() => calculateDamageCost(5, -10)).toThrow();
  });
});

describe('Damaged - Create Record', () => {
  it('should create complete damage record', () => {
    const record = createDamageRecord('P1', 5, 10, 'PHYSICAL_DAMAGE');
    
    expect(record.productId).toBe('P1');
    expect(record.quantity).toBe(5);
    expect(record.unitCost).toBe(10);
    expect(record.damageType).toBe('PHYSICAL_DAMAGE');
    expect(record.totalCost).toBe(50);
  });

  it('should calculate total cost automatically', () => {
    const record = createDamageRecord('P2', 3, 15.5, 'WATER_DAMAGE');
    expect(record.totalCost).toBe(46.5);
  });
});

describe('Damaged - Validate Type', () => {
  it('should validate correct damage types', () => {
    expect(isValidDamageType('PHYSICAL_DAMAGE')).toBe(true);
    expect(isValidDamageType('WATER_DAMAGE')).toBe(true);
    expect(isValidDamageType('EXPIRED')).toBe(true);
    expect(isValidDamageType('MANUFACTURING_DEFECT')).toBe(true);
    expect(isValidDamageType('STORAGE_DAMAGE')).toBe(true);
    expect(isValidDamageType('TRANSIT_DAMAGE')).toBe(true);
    expect(isValidDamageType('OTHER')).toBe(true);
  });

  it('should reject invalid damage types', () => {
    expect(isValidDamageType('INVALID')).toBe(false);
    expect(isValidDamageType('BROKEN')).toBe(false);
    expect(isValidDamageType('')).toBe(false);
  });
});
