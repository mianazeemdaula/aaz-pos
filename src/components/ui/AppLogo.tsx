/**
 * Application branding.
 *
 * Assets live in `public/`, so they resolve from the site root in the browser
 * and from the bundled dist root inside the Tauri window — the same path works
 * in dev, in a web build and in the packaged .exe.
 *
 *   logo.png       full lockup: symbol above the AAZIFY wordmark
 *   logo-mark.png  symbol only — the wordmark is near-black and vanishes on the
 *                  dark top bar, so anything on a dark ground uses this
 *   logo-square.png  padded square, the source for the window and taskbar icons
 */

export const APP_NAME = 'Aazify POS';

interface AppLogoProps {
    /** `mark` is the symbol alone; `full` is the stacked lockup with the wordmark. */
    variant?: 'mark' | 'full';
    /** Rendered height in pixels. Width follows the aspect ratio. */
    size?: number;
    className?: string;
}

export function AppLogo({ variant = 'mark', size = 26, className = '' }: AppLogoProps) {
    const src = variant === 'full' ? '/logo.png' : '/logo-mark.png';
    return (
        <img
            src={src}
            alt={APP_NAME}
            height={size}
            style={{ height: size }}
            className={`w-auto select-none ${className}`}
            draggable={false}
        />
    );
}
