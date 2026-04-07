import { useState } from 'react';
import { Download, Upload, Loader2, CheckCircle2, AlertCircle, Database, Users, ShieldCheck, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { useNavigate } from 'react-router-dom';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StatusMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
    if (!msg) return null;
    return (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${msg.ok ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
            {msg.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {msg.text}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function Admin() {
    const navigate = useNavigate();
    const [dbBusy, setDbBusy] = useState(false);
    const [dbMsg, setDbMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleBackup = async () => {
        setDbBusy(true);
        setDbMsg(null);
        try {
            const blob = await apiClient.getBlob(API_ENDPOINTS.settings.backup);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setDbMsg({ ok: true, text: 'Backup downloaded successfully.' });
        } catch (e: unknown) {
            setDbMsg({ ok: false, text: e instanceof Error ? e.message : 'Backup failed.' });
        } finally {
            setDbBusy(false);
        }
    };

    const handleRestore = async (file: File) => {
        setDbBusy(true);
        setDbMsg(null);
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            await apiClient.post(API_ENDPOINTS.settings.restore, parsed);
            setDbMsg({ ok: true, text: 'Database restored successfully. Please refresh the app.' });
        } catch (e: unknown) {
            setDbMsg({ ok: false, text: e instanceof Error ? e.message : 'Restore failed.' });
        } finally {
            setDbBusy(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-primary-600" /> Admin Panel
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Administrative tools and system management</p>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    onClick={() => navigate('/users')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all text-left group"
                >
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-primary-600 transition-colors">User Management</p>
                        <p className="text-xs text-gray-400 mt-0.5">Add, edit and manage system users</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/settings')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all text-left group"
                >
                    <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-100 dark:border-purple-800">
                        <RefreshCw size={20} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-primary-600 transition-colors">System Settings</p>
                        <p className="text-xs text-gray-400 mt-0.5">Business info, printers and integrations</p>
                    </div>
                </button>
            </div>

            {/* Backup & Restore */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <Database size={15} className="text-primary-500" /> Database Backup &amp; Restore
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Backup */}
                    <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                        <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Backup Database</p>
                            <p className="text-xs text-gray-400 mt-1">Download a full JSON export of all data from the server. Store it in a safe location.</p>
                        </div>
                        <button
                            onClick={handleBackup}
                            disabled={dbBusy}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Download Backup
                        </button>
                    </div>

                    {/* Restore */}
                    <div className="rounded-xl border border-red-100 dark:border-red-900/40 p-4 space-y-3 bg-red-50/50 dark:bg-red-900/10">
                        <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Restore Database</p>
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-medium">⚠ This will permanently overwrite all current data. Make sure you have a recent backup first.</p>
                        </div>
                        <label className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg cursor-pointer w-fit transition-colors">
                            {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            Choose Backup File…
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                disabled={dbBusy}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleRestore(f); e.target.value = ''; }}
                            />
                        </label>
                    </div>
                </div>

                <StatusMsg msg={dbMsg} />
            </div>
        </div>
    );
}
