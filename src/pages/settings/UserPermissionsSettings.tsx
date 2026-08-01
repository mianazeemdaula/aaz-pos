import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Users, ShieldCheck, CheckCircle2, AlertCircle, Save, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  PERMISSION_MODULES, PERMISSION_LABELS, defaultPermissions, parsePermissions, flattenPermissions
} from '../../contexts/SettingsContext';
import type { UserPermissions } from '../../contexts/SettingsContext';
import { userService, settingsService } from '../../services/pos.service';
import type { User } from '../../types/pos';
import { SettingsHeader } from './SettingsHeader';

export function UserPermissionsSettings() {
  const { user } = useAuth();

  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(defaultPermissions());
  const [permSaving, setPermSaving] = useState(false);

  const loadUsersAndPermissions = useCallback(async () => {
    setUsersLoading(true);
    try {
      const usersRes = await userService.list({ pageSize: 200 });
      const list = usersRes.data ?? [];
      setUsers(list);
      const firstId = selectedUserId ?? (list.length > 0 ? list[0].id : null);
      if (firstId && firstId !== selectedUserId) {
        setSelectedUserId(firstId);
      }
      if (firstId) {
        const userSettings = await settingsService.getUserSettings(firstId).catch(() => ({}));
        const selectedUser = list.find(u => u.id === firstId);
        setUserPermissions(parsePermissions(userSettings, selectedUser?.role));
      }
    } catch {
    } finally {
      setUsersLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadUsersAndPermissions();
  }, [loadUsersAndPermissions]);

  if (user?.role !== 'ADMIN') {
    return (
      <div>
        <SettingsHeader />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 max-w-xl mx-auto my-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Administrator Access Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You are currently signed in as <strong className="text-gray-800 dark:text-gray-200">{user?.name}</strong> ({user?.role}). System and global configuration settings require Administrator access rights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SettingsHeader />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="text-primary-600" size={18} /> User Access & Module Permissions
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure which modules each user can view, edit, or delete records in. Admin users always have full access.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select User Account:</label>
            <select
              value={selectedUserId ?? ''}
              onChange={async (e) => {
                const uid = Number(e.target.value);
                setSelectedUserId(uid);
                try {
                  const userSettings = await settingsService.getUserSettings(uid).catch(() => ({}));
                  const selectedUser = users.find(u => u.id === uid);
                  setUserPermissions(parsePermissions(userSettings, selectedUser?.role));
                } catch {
                  const selectedUser = users.find(u => u.id === uid);
                  setUserPermissions(defaultPermissions(selectedUser?.role));
                }
              }}
              className="px-3.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.username} — {u.role})</option>
              ))}
            </select>
          </div>

          {/* ADMIN notice */}
          {users.find(u => u.id === selectedUserId)?.role === 'ADMIN' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-xs">
              <ShieldCheck size={14} />
              <span>Admin users always have full access to all modules. Permission changes below will not affect admin accounts.</span>
            </div>
          )}

          {usersLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
          ) : (
            <>
              <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Module</th>
                      <th className="px-4 py-3 text-center">Can View</th>
                      <th className="px-4 py-3 text-center">Can Edit</th>
                      <th className="px-4 py-3 text-center">Can Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {PERMISSION_MODULES.map(mod => {
                      const isAdminUser = users.find(u => u.id === selectedUserId)?.role === 'ADMIN';
                      return (
                        <tr key={mod} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{PERMISSION_LABELS[mod]}</td>
                          {(['view', 'edit', 'delete'] as const).map(action => (
                            <td key={action} className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={isAdminUser ? true : userPermissions[mod]?.[action] ?? false}
                                disabled={isAdminUser}
                                onChange={(e) => {
                                  setUserPermissions(prev => ({
                                    ...prev,
                                    [mod]: {
                                      ...prev[mod],
                                      [action]: e.target.checked,
                                      ...(action === 'view' && !e.target.checked ? { edit: false, delete: false } : {}),
                                      ...(action !== 'view' && e.target.checked ? { view: true } : {}),
                                    },
                                  }));
                                }}
                                className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 disabled:opacity-40"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Status Notification */}
              {statusMsg && (
                <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                  statusMsg.ok
                    ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                }`}>
                  {statusMsg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* Save Permissions Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={permSaving || users.find(u => u.id === selectedUserId)?.role === 'ADMIN'}
                  onClick={async () => {
                    if (!selectedUserId) return;
                    setPermSaving(true);
                    setStatusMsg(null);
                    try {
                      const flat = flattenPermissions(userPermissions);
                      await settingsService.updateUserSettings(selectedUserId, flat);
                      setStatusMsg({ ok: true, text: `Permissions saved for ${users.find(u => u.id === selectedUserId)?.name ?? 'user'}.` });
                    } catch (err) {
                      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save permissions.' });
                    } finally {
                      setPermSaving(false);
                    }
                  }}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                  {permSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Save Permissions</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
