import { format, formatDistance, formatRelative, parseISO } from 'date-fns';

/**
 * Format a date string to a readable format
 * @param dateString - ISO date string
 * @param formatString - Format pattern (default: 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, formatString: string = 'MMM dd, yyyy'): string {
    try {
        const date = parseISO(dateString);
        return format(date, formatString);
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

/**
 * Format a date with time
 * @param dateString - ISO date string
 * @returns Formatted date and time string (e.g., "Feb 13, 2025, 09:30 AM")
 */
export function formatDateTime(dateString: string): string {
    return formatDate(dateString, 'MMM dd, yyyy, hh:mm a');
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
    try {
        const date = parseISO(dateString);
        return formatDistance(date, new Date(), { addSuffix: true });
    } catch (error) {
        console.error('Error formatting relative time:', error);
        return dateString;
    }
}

/**
 * Format a date in a relative format with context
 * @param dateString - ISO date string
 * @returns Contextual date string (e.g., "yesterday at 3:24 PM")
 */
export function formatRelativeDate(dateString: string): string {
    try {
        const date = parseISO(dateString);
        return formatRelative(date, new Date());
    } catch (error) {
        console.error('Error formatting relative date:', error);
        return dateString;
    }
}

/**
 * Get month name from a number
 * @param month - Month number (1-12)
 * @returns Month name (e.g., "January")
 */
export function getMonthName(month: number): string {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
}

/**
 * Get short month name from a number
 * @param month - Month number (1-12)
 * @returns Short month name (e.g., "Jan")
 */
export function getShortMonthName(month: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
}
