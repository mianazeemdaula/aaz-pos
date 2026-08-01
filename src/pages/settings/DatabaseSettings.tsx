import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Database, Download, Upload, CheckCircle2,
  AlertCircle, Trash2, FolderOpen, FolderClock, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings } from '../../contexts/SettingsContext';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import {
  backupService, readAutoBackupSettings, formatBytes, DEFAULT_AUTO_BACKUP,
  type BackupStatus, type AutoBackupSettings,
} from '../../services/backup.service';
import { FolderPicker } from '../../components/ui/FolderPicker';
import { SettingsHeader } from './SettingsHeader';

const inputCls = 'w-full px-3.5 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50';
const labelCls = 'block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider';

export function DatabaseSettings() {
  const { user } = useAuth();
  const { settings: globalSettings, refreshSettings, updateAppSettings } = useGlobalSettings();

  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dbBusy, setDbBusy] = useState(false);
  const [pgStatus, setPgStatus] = useState<BackupStatus | null>(null);
  const [autoBackup, setAutoBackup] = useState<AutoBackupSettings>(DEFAULT_AUTO_BACKUP);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  useEffect(() => {
    setAutoBackup(readAutoBackupSettings(globalSettings.app));
  }, [globalSettings.app]);

  const loadPgStatus = useCallback(async () => {
    try {
      const st = await backupService.status();
      setPgStatus(st);
    } catch {
      setPgStatus(null);
    }
  }, []);

  useEffect(() => {
    loadPgStatus();
  }, [loadPgStatus]);

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

  const saveAutoBackup = async (patch: Partial<AutoBackupSettings>) => {
    const next = { ...autoBackup, ...patch };
    setAutoBackup(next);
    try {
      await updateAppSettings({
        backupDir: next.backupDir,
        backupFormat: next.backupFormat,
        backupKeep: next.backupKeep,
        backupOnClose: next.backupOnClose,
      });
      await refreshSettings();
      if (next.backupDir) {
        await backupService.validateDir(next.backupDir);
      }
      await loadPgStatus();
      setStatusMsg({ ok: true, text: 'Automatic backup configuration updated.' });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save auto backup settings.' });
    }
  };

  const runFolderBackup = async () => {
    if (!autoBackup.backupDir) return;
    setDbBusy(true);
    setStatusMsg(null);
    try {
      const res = await backupService.run({
        directory: autoBackup.backupDir,
        format: autoBackup.backupFormat,
        keep: autoBackup.backupKeep,
      });
      await loadPgStatus();
      setStatusMsg({ ok: true, text: `Backup saved: ${res.filename} (${formatBytes(res.bytes)})` });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Backup failed.' });
    } finally {
      setDbBusy(false);
    }
  };

  const handleBackup = async (format: 'custom' | 'plain') => {
    setDbBusy(true);
    setStatusMsg(null);
    try {
      const res = await apiClient.downloadFile(API_ENDPOINTS.settings.backup, {
        params: { format },
        timeout: 15 * 60 * 1000,
      });
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || `pos-backup.${format === 'custom' ? 'dump' : 'sql'}`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMsg({ ok: true, text: `Database backup downloaded (${format === 'custom' ? '.dump' : '.sql'}).` });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to generate backup download.' });
    } finally {
      setDbBusy(false);
    }
  };

  const handleRestore = async (file: File) => {
    if (!window.confirm(`RESTORE DATABASE FROM "${file.name}"?\n\nWARNING: All current database records will be erased and replaced with this backup. Continue?`)) {
      return;
    }
    setDbBusy(true);
    setStatusMsg(null);
    try {
      const result = await apiClient.uploadFile<{ message: string }>(API_ENDPOINTS.settings.restore, file, 'backup');
      await refreshSettings();
      await loadPgStatus();
      setStatusMsg({ ok: true, text: result.message || 'Database restored successfully.' });
    } catch (err) {
      setStatusMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to restore database.' });
    } finally {
      setDbBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsHeader />

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Database className="text-primary-600" size={18} /> Database Backup & Maintenance
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Native PostgreSQL backups created with pg_dump — restorable with standard Postgres tools.
          </p>
        </div>

        {/* Server-side tool availability */}
        {pgStatus && (
          pgStatus.available ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-300">
              <span className="flex items-center gap-1.5 font-semibold"><CheckCircle2 size={13} /> Postgres tools ready</span>
              <span className="font-mono">{pgStatus.database} @ {pgStatus.host}</span>
              <span className="text-green-600/70 dark:text-green-400/70">{pgStatus.pgDump}</span>
            </div>
          ) : (
            <div className="px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <span className="flex items-center gap-1.5 font-semibold"><AlertCircle size={13} /> Native backups unavailable</span>
              <p className="mt-1 leading-relaxed">{pgStatus.error}</p>
              <p className="mt-1 text-amber-700/80 dark:text-amber-400/80">
                Install the PostgreSQL client tools on the server machine, or set <code className="font-mono">PG_BIN_DIR</code> in
                the server <code className="font-mono">.env</code> to the folder containing <code className="font-mono">pg_dump</code>.
              </p>
            </div>
          )
        )}

        {/* Automatic backups to a folder */}
        <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FolderClock size={15} className="text-primary-600" /> Automatic Backups
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Pick a folder on the server machine and the database is backed up there automatically every time
              the app is closed.
            </p>
          </div>

          <div>
            <label className={labelCls}>Backup folder</label>
            <div className="flex flex-wrap gap-2">
              <input
                value={autoBackup.backupDir}
                onChange={e => setAutoBackup(a => ({ ...a, backupDir: e.target.value }))}
                onBlur={e => {
                  const value = e.target.value.trim();
                  if (value && value !== readAutoBackupSettings(globalSettings.app).backupDir) {
                    saveAutoBackup({ backupDir: value });
                  }
                }}
                placeholder="No folder selected — automatic backups are off"
                className={`${inputCls} flex-1 min-w-[240px] font-mono text-xs`}
              />
              <button
                type="button"
                onClick={() => setFolderPickerOpen(true)}
                disabled={dbBusy}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <FolderOpen size={14} /> Browse…
              </button>
              {autoBackup.backupDir && (
                <button
                  type="button"
                  onClick={() => saveAutoBackup({ backupDir: '' })}
                  disabled={dbBusy}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 rounded-lg text-xs disabled:opacity-50"
                  title="Clear folder and disable automatic backups"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {autoBackup.backupDir && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBackup.backupOnClose}
                    onChange={e => saveAutoBackup({ backupOnClose: e.target.checked })}
                    disabled={dbBusy}
                    className="mt-0.5 rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span>
                    <span className="block text-xs font-semibold text-gray-800 dark:text-gray-200">Back up on app close</span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">Runs before the window closes</span>
                  </span>
                </label>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">Format</label>
                  <select
                    value={autoBackup.backupFormat}
                    onChange={e => saveAutoBackup({ backupFormat: e.target.value as 'custom' | 'plain' })}
                    disabled={dbBusy}
                    className={`${inputCls} text-xs py-1.5`}
                  >
                    <option value="custom">Compressed archive (.dump)</option>
                    <option value="plain">SQL script (.sql)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">Keep last</label>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={autoBackup.backupKeep}
                    onChange={e => setAutoBackup(a => ({ ...a, backupKeep: Math.max(1, parseInt(e.target.value) || 1) }))}
                    onBlur={() => saveAutoBackup({ backupKeep: autoBackup.backupKeep })}
                    disabled={dbBusy}
                    className={`${inputCls} text-xs py-1.5`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {pgStatus?.lastBackup
                    ? <>Last backup: <span className="font-mono">{pgStatus.lastBackup.filename}</span>{' '}
                      ({formatBytes(pgStatus.lastBackup.bytes)}) · {new Date(pgStatus.lastBackup.at).toLocaleString()}</>
                    : 'No backups in this folder yet.'}
                </p>
                <button
                  type="button"
                  onClick={runFolderBackup}
                  disabled={dbBusy || pgStatus?.available === false}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-sm"
                >
                  {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} Back up now
                </button>
              </div>

              <p className="text-[11px] text-gray-400">
                Older backups beyond the retention count are deleted automatically. Only files named
                <code className="font-mono"> pos-backup-*.dump/.sql </code> are ever removed.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-3">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Download Database Backup</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                A complete <code className="font-mono">pg_dump</code> of the live database — schema, data, indexes and
                constraints. Restorable on any PostgreSQL server, with or without this application.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleBackup('custom')}
                disabled={dbBusy || pgStatus?.available === false}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-sm transition-colors"
              >
                {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Backup (.dump)
              </button>
              <button
                type="button"
                onClick={() => handleBackup('plain')}
                disabled={dbBusy || pgStatus?.available === false}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-200 font-semibold rounded-lg text-xs flex items-center gap-2 transition-colors"
              >
                <Download size={14} /> SQL script (.sql)
              </button>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              <code className="font-mono">.dump</code> is compressed — restore with{' '}
              <code className="font-mono">pg_restore --clean --if-exists -d dbname file.dump</code>.<br />
              <code className="font-mono">.sql</code> is plain text — restore with{' '}
              <code className="font-mono">psql -d dbname -f file.sql</code>.
            </p>
          </div>

          <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-3">
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Restore Database</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Upload a <code className="font-mono">.dump</code> or <code className="font-mono">.sql</code> backup — the format
                is detected automatically. <span className="text-red-500 font-medium">Every existing table is dropped and
                replaced.</span>
              </p>
            </div>
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs shadow-sm transition-colors ${dbBusy ? 'opacity-50 pointer-events-none' : ''}`}>
              {dbBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Restore from File
              <input
                type="file"
                accept=".dump,.sql,.backup,.json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleRestore(file);
                }}
                disabled={dbBusy}
              />
            </label>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              The restore runs in a single transaction — if it fails partway, the current database is left untouched.
              Legacy <code className="font-mono">.json</code> backups are still accepted.
            </p>
          </div>
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
      </div>

      {folderPickerOpen && (
        <FolderPicker
          initialPath={autoBackup.backupDir || undefined}
          onClose={() => setFolderPickerOpen(false)}
          onSelect={dir => {
            setFolderPickerOpen(false);
            if (dir) saveAutoBackup({ backupDir: dir });
          }}
        />
      )}
    </div>
  );
}
