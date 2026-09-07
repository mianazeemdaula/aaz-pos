import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { settingsService } from '../services/pos.service';
import { loadThermalConfig, ThermalPrinterConfig } from '../utils/thermalPrinter';
import { invalidateReceiptBusiness } from '../utils/invoices/businessProfile';
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

// ─── Per-module permissions ──────────────────────────────────────────────────
// The model lives in ./permissions so it can be tested without pulling in React
// or the API client. Re-exported here so existing imports keep working.
export {
  PERMISSION_MODULES,
  PERMISSION_LABELS,
  defaultPermissions,
  parsePermissions,
  flattenPermissions,
} from './permissions';
export type { PermissionModule, ModulePermission, UserPermissions } from './permissions';

import { defaultPermissions, parsePermissions } from './permissions';
import type { PermissionModule, UserPermissions } from './permissions';

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
    // Receipt headers cache the business profile for the session; drop it so
    // the next slip prints the details that were just saved.
    invalidateReceiptBusiness();
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
