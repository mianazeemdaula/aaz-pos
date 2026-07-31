import { Outlet } from 'react-router-dom';
import { X, KeyRound, Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { AutoBackupOnClose } from './AutoBackupOnClose';
import { TopNav } from './TopNav';

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setShowCurrent(false); setShowNew(false); setError(''); setSuccess(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('New passwords do not match'); return; }
    setLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.auth.changePassword, { currentPassword, newPassword });
      setSuccess(true);
      setTimeout(handleClose, 1500);
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-750 w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary-600" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Change Password</h3>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
        </div>

        {success ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-700/15 border border-green-100 dark:border-green-700/30 text-green-700 dark:text-green-500 rounded-md text-sm">
            <Check size={16} /> Password changed successfully
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-600/15 border border-red-100 dark:border-red-600/30 text-red-700 dark:text-red-500 rounded-md text-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                  className="w-full px-3 py-2 pr-9 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                  className="w-full px-3 py-2 pr-9 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleClose} className="flex-1 py-2 text-xs font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-md transition disabled:opacity-50">
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function MainLayout() {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      <TopNav onChangePassword={() => setChangePasswordOpen(true)} />

      {/* The workspace takes the whole window width now that the sidebar is gone. */}
      <main className="flex-1 w-full px-4 py-4 lg:px-5 lg:py-4">
        <Outlet />
      </main>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
      {/* Lives inside the authenticated shell — the backup API needs a session. */}
      <AutoBackupOnClose />
    </div>
  );
}
