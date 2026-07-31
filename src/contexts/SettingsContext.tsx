import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { settingsService } from '../services/pos.service';
import { loadThermalConfig, ThermalPrinterConfig } from '../utils/thermalPrinter';
import { FBR_CONFIG } from '../config/api';

export interface CompanySettings {
  businessName: string;
  address: string;
  phone: string;
  ntn: string;
  strn: string;
  currency: string;
  defaultTaxRate: number;
  invoiceNote: string;
}

export interface FbrSettings {
  url?: string;
  enabled: boolean;
  posId?: number;
}

// ─── Per-module permission flags ─────────────────────────────────────────────
// Each entry maps 1:1 with a sidebar menu item so admins can toggle access individually.
export const PERMISSION_MODULES = [
  // Quick Actions
  'dashboard',
  'sales',
  'purchases',
  'advance-bookings',
  // History
  'held',
  'sale-history',
  'purchase-history',
  'returns',
  'payments',
  // Inventory
  'products',
  'print-labels',
  'categories',
  'brands',
  'stock-adjustments',
  // Parties
  'customers',
  'suppliers',
  // HR & Finance
  'employees',
  'salary-slips',
  'expenses',
  'accounts',
  'promotions',
  // Admin
  'reports',
  'users',
  'settings',
] as const;

/** Human-readable labels for the permissions table UI */
export const PERMISSION_LABELS: Record<PermissionModule, string> = {
  'dashboard':        'Dashboard',
  'sales':            'New Sale',
  'purchases':        'New Purchase',
  'advance-bookings': 'Advance Bookings',
  'held':             'Held Transactions',
  'sale-history':     'Sales History',
  'purchase-history': 'Purchase History',
  'returns':          'Returns',
  'payments':         'Payments',
  'products':         'Products',
  'print-labels':     'Print Labels',
  'categories':       'Categories',
  'brands':           'Brands',
  'stock-adjustments':'Stock Adjustments',
  'customers':        'Customers',
  'suppliers':        'Suppliers',
  'employees':        'Employees',
  'salary-slips':     'Salary Slips',
  'expenses':         'Expenses',
  'accounts':         'Accounts',
  'promotions':       'Promotions',
  'reports':          'Reports',
  'users':            'Users',
  'settings':         'Settings',
};

export type PermissionModule = typeof PERMISSION_MODULES[number];

export interface ModulePermission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export type UserPermissions = Record<PermissionModule, ModulePermission>;

/** Modules a non-admin cashier/manager gets by default when no custom perms are saved */
const DEFAULT_NON_ADMIN_VIEW = new Set<PermissionModule>([
  'dashboard', 'sales', 'sale-history', 'held', 'payments',
]);
const DEFAULT_NON_ADMIN_EDIT = new Set<PermissionModule>([
  'sales',
]);

/**
 * Default permissions per role.
 * - ADMIN: full access to everything
 * - Others: only dashboard + core sales modules unless custom permissions were saved
 */
export function defaultPermissions(role?: string): UserPermissions {
  const isAdmin = role === 'ADMIN';
  const result = {} as UserPermissions;
  for (const mod of PERMISSION_MODULES) {
    if (isAdmin) {
      result[mod] = { view: true, edit: true, delete: true };
    } else {
      result[mod] = {
        view: DEFAULT_NON_ADMIN_VIEW.has(mod),
        edit: DEFAULT_NON_ADMIN_EDIT.has(mod),
        delete: false,
      };
    }
  }
  return result;
}

/** Parse flat user settings (perm.sales.view = "true") into UserPermissions */
export function parsePermissions(raw: Record<string, unknown>, role?: string): UserPermissions {
  const defaults = defaultPermissions(role);

  // Check if there are ANY perm.* keys in the raw data
  // If none exist, this user has never had permissions configured → use defaults
  const hasPermKeys = Object.keys(raw).some(k => k.startsWith('perm.'));
  if (!hasPermKeys) return defaults;

  // If perm keys exist, build from explicit values (defaulting unconfigured to false)
  const result = {} as UserPermissions;
  for (const mod of PERMISSION_MODULES) {
    result[mod] = { view: false, edit: false, delete: false };
    for (const action of ['view', 'edit', 'delete'] as const) {
      const key = `perm.${mod}.${action}`;
      if (key in raw) {
        result[mod][action] = raw[key] === true || raw[key] === 'true';
      }
    }
  }
  return result;
}

/** Flatten UserPermissions into a flat record for saving via userSettings API */
export function flattenPermissions(perms: UserPermissions): Record<string, boolean> {
  const flat: Record<string, boolean> = {};
  for (const mod of PERMISSION_MODULES) {
    for (const action of ['view', 'edit', 'delete'] as const) {
      flat[`perm.${mod}.${action}`] = perms[mod][action];
    }
  }
  return flat;
}

// ─── Global Settings ─────────────────────────────────────────────────────────

