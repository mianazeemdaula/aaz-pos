import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
    icon?: ReactNode;
}

/**
 * Button — the Console action language.
 *
 * Every variant carries a border so buttons keep their shape on both the light
 * workspace and dark panels; only `primary` fills.
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
                'inline-flex items-center justify-center gap-2 rounded-md border font-semibold',
                'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                {
                    'border-primary-600 bg-primary-600 text-white hover:border-primary-700 hover:bg-primary-700':
                        variant === 'primary',
                    'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750':
                        variant === 'secondary',
                    'border-transparent bg-transparent text-gray-600 hover:bg-gray-150 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100':
                        variant === 'ghost',
                    'border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700':
                        variant === 'danger',

                    'h-7 px-2.5 text-xs': size === 'sm',
                    'h-8 px-3.5 text-[13px]': size === 'md',
                    'h-10 px-5 text-sm': size === 'lg',
                },
                className,
            )}
            {...props}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
        </button>
    );
}
