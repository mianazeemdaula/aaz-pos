import { Navigate } from 'react-router-dom';
import { useGlobalSettings } from '../../contexts';
import type { PermissionModule } from '../../contexts';
import { PERMISSION_LABELS } from '../../contexts';
import { ShieldAlert } from 'lucide-react';

interface PermissionGuardProps {
  /** The module permission required (e.g. 'sales', 'inventory') */
  module: PermissionModule;
  /** The action required — defaults to 'view' */
  action?: 'view' | 'edit' | 'delete';
  /** What to render when permission is denied. Defaults to an "Access Denied" card. */
  fallback?: 'redirect' | 'block';
  children: React.ReactNode;
}

/**
 * Wraps a page/component and only renders children if the logged-in user
 * has the required permission.  Otherwise shows an access-denied card
 * or redirects to dashboard.
 */
export function PermissionGuard({
  module,
  action = 'view',
  fallback = 'block',
  children,
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = useGlobalSettings();

  // While settings are still loading, show nothing to avoid flash
  if (isLoading) return null;

  if (hasPermission(module, action)) {
    return <>{children}</>;
  }

  if (fallback === 'redirect') {
    return <Navigate to="/dashboard" replace />;
  }

  // Block mode: show an access-denied card
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 max-w-lg mx-auto my-16 text-center space-y-4 shadow-sm">
      <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
        <ShieldAlert size={28} />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
        Access Restricted
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        You don't have permission to {action} the <strong className="text-gray-700 dark:text-gray-200">{PERMISSION_LABELS[module]}</strong> module. Please contact your administrator to request access.
      </p>
      <a
        href="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Go to Dashboard
      </a>
    </div>
  );
}
