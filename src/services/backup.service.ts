/**
 * Database backup service.
 *
 * pg_dump necessarily runs on the server — that is where Postgres lives — but
 * the resulting file is written to **this PC**. The dump is streamed down over
 * `GET /settings/backup` and handed to Rust, which writes it into the chosen
 * folder on the local disk. A till therefore keeps its own copy on its own
 * drive (or a USB stick, or a mapped network share) without anyone needing
 * access to the server's filesystem.
 *
 * The server-side `backup/run` and `backup/browse` endpoints still exist and
 * still target the server's disk; they are simply no longer what the desktop
 * app uses.
 */

import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import { isTauri } from '../utils/tauri';

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

    /**
     * Run a backup, writing the file to the configured folder on **this PC**.
     *
     * pg_dump still runs server-side; the dump is streamed back and written
     * locally. Long timeout — a large database takes a while to dump.
     */
    run: async (options?: {
        directory?: string;
        format?: BackupFormat;
        keep?: number;
    }): Promise<BackupRunResult> => {
        const settings = options ?? {};
        const directory = settings.directory?.trim();
        if (!directory) throw new Error('No backup folder is configured on this PC.');
        if (!isTauri()) {
            throw new Error('Local backups are only available in the desktop app.');
        }

        const format: BackupFormat = settings.format === 'plain' ? 'plain' : 'custom';
        const { blob, filename } = await apiClient.downloadFile(
            API_ENDPOINTS.settings.backup,
            { params: { format }, timeout: 15 * 60 * 1000 },
        );

        if (blob.size === 0) throw new Error('The server returned an empty backup.');

        const { invoke } = await import('@tauri-apps/api/core');
        return invoke<BackupRunResult>('save_backup', {
            dir: directory,
            filename: filename || defaultBackupFilename(format),
            dataBase64: await blobToBase64(blob),
            keep: Number.isFinite(settings.keep) ? Math.max(0, Number(settings.keep)) : 0,
        });
    },

    /** Open a native folder picker on this PC. `null` when cancelled. */
    pickDirectory: async (): Promise<string | null> => {
        const { invoke } = await import('@tauri-apps/api/core');
        return (await invoke<string | null>('pick_backup_dir')) ?? null;
    },

    /** Create the folder if needed and confirm it is writable. */
    validateLocalDir: async (directory: string): Promise<string> => {
        const { invoke } = await import('@tauri-apps/api/core');
        return invoke<string>('validate_backup_dir', { dir: directory });
    },

    /** Newest backup already sitting in the local folder. */
    latestLocal: async (directory: string): Promise<LastBackup | null> => {
        if (!directory || !isTauri()) return null;
        const { invoke } = await import('@tauri-apps/api/core');
        return (await invoke<LastBackup | null>('latest_local_backup', { dir: directory })) ?? null;
    },
};

/** Fallback when the server omits Content-Disposition. */
function defaultBackupFilename(format: BackupFormat): string {
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    return `pos-backup-${stamp}.${format === 'custom' ? 'dump' : 'sql'}`;
}

/**
 * Base64-encode a Blob for the Rust bridge.
 *
 * Chunked rather than `String.fromCharCode(...bytes)`: spreading a multi-megabyte
 * array blows the argument limit and throws.
 */
async function blobToBase64(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}

export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};
