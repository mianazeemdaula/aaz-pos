/**
 * The permission model, kept free of React and of the API client so it can be
 * unit tested on its own — and so it stays a plain contract with the server,
 * which enforces the same modules, defaults and storage keys
 * (aaz-pos-backend/src/services/auth).
 */

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
