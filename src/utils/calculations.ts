/**
 * Utility functions for financial calculations
 */

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (positive or negative)
 */
export function calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

/**
 * Calculate net balance (income - expenses)
 * @param income - Total income
 * @param expenses - Total expenses
 * @returns Net balance
 */
export function calculateNetBalance(income: number, expenses: number): number {
    return income - expenses;
}

/**
 * Calculate savings percentage
 * @param savings - Savings amount
 * @param income - Total income
 * @returns Savings percentage
 */
export function calculateSavingsPercentage(savings: number, income: number): number {
    if (income === 0) return 0;
    return (savings / income) * 100;
}



