/**
 * Settings Utility Functions
 * Helper functions for managing application settings
 */

interface FBRSettings {
    enabled: boolean;
    posId: number;
}

interface SystemDefaults {
    defaultTaxRate: number;
    currency: string;
}

interface AppSettings {
    fbr: FBRSettings;
    defaults: SystemDefaults;
}

const SETTINGS_STORAGE_KEY = 'pos_settings';

const DEFAULT_SETTINGS: AppSettings = {
    fbr: { enabled: false, posId: 0 },
    defaults: { defaultTaxRate: 0, currency: 'PKR' },
};

/**
 * Load settings from localStorage
 */
export function loadSettings(): AppSettings {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
        try {
            const parsed: AppSettings = JSON.parse(savedSettings);
            return {
                fbr: { ...DEFAULT_SETTINGS.fbr, ...parsed.fbr },
                defaults: { ...DEFAULT_SETTINGS.defaults, ...parsed.defaults }
            };
        } catch (error) {
            console.error('Failed to parse settings from localStorage:', error);
        }
    }
    return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Get system defaults only
 */
export function getSystemDefaults(): SystemDefaults {
    const settings = loadSettings();
    return settings.defaults;
}

/**
 * Get FBR settings only
 */
export function getFBRSettings(): FBRSettings {
    const settings = loadSettings();
    return settings.fbr;
}

/**
 * Get default tax rate
 */
export function getDefaultTaxRate(): number {
    const defaults = getSystemDefaults();
    return defaults.defaultTaxRate;
}
