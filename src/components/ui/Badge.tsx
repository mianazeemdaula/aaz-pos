import type { ReactNode } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    children: ReactNode;
    className?: string;
}

/**
 * Badge component for status indicators and labels
 * @param variant - Badge style variant (default: 'default')
 * @param size - Badge size (default: 'md')
 * @param children - Badge content
 */
export function Badge({
    variant = 'default',
    size = 'md',
    children,
    className
}: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center font-medium rounded',
                {
                    // Variants
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': variant === 'success',
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': variant === 'danger',
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400': variant === 'warning',
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': variant === 'info',
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300': variant === 'default',

                    // Sizes
                    'px-2 py-0.5 text-xs': size === 'sm',
                    'px-2 py-1 text-xs': size === 'md',
                },
                className
            )}
        >
            {children}
        </span>
    );
}
