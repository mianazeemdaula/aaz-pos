import { Link, useLocation } from 'react-router-dom';
import {
  Building2, Printer, ShieldCheck, ShoppingCart, Database, Users, KeyRound
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const TABS = [
  { path: '/settings/company', label: 'Business Profile', icon: Building2 },
  { path: '/settings/thermal', label: 'Thermal Printer', icon: Printer },
  { path: '/settings/fbr', label: 'FBR Fiscal Gateway', icon: ShieldCheck },
  { path: '/settings/sales', label: 'Sales & Inventory Rules', icon: ShoppingCart },
  { path: '/settings/database', label: 'Database Backup', icon: Database },
  { path: '/settings/user-permissions', label: 'User Permissions', icon: Users },
];

export function SettingsHeader() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="space-y-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Settings & Global Configuration
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure system business details, thermal printer routing, FBR fiscal integration, and operational rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 rounded-full text-xs font-semibold">
            <KeyRound size={13} /> {user?.role === 'ADMIN' ? 'Admin Access Granted' : `${user?.role || 'User'} Access`}
          </span>
        </div>
      </div>

      <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map(tab => {
          const active = location.pathname === tab.path || (tab.path === '/settings/company' && location.pathname === '/settings');
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
