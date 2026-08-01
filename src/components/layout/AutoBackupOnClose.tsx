import { useState, useEffect, useRef } from 'react';
import { Database, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

import { useGlobalSettings } from '../../contexts/SettingsContext';
import { backupService, readAutoBackupSettings, formatBytes } from '../../services/backup.service';
import { isTauri } from '../../utils/tauri';

type Phase =
    | { state: 'idle' }
    | { state: 'running' }
    | { state: 'done'; filename: string; bytes: number }
    | { state: 'failed'; message: string };

/**
 * Backs the database up when the desktop window is closed.
 *
 * Only active when a backup folder has been configured and the option is on.
 * The close is held while pg_dump runs; if it fails the user decides whether to
 * close anyway, so a broken backup never traps them in the app — and never
 * silently lets them leave without one either.
 */
export function AutoBackupOnClose() {
    const { settings } = useGlobalSettings();
    const [phase, setPhase] = useState<Phase>({ state: 'idle' });

    // The close handler is installed once, so it reads settings through a ref
    // rather than closing over the values from first render.
    const configRef = useRef(readAutoBackupSettings(settings.app));
    configRef.current = readAutoBackupSettings(settings.app);

    const runningRef = useRef(false);

    useEffect(() => {
        if (!isTauri()) return;

        let unlisten: (() => void) | undefined;
        let cancelled = false;

        (async () => {
            const { getCurrentWindow } = await import('@tauri-apps/api/window');
            const appWindow = getCurrentWindow();

            const stop = await appWindow.onCloseRequested(async event => {
                const config = configRef.current;
                if (!config.backupDir || !config.backupOnClose) return; // close normally

                // A second click on the X while a backup is running must not
                // start another dump.
                if (runningRef.current) { event.preventDefault(); return; }

                event.preventDefault();
                runningRef.current = true;
                setPhase({ state: 'running' });

                try {
                    // The folder is on this PC, so it has to be passed
                    // explicitly — there is no server-side setting to fall back
                    // on now that the file is written locally.
                    const result = await backupService.run({
                        directory: config.backupDir,
                        format: config.backupFormat,
                        keep: config.backupKeep,
                    });
                    setPhase({ state: 'done', filename: result.filename, bytes: result.bytes });
                    // Let the confirmation land on screen before the window goes.
                    // destroy() is a rejecting promise, not a fire-and-forget: if
                    // it is ever denied the dialog would otherwise sit on "Backup
                    // complete" forever with nothing in the UI to explain it.
                    setTimeout(() => {
                        appWindow.destroy().catch((e: unknown) => {
                            runningRef.current = false;
                            setPhase({
                                state: 'failed',
                                message: `Backup saved, but the window could not be closed: ${
                                    e instanceof Error ? e.message : String(e)
                                }`,
                            });
                        });
                    }, 900);
                } catch (e: unknown) {
                    runningRef.current = false;
                    setPhase({
                        state: 'failed',
                        message: e instanceof Error ? e.message : 'Backup failed',
                    });
                }
            });

            if (cancelled) stop();
            else unlisten = stop;
        })();

        return () => { cancelled = true; unlisten?.(); };
    }, []);

    const closeAnyway = async () => {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        try {
            await getCurrentWindow().destroy();
        } catch (e: unknown) {
            setPhase({
                state: 'failed',
                message: `Could not close the window: ${e instanceof Error ? e.message : String(e)}`,
            });
        }
    };

    if (phase.state === 'idle') return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
                {phase.state === 'running' && (
                    <>
                        <div className="relative mx-auto w-12 h-12 mb-4">
                            <Database size={28} className="absolute inset-0 m-auto text-primary-600" />
                            <Loader2 size={48} className="absolute inset-0 animate-spin text-primary-200 dark:text-primary-900" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Backing up database…</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                            Saving to <span className="font-mono">{configRef.current.backupDir}</span>
                        </p>
                        <p className="text-[11px] text-gray-400 mt-3">The app will close when this finishes.</p>
                    </>
                )}

                {phase.state === 'done' && (
                    <>
                        <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Backup complete</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-mono break-all">
                            {phase.filename} · {formatBytes(phase.bytes)}
                        </p>
                    </>
                )}

                {phase.state === 'failed' && (
                    <>
                        <AlertCircle size={40} className="mx-auto text-red-500 mb-3" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Backup failed</h3>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2 break-words">{phase.message}</p>
                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={() => setPhase({ state: 'idle' })}
                                className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Stay open
                            </button>
                            <button
                                onClick={closeAnyway}
                                className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white"
                            >
                                Close without backup
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
