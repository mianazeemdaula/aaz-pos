/**
 * ZPL II label generation, plus the label model shared by every print mode.
 *
 * In `native` mode the printer receives exactly these commands and the preview
 * renders them, so what you see is what the printer lays down.
 */

import { code128WidthDots } from './code128';

export type Dpi = 203 | 300 | 600;
export type LabelPrinterModel = 'speedx' | 'zebra';

/**
 * Label layout. Side designs move the price and/or the footer note into a
 * vertical strip along the label edge, printed with the printer's rotated
 * built-in font; everything else is centred in the remaining column.
 */
export type LabelDesign = 'standard' | 'price-side' | 'note-side' | 'price-note-side';

export const LABEL_DESIGNS: Array<{ id: LabelDesign; name: string; hint: string }> = [
    { id: 'standard', name: 'Standard', hint: 'Everything stacked and centred' },
    { id: 'price-side', name: 'Vertical price', hint: 'Price runs up the right edge' },
    { id: 'note-side', name: 'Vertical note', hint: 'Footer note runs along the left edge' },
    { id: 'price-note-side', name: 'Price + note', hint: 'Note on the left, price on the right' },
];

/**
 * Labels print with printer-resident fonts and the native barcode command
 * (TSPL / ZPL) — the IDAutomation-recommended way to get crisp thermal labels.
 */
export interface LabelConfig {
    printerModel: LabelPrinterModel;
    design: LabelDesign;
    dpi: Dpi;
    widthMm: number;
    heightMm: number;
    gapMm?: number;
    /** Print darkness: For Zebra, ^MD (-30…30). For SpeedX, maps to DENSITY (1…15). */
    darkness: number;
    showShop: boolean;
    /** Filled from the Business Settings name — not edited on the label page. */
    shopName: string;
    showName: boolean;
    showVariant: boolean;
    showBarcode: boolean;
    showBarcodeText: boolean;
    showPrice: boolean;
    showBorder: boolean;
    footer: string;
    /** Footer note text height in mm. */
    footerSizeMm: number;
    barcodeHeightMm: number;
    /**
     * Narrow bar (X-dimension) width in printer dots. Fixed — the barcode is
     * never rescaled to fit the label; a barcode that doesn't fit is flagged.
     */
    barcodeModuleDots: number;
    /** Blank space above the first row, in mm. Content is top-aligned from here. */
    topPaddingMm: number;
}

/** Code 128 needs a quiet zone of 10 narrow-bar widths on each side to scan. */
export const QUIET_ZONE_MODULES = 10;

export interface LabelData {
    name: string;
    variant?: string;
    barcode: string;
    price: number;
}

export const DEFAULT_LABEL_CONFIG: LabelConfig = {
    printerModel: 'speedx',
    design: 'standard',
    dpi: 203,
    widthMm: 50,
    heightMm: 30,
    gapMm: 2,
    darkness: 0,
    showShop: true,
    shopName: 'Aazify POS',
    showName: true,
    showVariant: false,
    showBarcode: true,
    showBarcodeText: true,
    showPrice: true,
    showBorder: false,
    footer: '',
    footerSizeMm: 2,
    barcodeHeightMm: 6,
    barcodeModuleDots: 2,
    topPaddingMm: 1.5,
};

export const SIZE_PRESETS: Array<{ name: string; widthMm: number; heightMm: number }> = [
    { name: '50 × 30 mm', widthMm: 50, heightMm: 30 },
    { name: '40 × 30 mm', widthMm: 40, heightMm: 30 },
    { name: '38 × 25 mm', widthMm: 38, heightMm: 25 },
    { name: '50 × 25 mm', widthMm: 50, heightMm: 25 },
    { name: '100 × 50 mm', widthMm: 100, heightMm: 50 },
    { name: '100 × 150 mm', widthMm: 100, heightMm: 150 },
];

/**
 * Resolution and darkness aren't user settings: labels always print at 203 dpi
 * (the Speed-X head, and what the built-in font sizes are tuned for) with the
 * printer's factory darkness (TSPL DENSITY 8, no ^MD override). Applied on load
 * so values saved by older versions can't linger.
 */
export const withFixedPrintSettings = (config: LabelConfig): LabelConfig => ({
    ...config,
    dpi: DEFAULT_LABEL_CONFIG.dpi,
    darkness: DEFAULT_LABEL_CONFIG.darkness,
});

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

export interface Row {
    kind: 'text' | 'barcode';
    text: string;
    fontHeight: number;
    lines: number;
    /** Line limit for this row — each printer language wraps with its own font widths. */
    maxLines: number;
    /** Total vertical space the row occupies, in dots. */
    height: number;
    barHeight?: number;
    module?: number;
    /**
     * Preferred span, centred on the label and clear of any side strip. Text
     * too wide for it falls back to the main column (see `textSpan`).
     */
    spanX?: number;
    spanWidth?: number;
}

