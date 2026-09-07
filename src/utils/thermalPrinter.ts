/**
 * Thermal Printer Service
 * Uses tauri-plugin-thermal-printer for ESC/POS printing
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
    | { Image: { data: string; max_width: number; align: string; dithering: boolean; size: string } }
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
    invoiceMode: 'html' | 'native'; // HTML image pipeline vs ESC/POS text
    imageWidth?: number; // Custom print width in pixels (e.g. 512 or 504 for Bixolon 180dpi)
    nativeColumns?: number; // Custom native characters per line (e.g. 42 for Bixolon Font A)

    // ─── Native ESC/POS type ────────────────────────────────────────────────
    // All optional, and every default reproduces the behaviour these settings
    // replaced, so an existing install prints identically until it is changed.
    /** Body type face. Font B (compact) is the receipt norm. */
    nativeFont?: EscPosFont;
    /** Body character scale. */
    nativeTextSize?: EscPosSize;
    /** Print the body in bold — helps on a worn print head or pale paper. */
    nativeBold?: boolean;
    /** Scale of the business name at the top of a slip. */
    nativeHeadingSize?: EscPosSize;
    /** Type face for the one emphasised figure — the grand total. */
    nativeTotalFont?: EscPosFont;
    /** Scale for that figure. */
    nativeTotalSize?: EscPosSize;

    // ─── Hardware behaviour ────────────────────────────────────────────────
    /** Cut the paper at the end of a job. */
    cutPaper?: boolean;
    /** Sound the printer's buzzer when a job finishes. */
    beep?: boolean;
    /** Kick the cash drawer open on a sale. */
    openCashDrawer?: boolean;
    /** Blank lines fed after the slip, before the cut. */
    feedLines?: number;
}

const THERMAL_CONFIG_KEY = 'thermal_printer_config';

/**
 * Native ESC/POS type, resolved from settings.
 *
 * Font B is 9 dots wide against Font A's 12, so it is the compact receipt face
 * and the historic default here. Every getter below falls back to the value
 * that was hard-coded before these became settings, so an install that has
 * never opened the printer page keeps printing exactly as it did.
 */
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

/** The body line's metrics — the width every manual column override is measured against. */
export const bodyQuery = (config: ThermalPrinterConfig): ColumnQuery => ({
    paperSize: paperOf(config),
    font: nativeFont(config),
    size: nativeTextSize(config),
});

/**
 * Columns available for a native slip at the configured face and size.
 *
 * Shared by every native builder so the item rows, totals and rule lines all
 * agree on one width. `nativeColumns` in settings still wins when set, for
 * printers whose real column count differs from the nominal one.
 */
export function nativeWidth(config: ThermalPrinterConfig): number {
    const body = bodyQuery(config);
    return resolveColumns(body, body, config.nativeColumns);
}

/** The same width with no `nativeColumns` override, for proportional scaling. */
export function nativeDefaultWidth(config: ThermalPrinterConfig): number {
    return columnsFor(bodyQuery(config));
}

/**
 * Columns available at an explicit face and size, for the lines that opt out of
 * the body type.
 *
 * A line printed in Font A only fits 48 columns on 80mm where Font B fits 64 —
 * padding it to the Font B width is exactly what makes a line wrap onto the
 * next one. Any `nativeColumns` override is scaled to the requested type rather
 * than ignored.
 */
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

/** Columns for the business name at the top of a slip. */
export const nativeHeadingWidth = (config: ThermalPrinterConfig): number =>
    nativeWidthFor(config, nativeFont(config), nativeHeadingSize(config));

/** Columns for the emphasised grand-total line. */
export const nativeTotalWidth = (config: ThermalPrinterConfig): number =>
    nativeWidthFor(config, nativeTotalFont(config), nativeTotalSize(config));

