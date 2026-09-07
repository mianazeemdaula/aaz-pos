import { describe, it, expect } from 'vitest';

import {
  PERMISSION_MODULES,
  PERMISSION_LABELS,
  defaultPermissions,
  parsePermissions,
  flattenPermissions,
  type PermissionModule,
  type UserPermissions,
} from '../permissions';

/**
 * The client's permission model is a contract with the API — the server now
 * enforces the same modules, the same defaults and the same
 * `perm.<module>.<action>` storage keys (see
 * aaz-pos-backend/src/services/auth). These tests pin the client half so the
 * two cannot drift apart and start disagreeing about who may do what.
 */

const ACTIONS = ['view', 'edit', 'delete'] as const;

/** The module list the API guards. Keep in step with permission-modules.ts. */
const EXPECTED_MODULES: PermissionModule[] = [
  'dashboard', 'sales', 'purchases', 'advance-bookings',
  'held', 'sale-history', 'purchase-history', 'returns', 'payments',
  'products', 'print-labels', 'categories', 'brands', 'stock-adjustments',
  'customers', 'suppliers',
  'employees', 'salary-slips', 'expenses', 'accounts', 'promotions',
  'reports', 'users', 'settings',
];

describe('permission vocabulary matches the API', () => {
  it('lists exactly the modules the server enforces, in the same order', () => {
    expect([...PERMISSION_MODULES]).toEqual(EXPECTED_MODULES);
  });

  it('gives every module a label for the admin screen', () => {
    for (const module of PERMISSION_MODULES) {
      expect(PERMISSION_LABELS[module], `missing label for ${module}`).toBeTruthy();
    }
  });
});

describe('role defaults match the API', () => {
  it('gives an administrator everything', () => {
    const perms = defaultPermissions('ADMIN');
    for (const module of PERMISSION_MODULES) {
      for (const action of ACTIONS) {
        expect(perms[module][action], `admin ${action} ${module}`).toBe(true);
      }
    }
  });

  it('gives a new cashier the till and their own history, nothing else', () => {
    const perms = defaultPermissions('CASHIER');

    expect(perms['sales']).toEqual({ view: true, edit: true, delete: false });
    expect(perms['dashboard']).toEqual({ view: true, edit: false, delete: false });
    expect(perms['sale-history']).toEqual({ view: true, edit: false, delete: false });
    expect(perms['held']).toEqual({ view: true, edit: false, delete: false });
    expect(perms['payments']).toEqual({ view: true, edit: false, delete: false });

    expect(perms['users']).toEqual({ view: false, edit: false, delete: false });
    expect(perms['settings']).toEqual({ view: false, edit: false, delete: false });
    expect(perms['reports']).toEqual({ view: false, edit: false, delete: false });
    expect(perms['products']).toEqual({ view: false, edit: false, delete: false });
    expect(perms['customers']).toEqual({ view: false, edit: false, delete: false });
  });

  it('never grants delete by default to a non-admin', () => {
    for (const role of ['MANAGER', 'CASHIER', 'DELIVERY_BOY', 'WORKER']) {
      const perms = defaultPermissions(role);
      for (const module of PERMISSION_MODULES) {
        expect(perms[module].delete, `${role} delete ${module}`).toBe(false);
      }
    }
  });

  it('treats an unknown or missing role as a non-admin', () => {
    expect(defaultPermissions(undefined)['users'].view).toBe(false);
    expect(defaultPermissions('admin')['users'].view).toBe(false);
    expect(defaultPermissions('OWNER')['users'].view).toBe(false);
  });
});

describe('reading saved settings matches the API', () => {
  it('falls back to the role default when nothing was ever configured', () => {
    expect(parsePermissions({}, 'CASHIER')).toEqual(defaultPermissions('CASHIER'));
  });

  it('ignores unrelated user settings when deciding whether anything is configured', () => {
    expect(parsePermissions({ 'printer.name': 'TM-T20' }, 'CASHIER')).toEqual(
      defaultPermissions('CASHIER')
    );
  });

  it('treats a saved set as authoritative and denies anything absent from it', () => {
    const perms = parsePermissions({ 'perm.products.view': 'true' }, 'CASHIER');
    expect(perms['products'].view).toBe(true);
    expect(perms['products'].edit).toBe(false);
    // A cashier default, but an explicit set overrides defaults entirely.
    expect(perms['sales'].edit).toBe(false);
  });

  it('reads both boolean and string values', () => {
    const perms = parsePermissions(
      {
        'perm.customers.view': true,
        'perm.customers.edit': 'true',
        'perm.customers.delete': 'false',
      },
      'CASHIER'
    );
    expect(perms['customers']).toEqual({ view: true, edit: true, delete: false });
  });

  it('denies anything that is not an explicit true', () => {
    for (const value of ['', '0', 'yes', 1, null, undefined]) {
      const perms = parsePermissions(
        { 'perm.users.view': value, 'perm.users.edit': 'true' },
        'CASHIER'
      );
      expect(perms['users'].view, `value ${String(value)}`).toBe(false);
    }
  });
});

describe('the storage format matches the API', () => {
  it('writes one perm.<module>.<action> key per cell', () => {
    const flat = flattenPermissions(defaultPermissions('CASHIER'));
    expect(Object.keys(flat)).toHaveLength(PERMISSION_MODULES.length * ACTIONS.length);
    expect(flat['perm.sales.edit']).toBe(true);
    expect(flat['perm.users.delete']).toBe(false);
    expect(flat['perm.sale-history.view']).toBe(true);
  });

  it('round-trips a configured set unchanged', () => {
    const original: UserPermissions = defaultPermissions('CASHIER');
    original['products'] = { view: true, edit: true, delete: false };
    original['reports'] = { view: true, edit: false, delete: false };

    expect(parsePermissions(flattenPermissions(original), 'CASHIER')).toEqual(original);
  });
});