/**
 * Text heights in mm. At 203 dpi these land exactly on the printer's built-in
 * TSPL fonts: 2.4 mm = 19 dots (font 2), 3 mm = 24 dots (font 3).
 */
const TEXT_MM = {
    shop: 2.4,
    name: 3,
    variant: 2.4,
    barcodeText: 2.6,
    price: 3,
    footer: 2,
};

export const FOOTER_SIZE_MIN_MM = 1.5;
export const FOOTER_SIZE_MAX_MM = 8;

export const footerSizeMm = (config: LabelConfig) =>
    Math.min(FOOTER_SIZE_MAX_MM, Math.max(FOOTER_SIZE_MIN_MM, config.footerSizeMm || TEXT_MM.footer));

/** Currency prefix printed before the price. */
export const PRICE_PREFIX = 'Rs';

/**
 * Text printed rotated in a strip along the left or right label edge.
 * Left reads bottom-to-top, right reads top-to-bottom — glyph tops face the edge.
 */
export interface SideText {
    side: 'left' | 'right';
    text: string;
    fontHeight: number;
    /** Left edge of the strip, in dots. */
    x: number;
    /** Longest the text may run along the label height, in dots. */
    maxLength: number;
}

/**
 * Stack the enabled rows top to bottom at fixed sizes. Changing the label size
 * never rescales content; overflow is reported by `checkNativeLabel`.
 *
 * `areaX` / `innerWidth` describe the main column: the full width between the
 * margins, minus any side strips the design adds.
 */
export function buildRows(config: LabelConfig, data: LabelData) {
    const { dpi } = config;
    const width = mmToDots(config.widthMm, dpi);
    const height = mmToDots(config.heightMm, dpi);
    const pad = Math.max(4, mmToDots(1.2, dpi));
    const gap = Math.max(2, mmToDots(0.6, dpi));

    const font = (mm: number) => Math.max(8, mmToDots(mm, dpi));
    const design = config.design ?? 'standard';
    const priceSide = design === 'price-side' || design === 'price-note-side';
    const noteSide = design === 'note-side' || design === 'price-note-side';
    const priceText = config.showPrice ? `${PRICE_PREFIX} ${data.price.toFixed(2)}` : '';
    const noteText = escapeField(config.footer ?? '');

    // Side strips: the rotated text's height plus clear space before the column.
    const sides: SideText[] = [];
    const stripGap = gap * 2;
    let areaX = pad;
    let areaRight = width - pad;
    if (noteSide && noteText) {
        const fontHeight = font(footerSizeMm(config));
        sides.push({ side: 'left', text: noteText, fontHeight, x: pad, maxLength: height - pad * 2 });
        areaX = pad + fontHeight + stripGap;
    }
    if (priceSide && priceText) {
        const fontHeight = font(TEXT_MM.price);
        const x = width - pad - fontHeight;
        sides.push({ side: 'right', text: priceText, fontHeight, x, maxLength: height - pad * 2 });
        areaRight = x - stripGap;
    }
    const innerWidth = areaRight - areaX;

    const rows: Row[] = [];

    const pushText = (text: string, sizeMm: number, maxLines = 1, span?: { x: number; width: number }) => {
        const clean = escapeField(text);
        if (!clean) return;
        const fontHeight = font(sizeMm);
        const lines = wrappedLines(clean, fontHeight, span?.width ?? innerWidth, maxLines);
        rows.push({
            kind: 'text',
            text: clean,
            fontHeight,
            lines,
            maxLines,
            height: fontHeight * lines,
            spanX: span?.x,
            spanWidth: span?.width,
        });
    };

    if (config.showShop) pushText(config.shopName, TEXT_MM.shop);
    if (config.showName) pushText(data.name, TEXT_MM.name);
    if (config.showVariant && data.variant) pushText(data.variant, TEXT_MM.variant);

    if (config.showBarcode && data.barcode) {
        const barcodeText = escapeField(data.barcode);
        const module = labelModuleDots(config);
        const barHeight = mmToDots(config.barcodeHeightMm, dpi);
        const hrHeight = config.showBarcodeText ? font(TEXT_MM.barcodeText) : 0;
        rows.push({
            kind: 'barcode',
            text: barcodeText,
            fontHeight: hrHeight || font(TEXT_MM.barcodeText),
            lines: 1,
            maxLines: 1,
            height: barHeight + hrHeight,
            barHeight,
            module,
        });
    }

    if (priceText && !priceSide) pushText(priceText, TEXT_MM.price);
    // The note is centred on the label, not the column — but only within a band
    // symmetric about the centre that stays clear of the side strips.
    if (noteText && !noteSide) {
        const centre = width / 2;
        const half = Math.max(0, Math.min(centre - areaX, areaRight - centre));
        pushText(noteText, footerSizeMm(config), 1, { x: Math.round(centre - half), width: Math.round(half * 2) });
    }

    // Fixed sizes, top-aligned: changing the label size never rescales content.
    const startY = topPaddingDots(config);
    return { rows, sides, width, height, pad, areaX, innerWidth, gap, startY };
}

