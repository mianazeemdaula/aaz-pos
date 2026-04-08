/**
 * Format a number as US currency
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'PKR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format a number with thousands separator
 * @param value - The number to format
 * @returns Formatted number string (e.g., "1,234")
 */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a percentage value
 * @param value - The percentage value (e.g., 3.5 for 3.5%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "3.5%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Format a large number with abbreviation (K, M, B)
 * @param num - The number to format
 * @returns Abbreviated number string (e.g., "1.2K", "3.5M")
 */
export function formatAbbreviatedNumber(num: number): string {
    if (num >= 1_000_000_000) {
        return `${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
}

/**
 * Month names array (1-indexed usage: MONTH_NAMES[monthNumber - 1])
 */
export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * Get month name from 1-based month number
 */
export function getMonthName(month: number): string {
    return MONTH_NAMES[(month - 1) % 12] ?? '';
}

/**
 * Format CNIC for display: xxxxx-xxxxxxx-x
 * Strips non-digits, then inserts dashes. Returns raw value if not 13 digits.
 */
export function formatCNIC(value: string | null | undefined): string {
    if (!value) return '—';
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 13) return value;
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/**
 * Format mobile number for display: 03xx-xxxxxxx
 * Strips non-digits, then inserts dash after 4th digit. Returns raw value if not 11 digits.
 */
export function formatPhone(value: string | null | undefined): string {
    if (!value) return '—';
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11) return value;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/**
 * CNIC input handler: auto-formats as user types (xxxxx-xxxxxxx-x).
 * Strips non-digits and caps at 13 digits. Returns raw digits for storage.
 */
export function handleCNICInput(rawInput: string): { display: string; raw: string } {
    const digits = rawInput.replace(/\D/g, '').slice(0, 13);
    let display = digits;
    if (digits.length > 5) display = digits.slice(0, 5) + '-' + digits.slice(5);
    if (digits.length > 12) display = digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12);
    return { display, raw: digits };
}

/**
 * Phone input handler: auto-formats as user types (03xx-xxxxxxx).
 * Strips non-digits and caps at 11 digits. Returns raw digits for storage.
 */
export function handlePhoneInput(rawInput: string): { display: string; raw: string } {
    const digits = rawInput.replace(/\D/g, '').slice(0, 11);
    let display = digits;
    if (digits.length > 4) display = digits.slice(0, 4) + '-' + digits.slice(4);
    return { display, raw: digits };
}
