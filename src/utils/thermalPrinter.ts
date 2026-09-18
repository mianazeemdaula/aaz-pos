/**
 * Thermal Printer Service
 *
 * Rust Engine Pipeline:
 * Tauri / Rust -> Skia -> HarfBuzz text shaping -> Urdu font -> 203 DPI raster -> 1-bit conversion -> ESC/POS -> USB / LAN
 */

import {
    columnsFor,
    resolveColumns,
    type ColumnQuery,
    type EscPosFont,
    type EscPosPaper,
    type EscPosSize,
} from './thermalFont';

export type { EscPosFont, EscPosSize, EscPosPaper } from './thermalFont';

export interface PrinterInfo {
    name: string;
    interface_type: string;
    identifier: string;
    status: string;
}

export interface ThermalInvoicePayment {
    name: string;
    amount: number;
}

export interface ThermalInvoiceItem {
    name: string;
    qty: number;
    price: number;
    discount?: number;
    total: number;
}

export interface ThermalInvoiceData {
    business_name: string;
    business_address?: string;
    business_phone?: string;
    business_ntn?: string;
    business_strn?: string;

    title: string;
    invoice_no: string;
    date_time: string;
    cashier?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_previous_balance?: number;
    customer_new_balance?: number;

    items: ThermalInvoiceItem[];
    payments?: ThermalInvoicePayment[];

    subtotal: number;
    discount_amount?: number;
    tax_amount?: number;
    grand_total: number;
    paid_amount?: number;
    change_amount?: number;

    fbr_invoice_id?: string;
    qr_data?: string;
    fbr_logo_base64?: string;
    notes?: string;
    logo_base64?: string;
    is_duplicate?: boolean;
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
    businessSTRN?: string;
    businessLogoPath?: string;
    tcpPort?: number;
    cutPaper?: boolean;
    beep?: boolean;
    openCashDrawer?: boolean;
    feedLines?: number;

    // Optional legacy fields preserved for settings compatibility
    invoiceMode?: 'rust' | 'html' | 'native';
    imageWidth?: number;
    nativeColumns?: number;
    nativeFont?: EscPosFont;
    nativeTextSize?: EscPosSize;
    nativeBold?: boolean;
    nativeHeadingSize?: EscPosSize;
    nativeTotalFont?: EscPosFont;
    nativeTotalSize?: EscPosSize;
}

const THERMAL_CONFIG_KEY = 'thermal_printer_config';

const DEFAULT_CONFIG: ThermalPrinterConfig = {
    connectionType: 'USB',
    ipAddress: '',
    printerName: '',
    paperSize: 'Mm80',
    businessName: 'Aazify POS',
    businessAddress: '',
    businessPhone: '',
    businessNTN: '',
    invoiceMode: 'rust',
    cutPaper: true,
    beep: false,
    openCashDrawer: false,
    feedLines: 3,
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
 * Maps frontend config to Rust ThermalPrinterConfig
 */
function toRustConfig(cfg: ThermalPrinterConfig) {
    return {
        connection_type: cfg.connectionType,
        printer_name: cfg.printerName || null,
        ip_address: cfg.ipAddress || null,
        tcp_port: cfg.tcpPort || 9100,
        paper_size: cfg.paperSize || 'Mm80',
        cut_paper: cfg.cutPaper ?? true,
        beep: cfg.beep ?? false,
        open_cash_drawer: cfg.openCashDrawer ?? false,
        feed_lines: cfg.feedLines ?? 3,
    };
}

/**
 * Print an invoice using the new Tauri / Rust Skia + HarfBuzz + 203 DPI pipeline
 */
export async function printThermalInvoice(
    invoice: ThermalInvoiceData,
    config?: ThermalPrinterConfig,
): Promise<boolean> {
    const cfg = config ?? loadThermalConfig();
    try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke<string>('print_thermal_invoice', {
            invoice,
            config: toRustConfig(cfg),
        });
        return true;
    } catch (err) {
        console.error('[ThermalPrinter] Print failed:', err);
        throw new Error(`Thermal print failed: ${err}`);
    }
}

/**
 * Generate preview PNG base64 for an invoice using the Rust engine
 */
export async function previewThermalInvoice(
    invoice: ThermalInvoiceData,
    config?: ThermalPrinterConfig,
): Promise<string> {
    const cfg = config ?? loadThermalConfig();
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string>('preview_thermal_invoice', {
        invoice,
        config: toRustConfig(cfg),
    });
}

/**
 * Send a test slip using the Rust engine
 */
