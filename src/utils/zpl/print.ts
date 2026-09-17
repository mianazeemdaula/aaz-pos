/**
 * Raw ZPL transport.
 *
 * ZPL has to reach the printer byte-for-byte, so it goes through the Rust
 * `print_raw` command rather than the ESC/POS plugin. Printer discovery reuses
 * the thermal-printer plugin's enumeration.
 */

import { listPrinters, type PrinterInfo } from '../thermalPrinter';
import { isTauri } from '../tauri';

export type { PrinterInfo };
export { isTauri };

export type ZplTarget =
    | { kind: 'system'; name: string }
    | { kind: 'tcp'; host: string; port?: number }
    | { kind: 'serial'; port: string; baud?: number };

const ZPL_SETTINGS_KEY = 'zpl_label_settings';

export type LabelTarget = ZplTarget;

/** Detect if a printer is likely a Speed-X / TSC label printer. */
export function isLikelySpeedXPrinter(name: string): boolean {
    return /speed[-_\s]?x|sp[-_\s]?(?:700|710|690|650|600|200|300|90)|spt[-_\s]?710|tsc|gprinter|xprinter/i.test(name);
}

/** Detect if a printer is likely a Zebra label printer. */
export function isLikelyZebraPrinter(name: string): boolean {
    return /zebra|zpl|zd(?:220|230|420|421|620|621)|gk420|gx420|gc420|zt/i.test(name);
}

/** Detect if a printer is likely any supported label/barcode printer. */
export function isLikelyLabelPrinter(name: string): boolean {
    return isLikelySpeedXPrinter(name) || isLikelyZebraPrinter(name) || /godex|argox|honeywell|datamax|intermec|sato|label|barcode/i.test(name);
}

/** Legacy alias kept for backwards compatibility. */
export function isLikelyZplPrinter(name: string): boolean {
    return isLikelyLabelPrinter(name);
}

/** Auto-detect printer model family (Speed-X or Zebra) from printer name. */
export function detectPrinterModel(name: string): 'speedx' | 'zebra' {
    if (isLikelySpeedXPrinter(name)) return 'speedx';
    return 'zebra';
}

export async function listLabelPrinters(): Promise<PrinterInfo[]> {
    return listPrinters();
}

/** Send label data (ZPL or TSPL) to the printer verbatim. Resolves with a short status message. */
export async function sendLabel(target: ZplTarget, data: string): Promise<string> {
    if (!isTauri()) {
        throw new Error('Direct printing is only available in the desktop app. Use Download instead.');
    }
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string>('print_raw', { target, data });
}

export const sendZpl = sendLabel;

/** Save the label batch to a file the user can send to the printer share. */
export function downloadLabel(data: string, filename = 'labels.txt'): void {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export const downloadZpl = downloadLabel;

export async function copyLabel(data: string): Promise<void> {
    await navigator.clipboard.writeText(data);
}

export const copyZpl = copyLabel;

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
