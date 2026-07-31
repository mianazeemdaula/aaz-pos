/**
 * Utility functions for financial calculations
 */

/**
 * Round a numeric value to maximum 2 decimal places.
 */
export function round2(n: number | null | undefined): number {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return 0;
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (positive or negative)
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return round2(((current - previous) / previous) * 100);
}

/**
 * Calculate net balance (income - expenses)
 * @param income - Total income
 * @param expenses - Total expenses
 * @returns Net balance
 */
export function calculateNetBalance(income: number, expenses: number): number {
  return round2(income - expenses);
}

/**
 * Calculate savings percentage
 * @param savings - Savings amount
 * @param income - Total income
 * @returns Savings percentage
 */
export function calculateSavingsPercentage(savings: number, income: number): number {
  if (income === 0) return 0;
  return round2((savings / income) * 100);
}
