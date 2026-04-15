/**
 * Thermal Printer Service
 * Uses tauri-plugin-thermal-printer for ESC/POS printing
 */

// Types matching the tauri-plugin-thermal-printer API
export interface PrinterInfo {
    name: string;
    interface_type: string;
    identifier: string;
    status: string;
}

export interface PrinterOptions {
    cut_paper?: boolean;
    beep?: boolean;
    open_cash_drawer?: boolean;
}

export interface GlobalStyles {
    bold?: boolean;
    underline?: boolean;
    align?: 'left' | 'center' | 'right';
    italic?: boolean;
    invert?: boolean;
    font?: 'A' | 'B' | 'C';
    rotate?: boolean;
    upside_down?: boolean;
    size?: 'normal' | 'height' | 'width' | 'Double';
}

export interface TextCell {
    text: string;
    styles?: GlobalStyles | null;
}

export type PrintSection =
    | { Title: { text: string; styles?: GlobalStyles } }
    | { Subtitle: { text: string; styles?: GlobalStyles } }
    | { Text: { text: string; styles?: GlobalStyles } }
    | { Feed: { feed_type: 'lines'; value: number } }
    | { Cut: { mode: 'full' | 'partial'; feed: number } }
    | { Beep: { times: number; duration: number } }
    | { Drawer: { pin: number; pulse_time: number } }
    | { Qr: { data: string; size: number; error_correction: string; model: number; align?: string } }
    | { Barcode: { data: string; barcode_type: string; width: number; height: number; text_position: string; align?: string } }
    | { Image: { path: string; align?: string } }
    | { Table: { columns: number; column_widths?: number[]; header?: TextCell[]; body: TextCell[][]; truncate?: boolean } }
    | { Line: { character: string } }
    | { GlobalStyles: GlobalStyles };

export interface PrintJobRequest {
    printer: string;
    paper_size?: 'Mm58' | 'Mm80';
    options?: PrinterOptions;
    sections: PrintSection[];
}

export interface ThermalPrinterConfig {
    connectionType: 'IP' | 'USB' | 'SHARED';
    ipAddress: string;    // used when connectionType === 'IP'
    printerName: string;  // used when connectionType === 'USB' or 'SHARED'
    paperSize: 'Mm58' | 'Mm80';
    businessName: string;
    businessAddress?: string;
    businessPhone?: string;
    businessNTN?: string;
    businessLogoPath?: string; // Path to logo image for receipt header
}

const THERMAL_CONFIG_KEY = 'thermal_printer_config';

const DEFAULT_CONFIG: ThermalPrinterConfig = {
    connectionType: 'USB',
    ipAddress: '',
    printerName: '',
    paperSize: 'Mm80',
    businessName: 'AAZ Point of Sale',
    businessAddress: '',
    businessPhone: '',
    businessNTN: '',
};

export function saveThermalConfig(config: ThermalPrinterConfig): void {
    localStorage.setItem(THERMAL_CONFIG_KEY, JSON.stringify(config));
}

export function loadThermalConfig(): ThermalPrinterConfig {
    const raw = localStorage.getItem(THERMAL_CONFIG_KEY);
    if (raw) {
        try {
            return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        } catch { /* fallback */ }
    }
    return DEFAULT_CONFIG;
}

/**
 * List available thermal printers.
 * Falls back gracefully if the plugin is not installed.
 */
export async function listPrinters(): Promise<PrinterInfo[]> {
    try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<PrinterInfo[]>('plugin:thermal-printer|list_thermal_printers');
    } catch (e) {
        console.error('Failed to list thermal printers:', e);
        return [];
    }
}

/**
 * Print a document using the thermal printer plugin.
 */
export async function printDocument(job: PrintJobRequest): Promise<boolean> {
    try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<boolean>('plugin:thermal-printer|print_thermal_printer', { printJobRequest: job });
    } catch (e) {
        console.error('Thermal print failed:', e);
        throw new Error(`Print failed: ${e}`);
    }
}

/**
 * Resolve the printer identifier string from config.
 * - IP: "tcp://IP" (plugin handles default port)
 * - USB / SHARED: use the printer name directly
 */
function resolvePrinter(config: ThermalPrinterConfig): string {
    if (config.connectionType === 'IP') {
        const ip = config.ipAddress.trim();
        return ip ? `tcp://${ip}` : '';
    }
    return config.printerName;
}

/**
 * Build a PrintJobRequest from sections using the stored config.
 */
export function buildPrintJob(
    sections: PrintSection[],
    options?: PrinterOptions,
): PrintJobRequest {
    const config = loadThermalConfig();
    return {
        printer: resolvePrinter(config),
        paper_size: config.paperSize,
        options: { cut_paper: true, beep: false, open_cash_drawer: false, ...options },
        sections,
    };
}

// Helpers for building common section types

export const title = (text: string): PrintSection => ({ Title: { text } });
export const subtitle = (text: string): PrintSection => ({ Subtitle: { text } });
export const textLeft = (text: string, bold = false): PrintSection =>
    ({ Text: { text, styles: { align: 'left', bold } } });
export const textCenter = (text: string, bold = false): PrintSection =>
    ({ Text: { text, styles: { align: 'center', bold } } });
export const textRight = (text: string, bold = false): PrintSection =>
    ({ Text: { text, styles: { align: 'right', bold } } });
export const line = (ch = '-'): PrintSection => ({ Line: { character: ch } });
export const feed = (lines = 3): PrintSection => ({ Feed: { feed_type: 'lines', value: lines } });

export const table = (
    columns: number,
    body: TextCell[][],
    columnWidths?: number[],
    header?: TextCell[],
): PrintSection => ({
    Table: { columns, body, column_widths: columnWidths, header, truncate: false },
});

export const cell = (text: string, align?: 'left' | 'center' | 'right', bold?: boolean): TextCell => ({
    text,
    styles: align || bold ? { align, bold } : null,
});

export const qrCode = (data: string, size = 6): PrintSection => ({
    Qr: { data, size, error_correction: 'M', model: 2, align: 'center' },
});

export const image = (path: string, align = 'center'): PrintSection => ({
    Image: { path, align },
});