/**
 * Where a text row is centred: its preferred span when the text fits there,
 * otherwise the main column. Never reaches into a side strip.
 */
export function textSpan(row: Row, areaX: number, innerWidth: number, textWidth: number) {
    if (row.spanX === undefined || row.spanWidth === undefined || textWidth > row.spanWidth) {
        return { x: areaX, width: innerWidth };
    }
    return { x: row.spanX, width: row.spanWidth };
}

/** Longest prefix of `text` whose estimated length fits `maxDots`. */
export function fitLength(text: string, charDots: number, maxDots: number): string {
    return text.slice(0, Math.max(0, Math.floor(maxDots / charDots)));
}

/** Narrow bar width in dots, clamped to what printers can lay down reliably. */
export const labelModuleDots = (config: LabelConfig) =>
    Math.min(10, Math.max(1, Math.round(config.barcodeModuleDots || 2)));

export const topPaddingDots = (config: LabelConfig) =>
    mmToDots(Math.max(0, config.topPaddingMm ?? 1.5), config.dpi);

/** Where native-command content ends up, so it can be checked against the label. */
export interface NativeLayout {
    body: string[];
    /** Bottom edge of the last row, in dots. */
    endY: number;
    /** Bottom edge of the bars, when there is a barcode. */
    barcodeBottom?: number;
    /** A vertical side text was too long for the label height and was shortened. */
    sideTruncated?: boolean;
}

/**
 * Body of a single label — everything between `^XA` and `^XZ`, minus the
 * header/quantity lines that `buildLabelZpl` adds.
 */
export function zplLayout(config: LabelConfig, data: LabelData): NativeLayout {
    const { rows, sides, width, height, areaX, innerWidth, gap, startY } = buildRows(config, data);
    const out: string[] = [];
    let barcodeBottom: number | undefined;
    let truncated = false;

    if (config.showBorder) {
        const thickness = Math.max(1, Math.round(config.dpi / 100));
        out.push(`^FO0,0^GB${width},${height},${thickness}^FS`);
    }

    // Rotated side text: ^A0R reads top-to-bottom, ^A0B bottom-to-top. ^FO is
    // the top-left of the rotated field box (font height wide, text long).
    for (const side of sides) {
        const text = fitLength(side.text, side.fontHeight * ZPL_FONT_ADVANCE, side.maxLength);
        truncated ||= text.length < side.text.length;
        const length = Math.round(textWidthDots(text, side.fontHeight));
        const y = Math.max(0, Math.round((height - length) / 2));
        const orientation = side.side === 'right' ? 'R' : 'B';
        out.push(`^FO${side.x},${y}^A0${orientation},${side.fontHeight},${side.fontHeight}^FD${text}^FS`);
    }

    let y = startY;
    for (const row of rows) {
        if (row.kind === 'barcode' && row.barHeight && row.module) {
            const barWidth = code128WidthDots(row.text, row.module);
            const x = Math.max(0, areaX + Math.round((innerWidth - barWidth) / 2));
            const showText = config.showBarcodeText ? 'Y' : 'N';
            out.push(`^BY${row.module},3,${row.barHeight}`);
            out.push(`^FO${x},${y}^A0N,${row.fontHeight},${row.fontHeight}`);
            out.push(`^BCN,${row.barHeight},${showText},N,N,A^FD${row.text}^FS`);
            barcodeBottom = y + row.barHeight;
        } else {
            const { x, width: blockWidth } = textSpan(row, areaX, innerWidth, textWidthDots(row.text, row.fontHeight));
            // ^FB overprints overflow onto its last line, so clip single-line rows.
            const text = row.maxLines === 1
                ? fitLength(row.text, row.fontHeight * ZPL_FONT_ADVANCE, blockWidth)
                : row.text;
            out.push(
                `^FO${x},${y}^A0N,${row.fontHeight},${row.fontHeight}` +
                `^FB${blockWidth},${row.lines},0,C,0^FD${text}^FS`,
            );
        }
        y += row.height + gap;
    }

    return { body: out, endY: y - gap, barcodeBottom, sideTruncated: truncated };
}

/** One complete label format. `copies` becomes `^PQ`, so the printer repeats it. */
export function buildLabelZpl(config: LabelConfig, data: LabelData, copies = 1): string {
    const width = mmToDots(config.widthMm, config.dpi);
    const height = mmToDots(config.heightMm, config.dpi);

    const lines = ['^XA', '^CI28', `^PW${width}`, `^LL${height}`, '^LH0,0'];
    if (config.darkness !== 0) lines.push(`^MD${config.darkness}`);

    lines.push(...zplLayout(config, data).body);

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
