/**
 * ZPL II label generation.
 *
 * Everything the page shows and everything the printer receives comes out of
 * here — the preview renders the exact ZPL that gets sent, so what you see is
 * what the printer lays down.
 */

import { code128WidthDots, fitModuleWidth } from './code128';

export type Dpi = 203 | 300 | 600;

export interface LabelConfig {
    dpi: Dpi;
    widthMm: number;
    heightMm: number;
    /** Print darkness, `^MD` (-30…30). 0 leaves the printer default alone. */
    darkness: number;
    showShop: boolean;
    shopName: string;
    showName: boolean;
    showVariant: boolean;
    showBarcode: boolean;
    showBarcodeText: boolean;
    showPrice: boolean;
    currency: string;
    showBorder: boolean;
    footer: string;
    /** Single typography knob: multiplies every text height. */
    textScale: number;
    barcodeHeightMm: number;
}

export interface LabelData {
    name: string;
    variant?: string;
    barcode: string;
    price: number;
}

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
    dpi: 203,
    widthMm: 50,
    heightMm: 30,
    darkness: 0,
    showShop: true,
    shopName: 'Aazify POS',
    showName: true,
    showVariant: false,
    showBarcode: true,
    showBarcodeText: true,
    showPrice: true,
    currency: 'Rs',
    showBorder: false,
    footer: '',
    textScale: 1,
    barcodeHeightMm: 8,
};

export const SIZE_PRESETS: Array<{ name: string; widthMm: number; heightMm: number }> = [
    { name: '50 × 30 mm', widthMm: 50, heightMm: 30 },
    { name: '40 × 30 mm', widthMm: 40, heightMm: 30 },
    { name: '38 × 25 mm', widthMm: 38, heightMm: 25 },
    { name: '50 × 25 mm', widthMm: 50, heightMm: 25 },
    { name: '100 × 50 mm', widthMm: 100, heightMm: 50 },
    { name: '100 × 150 mm', widthMm: 100, heightMm: 150 },
];

/** Millimetres → printer dots. */
export const mmToDots = (mm: number, dpi: Dpi) => Math.round((mm * dpi) / 25.4);

