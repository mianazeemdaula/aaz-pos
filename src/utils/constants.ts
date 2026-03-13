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
        400: '#2dd4bf',
        500: '#14b8a6',
        600: '#0d9488',
        700: '#0f766e',
        800: '#115e59',
        900: '#134e4a',
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
    '#0d9488', // Primary teal
    '#14b8a6', // Light teal
    '#5eead4', // Very light teal
    '#2dd4bf', // Bright teal
    '#0f766e', // Dark teal
    '#115e59', // Very dark teal
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
