import type { ReactNode } from 'react';
import clsx from 'clsx';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
    children: ReactNode;
    className?: string;
    padding?: CardPadding;
    onClick?: () => void;
}

/**
 * Card component - base container for content sections
 * @param padding - Card padding size (default: 'md')
 * @param children - Card content
 * @param className - Additional CSS classes
 * @param onClick - Optional click handler (makes card interactive)
 */
export function Card({
    children,
    className,
    padding = 'md',
    onClick
}: CardProps) {
    return (
        <div
            className={clsx(
                'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
                {
                    'p-0': padding === 'none',
                    'p-4': padding === 'sm',
                    'p-6': padding === 'md',
                    'p-8': padding === 'lg',
                    'cursor-pointer hover:shadow-lg transition-shadow': onClick,
                },
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
