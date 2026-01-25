/**
 * Data validation functions for POS system
 * Handles email, phone, numeric, and field validation
 */

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone format (Egyptian format)
 * Accepts: 01xxxxxxxxx, +201xxxxxxxxx, 02xxxxxxxx
 * @param phone - Phone string to validate
 * @returns True if valid phone format
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Egyptian mobile: 01xxxxxxxxx (11 digits)
  const mobileRegex = /^01[0-2,5]{1}[0-9]{8}$/;
  
  // Egyptian mobile with country code: +201xxxxxxxxx
  const mobileWithCodeRegex = /^\+2001[0-2,5]{1}[0-9]{8}$/;
  
  // Egyptian landline: 02xxxxxxxx (9-10 digits)
  const landlineRegex = /^0[2-9]{1}[0-9]{7,8}$/;
  
  return mobileRegex.test(cleaned) || 
         mobileWithCodeRegex.test(cleaned) || 
         landlineRegex.test(cleaned);
}

/**
 * Validate if value is a valid number
 * @param value - Value to check
 * @returns True if valid number
 */
export function isValidNumber(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const num = Number(value);
  return !isNaN(num) && isFinite(num);
}

/**
 * Validate required fields in an object
 * @param data - Object to validate
 * @param requiredFields - Array of required field names
 * @returns Validation result with missing fields
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    
    if (value === null || value === undefined || value === '') {
      missingFields.push(String(field));
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Validate date range (start <= end)
 * @param startDate - Start date string (ISO format)
 * @param endDate - End date string (ISO format)
 * @returns True if valid date range
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) {
    return false;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  // Check if start <= end
  return start <= end;
}

/**
 * Validate positive number
 * @param value - Value to check
 * @returns True if positive number
 */
export function isPositiveNumber(value: unknown): boolean {
  if (!isValidNumber(value)) {
    return false;
  }

  return Number(value) > 0;
}

/**
 * Validate non-negative number
 * @param value - Value to check
 * @returns True if non-negative number
 */
export function isNonNegativeNumber(value: unknown): boolean {
  if (!isValidNumber(value)) {
    return false;
  }

  return Number(value) >= 0;
}

/**
 * Validate string length
 * @param value - String to validate
 * @param minLength - Minimum length
 * @param maxLength - Maximum length
 * @returns True if within length range
 */
export function isValidLength(
  value: string,
  minLength: number = 0,
  maxLength: number = Infinity
): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const length = value.trim().length;
  return length >= minLength && length <= maxLength;
}