export async function printTestSlip(config?: ThermalPrinterConfig): Promise<boolean> {
    const cfg = config ?? loadThermalConfig();
    try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke<string>('print_thermal_test_slip', {
            config: toRustConfig(cfg),
        });
        return true;
    } catch (err) {
        console.error('[ThermalPrinter] Test print failed:', err);
        throw new Error(`Test print failed: ${err}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compatibility helpers for existing font queries and settings
// ─────────────────────────────────────────────────────────────────────────────

export const nativeFont = (config: ThermalPrinterConfig): EscPosFont => config.nativeFont ?? 'B';
export const nativeTextSize = (config: ThermalPrinterConfig): EscPosSize => config.nativeTextSize ?? 'normal';
export const nativeHeadingSize = (config: ThermalPrinterConfig): EscPosSize => config.nativeHeadingSize ?? 'height';
export const nativeTotalFont = (config: ThermalPrinterConfig): EscPosFont => config.nativeTotalFont ?? 'A';
export const nativeTotalSize = (config: ThermalPrinterConfig): EscPosSize => config.nativeTotalSize ?? 'normal';
export const nativeBold = (config: ThermalPrinterConfig): boolean => config.nativeBold ?? false;
export const feedLines = (config: ThermalPrinterConfig): number => {
    const n = Number(config.feedLines);
    return Number.isFinite(n) && n >= 0 ? Math.min(10, Math.round(n)) : 3;
};

const paperOf = (config: ThermalPrinterConfig): EscPosPaper => config.paperSize ?? 'Mm80';

export const bodyQuery = (config: ThermalPrinterConfig): ColumnQuery => ({
    paperSize: paperOf(config),
    font: nativeFont(config),
    size: nativeTextSize(config),
});

export function nativeWidth(config: ThermalPrinterConfig): number {
    const body = bodyQuery(config);
    return resolveColumns(body, body, config.nativeColumns);
}

export function nativeDefaultWidth(config: ThermalPrinterConfig): number {
    return columnsFor(bodyQuery(config));
}

export function nativeWidthFor(
    config: ThermalPrinterConfig,
    font: EscPosFont,
    size: EscPosSize = 'normal',
): number {
    return resolveColumns(
        { paperSize: paperOf(config), font, size },
        bodyQuery(config),
        config.nativeColumns,
    );
}

export const nativeHeadingWidth = (config: ThermalPrinterConfig): number =>
    nativeWidthFor(config, nativeFont(config), nativeHeadingSize(config));

export const nativeTotalWidth = (config: ThermalPrinterConfig): number =>
    nativeWidthFor(config, nativeTotalFont(config), nativeTotalSize(config));

export interface PrinterOptions {
    cut_paper?: boolean;
    beep?: boolean;
    open_cash_drawer?: boolean;
}

export const hardwareOptions = (config: ThermalPrinterConfig): PrinterOptions => ({
    cut_paper: config.cutPaper ?? true,
    beep: config.beep ?? false,
    open_cash_drawer: config.openCashDrawer ?? false,
});

function centreOn(text: string, columns: number): string {
    const t = text.length > columns ? text.slice(0, columns) : text;
    return ' '.repeat(Math.max(0, Math.floor((columns - t.length) / 2))) + t;
}

export const headline = (
    text: string,
    width: number,
    size: EscPosSize = 'height',
) => ({ Text: { text: centreOn(text, width), styles: { align: 'left' as const, bold: true, size } } });

export type PrintSection = Record<string, any>;
export const textLeft = (text: string, bold = false): PrintSection => ({ Text: { text, styles: { align: 'left', bold } } });
export const textCenter = (text: string, bold = false): PrintSection => ({ Text: { text, styles: { align: 'center', bold } } });
export const textRight = (text: string, bold = false): PrintSection => ({ Text: { text, styles: { align: 'right', bold } } });
export const line = (character = '-'): PrintSection => ({ Line: { character } });
export const feed = (value = 1): PrintSection => ({ Feed: { feed_type: 'lines', value } });
export const cell = (text: string, align: 'left' | 'center' | 'right' = 'left', bold = false) => ({ text, styles: { align, bold } });
export const table = (columns: number, body: any[][], column_widths?: number[], header?: any[]): PrintSection => ({ Table: { columns, body, column_widths, header } });
export const bigCenter = (text: string, width: number): PrintSection => ({ Text: { text: centreOn(text, width), styles: { align: 'left', bold: true } } });

export const textEmphasis = (
    config: ThermalPrinterConfig,
    text: string,
) => ({ Text: { text, styles: { font: nativeTotalFont(config), size: nativeTotalSize(config), bold: true } } });

export const jobStyles = (config: ThermalPrinterConfig) => ({
    font: nativeFont(config),
    size: nativeTextSize(config),
    bold: nativeBold(config),
});
