/**
 * Database backup service.
 *
 * Backups are produced by pg_dump on the server, so the folder being browsed
 * and written to is the server's filesystem — which is the machine Postgres
 * actually runs on.
 */

import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';

export type BackupFormat = 'custom' | 'plain';

export interface LastBackup {
    filename: string;
    bytes: number;
    at: string;
}

export interface BackupStatus {
    available: boolean;
    database?: string;
    host?: string;
    pgDump?: string;
    pgRestore?: string;
    error?: string;
    backupDir?: string;
    lastBackup?: LastBackup | null;
}

export interface DirectoryEntry {
    name: string;
    path: string;
}

export interface DirectoryListing {
    path: string;
    parent: string | null;
    writable: boolean;
    entries: DirectoryEntry[];
}

export interface BackupRunResult {
    filePath: string;
    filename: string;
    bytes: number;
    removed: string[];
}

/** Settings that drive automatic backups, stored server-side with the app settings. */
export interface AutoBackupSettings {
    backupDir: string;
    backupOnClose: boolean;
    backupFormat: BackupFormat;
    backupKeep: number;
}

export const DEFAULT_AUTO_BACKUP: AutoBackupSettings = {
    backupDir: '',
    backupOnClose: true,
    backupFormat: 'custom',
    backupKeep: 30,
};

/** Pull the auto-backup settings out of the loosely-typed app settings map. */
export function readAutoBackupSettings(app: Record<string, unknown>): AutoBackupSettings {
    const keep = Number(app.backupKeep);
    return {
        backupDir: typeof app.backupDir === 'string' ? app.backupDir : '',
        backupOnClose: app.backupOnClose === undefined ? true : Boolean(app.backupOnClose),
        backupFormat: app.backupFormat === 'plain' ? 'plain' : 'custom',
        backupKeep: Number.isFinite(keep) && keep > 0 ? keep : DEFAULT_AUTO_BACKUP.backupKeep,
    };
}

export const backupService = {
    status: () => apiClient.get<BackupStatus>(API_ENDPOINTS.settings.backupStatus),

    browse: (path?: string) =>
        apiClient.get<DirectoryListing>(API_ENDPOINTS.settings.backupBrowse, {
            params: path ? { path } : undefined,
        }),

    validateDir: (directory: string) =>
        apiClient.post<{ ok: boolean; path: string; lastBackup: LastBackup | null }>(
            API_ENDPOINTS.settings.backupValidateDir, { directory },
        ),

    /** Run a backup into the configured folder. Long timeout — pg_dump can take a while. */
    run: (options?: { directory?: string; format?: BackupFormat; keep?: number }) =>
        apiClient.post<BackupRunResult>(API_ENDPOINTS.settings.backupRun, options ?? {}, {
            timeout: 15 * 60 * 1000,
        }),
};

export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};