/** `^` and `~` are ZPL control prefixes and `\` escapes — keep them out of `^FD`. */
function escapeField(text: string): string {
    return text.replace(/[\^~\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Average advance width of ZPL font 0 (CG Triumvirate Condensed) as a fraction
 * of the character height. The preview uses the same figure so it breaks lines
 * where the generator reserved space for them.
 */
export const ZPL_FONT_ADVANCE = 0.55;

/** Rough advance width of the built-in scalable font (font 0) in dots. */
export const textWidthDots = (text: string, fontHeight: number) =>
    text.length * fontHeight * ZPL_FONT_ADVANCE;

const wrappedLines = (text: string, fontHeight: number, blockWidth: number, maxLines: number) =>
    Math.min(maxLines, Math.max(1, Math.ceil(textWidthDots(text, fontHeight) / blockWidth)));

interface Row {
    kind: 'text' | 'barcode';
    text: string;
    fontHeight: number;
    lines: number;
    /** Total vertical space the row occupies, in dots. */
    height: number;
    barHeight?: number;
    module?: number;
}

/**
 * Stack the enabled rows top to bottom, then shrink to fit if the content is
 * taller than the label. The barcode gives up height first (it degrades most
 * gracefully), then everything scales down together.
 */
function buildRows(config: LabelConfig, data: LabelData) {
    const { dpi } = config;
    const width = mmToDots(config.widthMm, dpi);
    const height = mmToDots(config.heightMm, dpi);
    const pad = Math.max(4, mmToDots(1.2, dpi));
    const innerWidth = width - pad * 2;
    const gap = Math.max(2, mmToDots(0.6, dpi));

    const font = (mm: number) => Math.max(8, Math.round(mmToDots(mm, dpi) * config.textScale));
    const rows: Row[] = [];

    const pushText = (text: string, sizeMm: number, maxLines = 1) => {
        const clean = escapeField(text);
        if (!clean) return;
        const fontHeight = font(sizeMm);
        const lines = wrappedLines(clean, fontHeight, innerWidth, maxLines);
        rows.push({
            kind: 'text',
            text: clean,
            fontHeight,
            lines,
            height: fontHeight * lines,
        });
    };

    if (config.showShop) pushText(config.shopName, 2.2);
    if (config.showName) pushText(data.name, 3, 2);
    if (config.showVariant && data.variant) pushText(data.variant, 2);

    if (config.showBarcode && data.barcode) {
        const barcodeText = escapeField(data.barcode);
        const module = fitModuleWidth(barcodeText, innerWidth);
        const barHeight = mmToDots(config.barcodeHeightMm, dpi);
        const hrHeight = config.showBarcodeText ? font(2.2) : 0;
        rows.push({
            kind: 'barcode',
            text: barcodeText,
            fontHeight: hrHeight || font(2.2),
            lines: 1,
            height: barHeight + hrHeight,
            barHeight,
            module,
        });
    }

    if (config.showPrice) {
        pushText(`${config.currency} ${data.price.toFixed(2)}`.trim(), 4);
    }
    if (config.footer) pushText(config.footer, 1.8);

    if (rows.length === 0) return { rows, width, height, pad, innerWidth, gap, startY: pad };

    const available = height - pad * 2;
    const totalGaps = gap * (rows.length - 1);
    let contentHeight = rows.reduce((sum, row) => sum + row.height, 0) + totalGaps;

    // Overflow pass 1 — take it out of the barcode, down to a scannable minimum.
    const barcodeRow = rows.find(row => row.kind === 'barcode');
    if (contentHeight > available && barcodeRow?.barHeight) {
        const minBarHeight = mmToDots(4, dpi);
        const shrink = Math.min(contentHeight - available, barcodeRow.barHeight - minBarHeight);
        if (shrink > 0) {
            barcodeRow.barHeight -= shrink;
            barcodeRow.height -= shrink;
            contentHeight -= shrink;
        }
    }

    // Overflow pass 2 — scale the whole label down proportionally.
    if (contentHeight > available) {
        const scale = (available - totalGaps) / (contentHeight - totalGaps);
        for (const row of rows) {
            row.fontHeight = Math.max(6, Math.round(row.fontHeight * scale));
            if (row.kind === 'barcode' && row.barHeight) {
                row.barHeight = Math.max(mmToDots(3, dpi), Math.round(row.barHeight * scale));
                row.height = row.barHeight + (config.showBarcodeText ? row.fontHeight : 0);
            } else {
                row.height = row.fontHeight * row.lines;
            }
        }
        contentHeight = rows.reduce((sum, row) => sum + row.height, 0) + totalGaps;
    }

    const startY = pad + Math.max(0, Math.round((available - contentHeight) / 2));
    return { rows, width, height, pad, innerWidth, gap, startY };
}

/**
 * Body of a single label — everything between `^XA` and `^XZ`, minus the
 * header/quantity lines that `buildLabelZpl` adds.
 */
function labelBody(config: LabelConfig, data: LabelData): string[] {
    const { rows, width, height, pad, innerWidth, gap, startY } = buildRows(config, data);
    const out: string[] = [];

    if (config.showBorder) {
        const thickness = Math.max(1, Math.round(config.dpi / 100));
        out.push(`^FO0,0^GB${width},${height},${thickness}^FS`);
    }

    let y = startY;
    for (const row of rows) {
        if (row.kind === 'barcode' && row.barHeight && row.module) {
            const barWidth = code128WidthDots(row.text, row.module);
            const x = Math.max(0, pad + Math.round((innerWidth - barWidth) / 2));
            const showText = config.showBarcodeText ? 'Y' : 'N';
            out.push(`^BY${row.module},3,${row.barHeight}`);
            out.push(`^FO${x},${y}^A0N,${row.fontHeight},${row.fontHeight}`);
            out.push(`^BCN,${row.barHeight},${showText},N,N,A^FD${row.text}^FS`);
        } else {
            out.push(
                `^FO${pad},${y}^A0N,${row.fontHeight},${row.fontHeight}` +
                `^FB${innerWidth},${row.lines},0,C,0^FD${row.text}^FS`,
            );
        }
        y += row.height + gap;
    }

    return out;
}

/** One complete label format. `copies` becomes `^PQ`, so the printer repeats it. */
export function buildLabelZpl(config: LabelConfig, data: LabelData, copies = 1): string {
    const width = mmToDots(config.widthMm, config.dpi);
    const height = mmToDots(config.heightMm, config.dpi);

    const lines = ['^XA', '^CI28', `^PW${width}`, `^LL${height}`, '^LH0,0'];
    if (config.darkness !== 0) lines.push(`^MD${config.darkness}`);

    lines.push(...labelBody(config, data));

    if (copies > 1) lines.push(`^PQ${copies},0,0,N`);
    lines.push('^XZ');

    return lines.join('\n');
}

/** Concatenated formats for a whole batch — exactly what gets sent to the printer. */
export function buildBatchZpl(
    config: LabelConfig,
    items: Array<{ data: LabelData; copies: number }>,
): string {
    return items
        .filter(item => item.copies > 0)
        .map(item => buildLabelZpl(config, item.data, item.copies))
        .join('\n');
}

/** Sample used by the preview when nothing has been added yet. */
export const SAMPLE_LABEL: LabelData = {
    name: 'Sample Product',
    variant: 'Default',
    barcode: '123456789012',
    price: 250,
};
