/**
 * Design system constants and theme values
 * Use these throughout the application for consistency
 */

export const COLORS = {
    // Primary brand colors
    primary: {
        50: '#f0fdfa',
        100: '#ccfbf1',
        200: '#99f6e4',
        300: '#5eead4',
        400: '#14b8a6',
        500: '#0d9488',
        600: '#0f766e',
        700: '#115e59',
        800: '#134e4a',
        900: '#0c3c38',
    },
    // Secondary brand colors
    secondary: {
        50: '#f5f3fc',
        100: '#eae5f8',
        200: '#d5ccf1',
        300: '#b8a7e5',
        400: '#9679d6',
        500: '#7050c2',
        600: '#5438a0',
        700: '#3f2a7c',
        800: '#281c59',
        900: '#1a1040',
    },
    // Status colors
    success: {
        light: '#dcfce7',
        main: '#22c55e',
        dark: '#15803d',
    },
    error: {
        light: '#fee2e2',
        main: '#ef4444',
        dark: '#b91c1c',
    },
    warning: {
        light: '#fef3c7',
        main: '#f59e0b',
        dark: '#d97706',
    },
    info: {
        light: '#dbeafe',
        main: '#3b82f6',
        dark: '#1d4ed8',
    },
} as const;

export const SPACING = {
    card: 'p-6',
    section: 'space-y-6',
    grid: 'gap-6',
    gridSmall: 'gap-4',
} as const;

export const TYPOGRAPHY = {
    pageTitle: 'text-3xl font-bold',
    sectionTitle: 'text-xl font-semibold',
    cardTitle: 'text-sm font-medium text-gray-600 dark:text-gray-400',
    body: 'text-base font-normal',
    small: 'text-sm',
    tiny: 'text-xs',
} as const;

export const BORDER_RADIUS = {
    small: 'rounded-lg',
    medium: 'rounded-xl',
    large: 'rounded-2xl',
    full: 'rounded-full',
} as const;

export const BREAKPOINTS = {
    mobile: '0px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
} as const;

// Transaction categories
export const TRANSACTION_CATEGORIES = [
    'Subscriptions',
    'Family & Friends',
    'Shopping',
    'Housing',
    'Transportation',
    'Food & Dining',
    'Entertainment',
    'Healthcare',
    'Other',
] as const;

// Transaction statuses
export const TRANSACTION_STATUSES = ['completed', 'failed', 'pending'] as const;

// Chart colors (for expenditure categories)
export const CHART_COLORS = [
    '#0f766e', // Primary green
    '#0d9488', // Light primary
    '#14b8a6', // Lighter teal
    '#5eead4', // Very light teal
    '#281c59', // Secondary blue
    '#5438a0', // Light secondary
] as const;

// Time periods
export const TIME_PERIODS = ['day', 'week', 'month', 'year'] as const;

// Packaging unit multipliers for storage capacity calculation
// Capacity is stored in BORI (base unit). 2 TORA = 1 BORI, 4 CRATE = 1 BORI.
// A rack with capacity 100 BORI can hold 200 TORA or 400 CRATE.
export const PACKAGING_MULTIPLIERS: Record<string, number> = {
    BORI: 1,
    TORA: 2,
    CRATE: 4,
};

/**
 * Returns how many of the given packaging unit fit in 1 BORI.
 * 2 TORA = 1 BORI → multiplier 2; 4 CRATE = 1 BORI → multiplier 4.
 * Use: capacityInUnits = boriCapacity × multiplier
 */
export function getPackagingMultiplier(packagingType?: string | null): number {
    if (!packagingType) return 1;
    return PACKAGING_MULTIPLIERS[packagingType.toUpperCase()] ?? 1;
}

// Icon sizes
export const ICON_SIZES = {
    small: 16,
    medium: 20,
    large: 24,
    xlarge: 32,
} as const;
