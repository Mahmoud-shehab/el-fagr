/**
 * Damaged items management functions
 * Handles damage cost calculations and write-off operations
 */

export type DamageType =
  | 'PHYSICAL_DAMAGE'
  | 'WATER_DAMAGE'
  | 'EXPIRED'
  | 'MANUFACTURING_DEFECT'
  | 'STORAGE_DAMAGE'
  | 'TRANSIT_DAMAGE'
  | 'OTHER';

export interface DamageRecord {
  productId: string;
  quantity: number;
  unitCost: number;
  damageType: DamageType;
  totalCost?: number;
}

/**
 * Calculate total cost of damaged items
 * Formula: quantity × unitCost
 * @param quantity - Quantity of damaged items
 * @param unitCost - Cost per unit
 * @returns Total damage cost
 */
export function calculateDamageCost(
  quantity: number,
  unitCost: number
): number {
  if (quantity < 0) {
    throw new Error('Quantity must be non-negative');
  }

  if (unitCost < 0) {
    throw new Error('Unit cost must be non-negative');
  }

  const totalCost = quantity * unitCost;
  return Math.round(totalCost * 100) / 100;
}

/**
 * Create damage record with calculated cost
 * @param productId - Product identifier
 * @param quantity - Damaged quantity
 * @param unitCost - Cost per unit
 * @param damageType - Type of damage
 * @returns Complete damage record
 */
export function createDamageRecord(
  productId: string,
  quantity: number,
  unitCost: number,
  damageType: DamageType
): DamageRecord {
  const totalCost = calculateDamageCost(quantity, unitCost);

  return {
    productId,
    quantity,
    unitCost,
    damageType,
    totalCost,
  };
}

/**
 * Validate damage type
 * @param damageType - Type to validate
 * @returns True if valid damage type
 */
export function isValidDamageType(damageType: string): damageType is DamageType {
  const validTypes: DamageType[] = [
    'PHYSICAL_DAMAGE',
    'WATER_DAMAGE',
    'EXPIRED',
    'MANUFACTURING_DEFECT',
    'STORAGE_DAMAGE',
    'TRANSIT_DAMAGE',
    'OTHER',
  ];

  return validTypes.includes(damageType as DamageType);
}
