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
    /**
     * Test mode: render the receipt image and show it on screen for download
     * instead of sending it to the printer. HTML pipeline only.
     */
    exportInsteadOfPrint?: boolean;
}

const THERMAL_CONFIG_KEY = 'thermal_printer_config';

/**
 * Type face for native ESC/POS slips.
 *
 * Font A is 12 dots wide, Font B is 9 — B is the compact receipt face and fits
 * 64 columns on 80mm paper against Font A's 48.
 */
const NATIVE_FONT: NonNullable<GlobalStyles['font']> = 'B';

/** Character cell width in dots, per ESC/POS font. */
const FONT_CELL_DOTS: Record<string, number> = { A: 12, B: 9, C: 9 };

/** Printable dots across, per paper size. */
const PAPER_DOTS: Record<string, number> = { Mm80: 576, Mm58: 384 };

/**
 * Columns available for a native slip at the current font and paper size.
 *
 * Shared by every native builder so the item rows, totals and rule lines all
 * agree on one width. `nativeColumns` in settings still wins when set, for
 * printers whose real column count differs from the nominal one.
 */
export function nativeWidth(config: ThermalPrinterConfig): number {
    if (config.nativeColumns) return config.nativeColumns;
    const dots = PAPER_DOTS[config.paperSize] ?? 576;
    return Math.floor(dots / (FONT_CELL_DOTS[NATIVE_FONT] ?? 12));
}

/** The same width with no `nativeColumns` override, for proportional scaling. */
export function nativeDefaultWidth(config: ThermalPrinterConfig): number {
    const dots = PAPER_DOTS[config.paperSize] ?? 576;
    return Math.floor(dots / (FONT_CELL_DOTS[NATIVE_FONT] ?? 12));
}

/**
 * Columns available at an explicit font, for the few lines that opt out of the
 * compact face.
 *
 * A line printed in Font A only fits 48 columns on 80mm where Font B fits 64 —
 * padding it to the Font B width is exactly what makes a line wrap onto the
 * next one. Any `nativeColumns` override is scaled to the requested font rather
 * than ignored.
 */
export function nativeWidthFor(
    config: ThermalPrinterConfig,
    font: NonNullable<GlobalStyles['font']>,
): number {
    const dots = PAPER_DOTS[config.paperSize] ?? 576;
    const columns = Math.floor(dots / (FONT_CELL_DOTS[font] ?? 12));
    if (!config.nativeColumns) return columns;

    const base = Math.floor(dots / (FONT_CELL_DOTS[NATIVE_FONT] ?? 12));
    return Math.max(10, Math.round(config.nativeColumns * (columns / base)));
}

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

    // Font B at normal size for the whole job — the compact receipt face.
    // Sections that set only `align`/`bold` inherit the rest from here, so this
    // one line governs the type size of every native slip.
    const jobSections: PrintSection[] = [
        { GlobalStyles: { font: NATIVE_FONT, size: 'normal' } },
        ...sections
    ];

    return {
        printer: resolvePrinter(config),
        paper_size: config.paperSize,
        options: { cut_paper: true, beep: false, open_cash_drawer: false, ...options },
        sections: jobSections,
    };
}

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
        options: { cut_paper: true, beep: false, open_cash_drawer: false },
        sections: [
            { GlobalStyles: { font: NATIVE_FONT, size: 'normal' } },
            headline(biz.name, width),
            textCenter('PRINTER TEST SLIP', true),
            line('='),
            textLeft(`Connection : ${cfg.connectionType}`),
            textLeft(`Target     : ${target}`),
            textLeft(`Paper      : ${cfg.paperSize === 'Mm58' ? '58mm' : '80mm'}`),
            textLeft(`Mode       : ${cfg.invoiceMode}`),
            textLeft(`Time       : ${stamp}`),
            line('='),
            textLeft('0123456789'.repeat(Math.ceil(width / 10)).slice(0, width)),
            textCenter('If this slip is complete and'),
            textCenter('aligned, printing is working.'),
            feed(3),
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
 * Business name at the top of a slip: bold and double-height.
 *
 * Height only — double *width* would halve the usable columns, so the rest of
 * the slip's column arithmetic keeps working against the width passed in.
 */
export const headline = (text: string, width: number): PrintSection =>
    ({ Text: { text: centreOn(text, width), styles: { align: 'left', bold: true, size: 'height' } } });

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
 * Text in the large face (Font A), for the one figure that should stand out
 * from the body — the grand total.
 *
 * Callers must lay the text out against `nativeWidthFor(config, 'A')`, not the
 * job width, or it will wrap.
 */
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
