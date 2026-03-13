import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
    icon?: ReactNode;
}

/**
 * Button component following the design system
 * @param variant - Button style variant (default: 'primary')
 * @param size - Button size (default: 'md')
 * @param icon - Optional icon to display before the text
 * @param children - Button content
 */
export function Button({
    variant = 'primary',
    size = 'md',
    children,
    icon,
    className,
    ...props
}: ButtonProps) {
    return (
        <button
            className={clsx(
                'rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2',
                {
                    // Variants
                    'bg-primary-600 hover:bg-primary-700 text-white': variant === 'primary',
                    'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200': variant === 'secondary',
                    'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300': variant === 'ghost',
                    'bg-red-600 hover:bg-red-700 text-white': variant === 'danger',

                    // Sizes
                    'px-3 py-1.5 text-sm': size === 'sm',
                    'px-4 py-2 text-base': size === 'md',
                    'px-6 py-3 text-lg': size === 'lg',

                    // Disabled state
                    'opacity-50 cursor-not-allowed': props.disabled,
                },
                className
            )}
            {...props}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
        </button>
    );
}