const DEFAULT_CONFIG: ThermalPrinterConfig = {
    connectionType: 'USB',
    ipAddress: '',
    printerName: '',
    paperSize: 'Mm80',
    businessName: 'Aazify POS',
    businessAddress: '',
    businessPhone: '',
    businessNTN: '',
    invoiceMode: 'html',
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
 * - IP: "tcp://HOST" or "tcp://HOST:PORT" — printed over a RAW/JetDirect
 *   socket, port 9100 by default. No driver or Windows print queue involved.
 * - USB / SHARED: use the printer name directly (goes via the OS spooler)
 */
function resolvePrinter(config: ThermalPrinterConfig): string {
    if (config.connectionType === 'IP') {
        // Tolerate a pasted "tcp://1.2.3.4" so it does not become "tcp://tcp://…".
        const ip = config.ipAddress.trim().replace(/^(tcp|socket):\/\//i, '');
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

    // The configured face and size for the whole job. Sections that set only
    // `align`/`bold` inherit the rest from here, so this one line governs the
    // type of every native slip.
    const jobSections: PrintSection[] = [
        { GlobalStyles: jobStyles(config) },
        ...sections,
    ];

    return {
        printer: resolvePrinter(config),
        paper_size: config.paperSize,
        options: { ...hardwareOptions(config), ...options },
        sections: jobSections,
    };
}

/** The opening GlobalStyles every native job inherits. */
export const jobStyles = (config: ThermalPrinterConfig): GlobalStyles => ({
    font: nativeFont(config),
    size: nativeTextSize(config),
    bold: nativeBold(config),
});

/** Printer behaviour at the end of a job, from settings. */
export const hardwareOptions = (config: ThermalPrinterConfig): PrinterOptions => ({
    cut_paper: config.cutPaper ?? true,
    beep: config.beep ?? false,
    open_cash_drawer: config.openCashDrawer ?? false,
});

/**
 * Send a short native ESC/POS slip to the configured printer.
 *
 * Deliberately uses the same buildPrintJob + printDocument path as a real
 * invoice, so a slip coming out of the printer proves the whole chain —
 * identifier resolution, transport and the printer itself — not just
 * reachability. Kept to text sections so it works before any logo, template or
 * HTML rendering is set up.
 */
export async function printTestSlip(config?: ThermalPrinterConfig): Promise<boolean> {
    const cfg = config ?? loadThermalConfig();
    const target = resolvePrinter(cfg);
    if (!target) {
        throw new Error(
            cfg.connectionType === 'IP'
                ? 'No printer IP address configured.'
                : 'No printer name configured.',
        );
    }

    const width = nativeWidth(cfg);
    const stamp = new Date().toLocaleString('en-PK');

    // Dynamic import keeps this module free of a static dependency on the
    // invoice helpers, which import back into it for types.
    const { loadReceiptBusiness } = await import('./invoices/businessProfile');
    const biz = await loadReceiptBusiness(cfg);

    return printDocument({
        printer: target,
        paper_size: cfg.paperSize,
        options: hardwareOptions(cfg),
        sections: [
            { GlobalStyles: jobStyles(cfg) },
            headline(biz.name, nativeHeadingWidth(cfg), nativeHeadingSize(cfg)),
            textCenter('PRINTER TEST SLIP', true),
            line('='),
            textLeft(`Connection : ${cfg.connectionType}`),
            textLeft(`Target     : ${target}`),
            textLeft(`Paper      : ${cfg.paperSize === 'Mm58' ? '58mm' : '80mm'}`),
            textLeft(`Mode       : ${cfg.invoiceMode}`),
            textLeft(`Font       : ${nativeFont(cfg)} / ${nativeTextSize(cfg)}`),
            textLeft(`Columns    : ${width}${cfg.nativeColumns ? ' (manual)' : ''}`),
            textLeft(`Time       : ${stamp}`),
            line('='),
            textLeft('0123456789'.repeat(Math.ceil(width / 10)).slice(0, width)),
            textCenter('If this slip is complete and'),
            textCenter('aligned, printing is working.'),
            feed(feedLines(cfg)),
        ],
    });
}

// Helpers for building common section types

// `title` / `subtitle` are intentionally gone: the plugin's Title section
// hard-forces `size: "double"`, which no font setting can undo. Business names
// go through `headline` (below), everything else through `textCenter`.
export const textLeft = (text: string, bold = false): PrintSection =>
    ({ Text: { text, styles: { align: 'left', bold } } });
export const textCenter = (text: string, bold = false): PrintSection =>
    ({ Text: { text, styles: { align: 'center', bold } } });
export const textRight = (text: string, bold = false): PrintSection =>
    ({ Text: { text, styles: { align: 'right', bold } } });
/**
 * Centre text by padding it to a known column count.
 *
 * Not ESC/POS centre alignment: the printer computes that from its *current*
 * font metrics, which drifts once a line is also double-width or double-height.
 * Padding against a column count the caller already knows is predictable at any
 * size. Over-long text is truncated rather than allowed to wrap, since a
 * wrapped double-size heading eats half the slip.
 */
function centreOn(text: string, columns: number): string {
    const t = text.length > columns ? text.slice(0, columns) : text;
    return ' '.repeat(Math.max(0, Math.floor((columns - t.length) / 2))) + t;
}

/**
 * Business name at the top of a slip: bold, and larger than the body by default.
 *
 * `width` must be the column count for THIS size, not the body's — a
 * double-width heading fits half as many characters, and padding it to the body
 * width is what wraps it onto a second line. Use `nativeHeadingWidth(config)`.
 */
export const headline = (
    text: string,
    width: number,
    size: EscPosSize = 'height',
): PrintSection =>
    ({ Text: { text: centreOn(text, width), styles: { align: 'left', bold: true, size } } });

/**
 * The single most important figure on a slip — the amount, total or net
 * payable.
 *
 * Emphasised with weight, not size: the business name is the only thing on a
 * slip that prints larger than the compact face. Kept at full width so long
 * amounts never truncate.
 */
export const bigCenter = (text: string, width: number): PrintSection =>
    ({ Text: { text: centreOn(text, width), styles: { align: 'left', bold: true } } });

/**
 * The one figure that should stand out from the body — the grand total.
 *
 * Face and size come from settings (Font A at normal size by default, which is
 * larger than the compact body face). Callers must lay the text out against
 * `nativeTotalWidth(config)`, not the job width, or it will wrap.
 */
export const textEmphasis = (
    config: ThermalPrinterConfig,
    text: string,
    align: 'left' | 'center' | 'right' = 'left',
    bold = true,
): PrintSection => ({
    Text: { text, styles: { align, bold, font: nativeTotalFont(config), size: nativeTotalSize(config) } },
});

/** @deprecated Use `textEmphasis`, which honours the configured total type. */
export const textFontA = (
    text: string,
    align: 'left' | 'center' | 'right' = 'left',
    bold = true,
): PrintSection => ({ Text: { text, styles: { align, bold, font: 'A' } } });

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

export const qrCode = (data: string, size = 6, align = 'center'): PrintSection => ({
    Qr: { data, size, error_correction: 'M', model: 2, align },
});

export const image = (base64Data: string, align = 'center', maxWidth = 0): PrintSection => ({
    Image: { data: base64Data, max_width: maxWidth, align, dithering: false, size: 'normal' },
});

/**
 * Read a local file and return an Image print section with base64-encoded data.
 */
export async function imageFromFile(filePath: string, align = 'center', maxWidth = 0): Promise<PrintSection> {
    const { invoke } = await import('@tauri-apps/api/core');
    const base64Data = await invoke<string>('read_file_base64', { path: filePath });
    return image(base64Data, align, maxWidth);
}
