/**
 * Raw ZPL transport.
 *
 * ZPL has to reach the printer byte-for-byte, so it goes through the Rust
 * `print_raw` command rather than the ESC/POS plugin. Printer discovery reuses
 * the thermal-printer plugin's enumeration.
 */

import { listPrinters, type PrinterInfo } from '../thermalPrinter';

export type { PrinterInfo };

export type ZplTarget =
    | { kind: 'system'; name: string }
    | { kind: 'tcp'; host: string; port?: number }
    | { kind: 'serial'; port: string; baud?: number };

const ZPL_SETTINGS_KEY = 'zpl_label_settings';

/** Running inside the Tauri shell (as opposed to a plain browser dev server). */
export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Printers whose name suggests they speak ZPL. */
export function isLikelyZplPrinter(name: string): boolean {
    return /zebra|zpl|godex|tsc|argox|honeywell|datamax|intermec|sato|xprinter|label/i.test(name);
}

export async function listLabelPrinters(): Promise<PrinterInfo[]> {
    return listPrinters();
}

/** Send ZPL to the printer verbatim. Resolves with a short status message. */
export async function sendZpl(target: ZplTarget, zpl: string): Promise<string> {
    if (!isTauri()) {
        throw new Error('Direct printing is only available in the desktop app. Use Download .zpl instead.');
    }
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string>('print_raw', { target, data: zpl });
}

/** Save the ZPL batch to a file the user can drop on a printer share. */
export function downloadZpl(zpl: string, filename = 'labels.zpl'): void {
    const blob = new Blob([zpl], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export async function copyZpl(zpl: string): Promise<void> {
    await navigator.clipboard.writeText(zpl);
}

export function loadZplSettings<T>(fallback: T): T {
    try {
        const raw = localStorage.getItem(ZPL_SETTINGS_KEY);
        return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
        return fallback;
    }
}

export function saveZplSettings(settings: unknown): void {
    try {
        localStorage.setItem(ZPL_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        /* storage unavailable — settings just won't persist */
    }
}
