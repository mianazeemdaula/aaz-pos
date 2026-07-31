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
 * Card — a flat panel on the workspace.
 *
 * Console draws separation with a border rather than a shadow; elevation is
 * reserved for things that genuinely float (menus, modals, toasts).
 */
export function Card({
    children,
    className,
    padding = 'md',
    onClick,
}: CardProps) {
    return (
        <div
            className={clsx(
                'rounded-lg border border-gray-200 bg-white dark:border-gray-750 dark:bg-gray-900',
                {
                    'p-0': padding === 'none',
                    'p-3': padding === 'sm',
                    'p-4': padding === 'md',
                    'p-6': padding === 'lg',
                    'cursor-pointer transition-colors hover:border-gray-300 dark:hover:border-gray-700': onClick,
                },
                className,
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
