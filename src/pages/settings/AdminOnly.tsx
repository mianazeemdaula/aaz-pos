import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsHeader } from './SettingsHeader';

/**
 * Shown in place of a settings tab the signed-in user may not configure.
 *
 * Four tabs were each carrying their own copy of this card, which is how they
 * drifted to four slightly different sizes. It is only a courtesy message —
 * the API refuses these requests regardless of what the screen shows.
 */
export function AdminOnly() {
  const { user } = useAuth();

  return (
    <div>
      <SettingsHeader />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 max-w-md mx-auto my-6 text-center space-y-2 shadow-sm">
        <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={18} />
        </div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Administrator access required
        </h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
          Signed in as <strong className="text-gray-700 dark:text-gray-300">{user?.name}</strong> (
          {user?.role}). Global configuration is limited to administrators.
        </p>
      </div>
    </div>
  );
}