export interface GlobalSettings {
  company: CompanySettings;
  app: Record<string, unknown>;
  thermal: ThermalPrinterConfig;
  fbr: FbrSettings;
}

const DEFAULT_COMPANY: CompanySettings = {
  businessName: 'Aazify POS',
  address: '',
  phone: '',
  ntn: '',
  strn: '',
  currency: 'PKR',
  defaultTaxRate: 0,
  invoiceNote: '',
};

interface SettingsContextType {
  settings: GlobalSettings;
  permissions: UserPermissions;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateCompanySettings: (data: Partial<CompanySettings>) => Promise<void>;
  updateAppSettings: (data: Record<string, unknown>) => Promise<void>;
  setThermalConfig: (config: ThermalPrinterConfig) => void;
  setFbrConfig: (config: FbrSettings) => void;
  /** Check if the logged-in user has a specific permission */
  hasPermission: (module: PermissionModule, action: 'view' | 'edit' | 'delete') => boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const LS_FBR = 'pos_fbr_settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions());
  const [settings, setSettings] = useState<GlobalSettings>({
    company: DEFAULT_COMPANY,
    app: {},
    thermal: loadThermalConfig(),
    fbr: (() => {
      try {
        const raw = localStorage.getItem(LS_FBR);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { enabled: !!parsed.enabled, posId: parsed.posId ?? FBR_CONFIG.posId, url: parsed.url };
        }
      } catch {}
      return { enabled: FBR_CONFIG.enabled, posId: FBR_CONFIG.posId };
    })(),
  });

  // Use a ref to track the user id to avoid re-creating the callback on every user object change
  const userRef = useRef(user);
  userRef.current = user;

  const loadAllSettings = useCallback(async () => {
    const currentUser = userRef.current;
    if (!isAuthenticated || !currentUser) return;
    setIsLoading(true);
    try {
      const promises: Promise<Record<string, unknown>>[] = [
        settingsService.get().catch(() => ({})),
        settingsService.getApp().catch(() => ({})),
      ];

      // Load current user's per-user settings (contains permissions)
      if (currentUser.id) {
        promises.push(settingsService.getUserSettings(currentUser.id).catch(() => ({})));
      }

      const [companyRes, appData, userSettingsData] = await Promise.all(promises);

      const c = (companyRes || {}) as Record<string, unknown>;
      const company: CompanySettings = {
        businessName: (c.businessName as string) ?? DEFAULT_COMPANY.businessName,
        address: (c.address as string) ?? DEFAULT_COMPANY.address,
        phone: (c.phone as string) ?? DEFAULT_COMPANY.phone,
        ntn: (c.ntn as string) ?? DEFAULT_COMPANY.ntn,
        strn: (c.strn as string) ?? DEFAULT_COMPANY.strn,
        currency: (c.currency as string) ?? DEFAULT_COMPANY.currency,
        defaultTaxRate: Number(c.defaultTaxRate ?? 0),
        invoiceNote: (c.invoiceNote as string) ?? DEFAULT_COMPANY.invoiceNote,
      };

      // Parse permissions from user settings (ADMIN always gets full access)
      if (currentUser.role === 'ADMIN') {
        setPermissions(defaultPermissions('ADMIN'));
      } else {
        const parsedPerms = parsePermissions(userSettingsData || {}, currentUser.role);
        setPermissions(parsedPerms);
      }

      setSettings(prev => ({
        ...prev,
        company,
        app: (appData as Record<string, unknown>) ?? {},
        thermal: loadThermalConfig(),
      }));
    } catch (err) {
      console.warn('Failed to load global settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadAllSettings();
    } else if (!isAuthenticated) {
      // Reset permissions on logout
      setPermissions(defaultPermissions());
    }
    // We intentionally use user?.id so the effect fires when the user changes
    // but not on every render (user object reference may differ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, loadAllSettings]);

  const updateCompanySettings = async (data: Partial<CompanySettings>) => {
    await settingsService.update(data);
    await loadAllSettings();
  };

  const updateAppSettings = async (data: Record<string, unknown>) => {
    await settingsService.updateApp(data);
    await loadAllSettings();
  };

  const setThermalConfig = (config: ThermalPrinterConfig) => {
    setSettings(prev => ({ ...prev, thermal: config }));
  };

  const setFbrConfig = (config: FbrSettings) => {
    localStorage.setItem(LS_FBR, JSON.stringify(config));
    setSettings(prev => ({ ...prev, fbr: config }));
  };

  const hasPermission = useCallback((module: PermissionModule, action: 'view' | 'edit' | 'delete'): boolean => {
    // ADMIN always has full access
    if (userRef.current?.role === 'ADMIN') return true;
    return permissions[module]?.[action] ?? false;
  }, [permissions]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        permissions,
        isLoading,
        refreshSettings: loadAllSettings,
        updateCompanySettings,
        updateAppSettings,
        setThermalConfig,
        setFbrConfig,
        hasPermission,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useGlobalSettings must be used within a SettingsProvider');
  }
  return context;
}
