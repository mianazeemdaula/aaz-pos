import clsx from 'clsx';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
    src?: string;
    alt: string;
    size?: AvatarSize;
    fallback?: string;
    className?: string;
}

/**
 * Avatar component for user/company profile images
 * @param src - Image URL
 * @param alt - Alt text for accessibility
 * @param size - Avatar size (default: 'md')
 * @param fallback - Fallback text (initials) if image fails to load
 */
export function Avatar({
    src,
    alt,
    size = 'md',
    fallback,
    className
}: AvatarProps) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    return (
        <div
            className={clsx(
                'rounded-full overflow-hidden flex items-center justify-center bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-semibold',
                sizeClasses[size],
                className
            )}
        >
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Hide image and show fallback if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            ) : (
                <span>{fallback || alt.charAt(0).toUpperCase()}</span>
            )}
        </div>
    );
}
