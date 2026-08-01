import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings } from '../../contexts/SettingsContext';
import type { PermissionModule } from '../../contexts/SettingsContext';

/**
 * Maps a URL pathname to the PermissionModule it belongs to.
 * Returns undefined for paths that don't need a module permission check
 * (e.g. the dashboard is always accessible to authenticated users via sidebar filtering).
 */
const ROUTE_PERMISSION_MAP: Record<string, PermissionModule> = {
  // Quick Actions
  '/sale':              'sales',
  '/purchase':          'purchases',
  '/advance-bookings':  'advance-bookings',

  // History
  '/held':              'held',
  '/sale/returns':      'sale-history',
  '/purchase/returns':  'purchase-history',
  '/returns':           'returns',
  '/payments':          'payments',

  // Inventory
  '/products':          'products',
  '/print-labels':      'print-labels',
  '/categories':        'categories',
  '/brands':            'brands',
  '/stock-adjustments': 'stock-adjustments',

  // Parties
  '/customers':         'customers',
  '/customer-payments': 'customers',
  '/suppliers':         'suppliers',
  '/supplier-payments': 'suppliers',

  // HR & Finance
  '/employees':         'employees',
  '/salary-slips':      'salary-slips',
  '/expenses':          'expenses',
  '/accounts':          'accounts',
  '/promotions':        'promotions',

  // Admin
  '/reports':           'reports',
  '/users':             'users',
  '/settings':          'settings',
};

/**
 * Resolve a pathname like `/products/123/edit` or `/customers/5` to its
 * base route key in ROUTE_PERMISSION_MAP.  Tries exact match first, then
 * progressively strips trailing segments.
 */
function resolvePermission(pathname: string): PermissionModule | undefined {
  // Printer & FBR settings are accessible to all authenticated user roles
  if (pathname === '/settings/thermal' || pathname === '/settings/fbr') {
    return undefined;
  }

  // 1. Exact match
  if (ROUTE_PERMISSION_MAP[pathname]) return ROUTE_PERMISSION_MAP[pathname];

  // 2. Walk up the path segments: /products/123/edit → /products/123 → /products
  const segments = pathname.split('/').filter(Boolean);
  while (segments.length > 0) {
    const candidate = '/' + segments.join('/');
    if (ROUTE_PERMISSION_MAP[candidate]) return ROUTE_PERMISSION_MAP[candidate];
    segments.pop();
  }

  return undefined; // No matching permission (e.g. /dashboard — always allowed)
}

export function ProtectedRoute() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasPermission, isLoading: settingsLoading } = useGlobalSettings();
  const location = useLocation();

  // Show spinner while auth or settings are loading
  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Determine which module this route requires
  const requiredModule = resolvePermission(location.pathname);

  // If the route maps to a module, check permission
  if (requiredModule && !hasPermission(requiredModule, 'view')) {
    // Find the first module the user CAN access and redirect there
    const fallbackPath = user?.role === 'CASHIER' ? '/sale' : '/dashboard';
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
