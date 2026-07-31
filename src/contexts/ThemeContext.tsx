import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'pos_theme_mode';

interface ThemeContextValue {
    /** What the user chose. */
    mode: ThemeMode;
    /** What is actually on screen once `system` is resolved. */
    resolved: 'light' | 'dark';
    setMode: (mode: ThemeMode) => void;
    /** Cycles light → dark → system. */
    cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const readStoredMode = (): ThemeMode => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'light';
};

const systemPrefersDark = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
    const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
        readStoredMode() === 'dark' || (readStoredMode() === 'system' && systemPrefersDark()) ? 'dark' : 'light',
    );

    // The `.dark` class on <html> is what the `dark:` variant keys off.
    useEffect(() => {
        const apply = () => {
            const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark());
            document.documentElement.classList.toggle('dark', dark);
            document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
            setResolved(dark ? 'dark' : 'light');
        };

        apply();
        localStorage.setItem(STORAGE_KEY, mode);

        if (mode !== 'system') return;
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        media.addEventListener('change', apply);
        return () => media.removeEventListener('change', apply);
    }, [mode]);

    const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
    const cycle = useCallback(
        () => setModeState(current => (current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light')),
        [],
    );

    return (
        <ThemeContext.Provider value={{ mode, resolved, setMode, cycle }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
    return context;
}
