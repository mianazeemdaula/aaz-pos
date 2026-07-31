import type { ReactNode } from 'react';
import clsx from 'clsx';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    children: ReactNode;
    className?: string;
    /** Adds a leading status dot, so state reads without relying on colour alone. */
    dot?: boolean;
}

/**
 * Badge — semantic state. These colours mean something; the indigo accent is
 * for action and is deliberately not available here.
 */
export function Badge({
    variant = 'default',
    size = 'md',
    children,
    className,
    dot = false,
}: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 rounded-sm font-semibold whitespace-nowrap',
                {
                    'bg-green-50 text-green-700 dark:bg-green-700/15 dark:text-green-500': variant === 'success',
                    'bg-red-50 text-red-700 dark:bg-red-600/15 dark:text-red-500': variant === 'danger',
                    'bg-amber-50 text-amber-700 dark:bg-amber-600/15 dark:text-amber-500': variant === 'warning',
                    'bg-primary-50 text-primary-700 dark:bg-primary-600/15 dark:text-primary-400': variant === 'info',
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300': variant === 'default',

                    'px-1.5 py-0.5 text-[10px]': size === 'sm',
                    'px-2 py-0.5 text-[11px]': size === 'md',
                },
                className,
            )}
        >
            {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            {children}
        </span>
    );
}
