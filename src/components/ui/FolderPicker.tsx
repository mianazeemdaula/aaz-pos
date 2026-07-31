import { useState, useEffect, useCallback } from 'react';
import { Folder, HardDrive, ChevronUp, Loader2, X, Check, AlertCircle } from 'lucide-react';
import { backupService, type DirectoryListing } from '../../services/backup.service';

interface FolderPickerProps {
    /** Folder the picker opens at. */
    initialPath?: string;
    onSelect: (path: string) => void;
    onClose: () => void;
}

/**
 * Browses the *server's* filesystem — backups are written by pg_dump on the
 * machine running Postgres, so that is the disk the folder has to exist on.
 */
export function FolderPicker({ initialPath, onSelect, onClose }: FolderPickerProps) {
    const [listing, setListing] = useState<DirectoryListing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [manualPath, setManualPath] = useState(initialPath ?? '');

    const load = useCallback(async (path?: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await backupService.browse(path);
            setListing(result);
            if (result.path) setManualPath(result.path);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Could not read that folder');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(initialPath || undefined); }, [load, initialPath]);

    const atRoots = listing !== null && listing.path === '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Select backup folder</h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Folders on the server machine</p>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={16} />
                    </button>
                </div>

                {/* Current path + up */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => load(listing?.parent || undefined)}
                        disabled={loading || atRoots}
                        title="Up one level"
                        className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                    >
                        <ChevronUp size={14} />
                    </button>
                    <input
                        value={manualPath}
                        onChange={e => setManualPath(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') load(manualPath.trim() || undefined); }}
                        placeholder="Type a path, or browse below"
                        className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900/40 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <button
                        onClick={() => load(manualPath.trim() || undefined)}
                        disabled={loading}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Go
                    </button>
                </div>

                {/* Listing */}
                <div className="flex-1 overflow-y-auto min-h-[220px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-gray-400">
                            <Loader2 size={20} className="animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex items-start gap-2 m-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                            <AlertCircle size={14} className="shrink-0 mt-px" /> {error}
                        </div>
                    ) : listing && listing.entries.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-16">No sub-folders here</p>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {listing?.entries.map(entry => (
                                <li key={entry.path}>
                                    <button
                                        onDoubleClick={() => load(entry.path)}
                                        onClick={() => load(entry.path)}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    >
                                        {atRoots ? <HardDrive size={14} className="text-gray-400" /> : <Folder size={14} className="text-primary-500" />}
                                        <span className="truncate">{entry.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-[11px] text-gray-400 truncate">
                        {listing?.path
                            ? listing.writable
                                ? <span className="text-green-600 dark:text-green-400">Writable</span>
                                : <span className="text-amber-600 dark:text-amber-400">Not writable by the server</span>
                            : 'Pick a drive to start'}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button
                            onClick={() => onSelect(manualPath.trim() || listing?.path || '')}
                            disabled={!manualPath.trim() && !listing?.path}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white flex items-center gap-1.5"
                        >
                            <Check size={13} /> Use this folder
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
