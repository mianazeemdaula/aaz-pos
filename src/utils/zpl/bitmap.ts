/**
 * Bitmap label rendering — universal image-based label printing.
 *
 * Renders labels directly to a canvas at printer resolution (DPI),
 * with all text, barcodes, and borders centered.
 * Converts to a 1-bit monochrome bitmap and sends to the printer via:
 *   - Speed-X / TSC: TSPL `BITMAP` binary command
 *   - Zebra: ZPL `^GFA` graphic command
 *
 * This eliminates all text command, font, and firmware differences across
 * different label printers.
 */

import { code128Bars, code128Modules, fitModuleWidth } from './code128';
import { type LabelConfig, type LabelData, mmToDots, SAMPLE_LABEL } from './generate';
import { tsplDensity } from './tspl';
import type { ZplTarget } from './print';
import { isTauri } from '../tauri';

export interface BitmapLabel {
    imageHex: string;
    widthDots: number;
    heightDots: number;
    copies: number;
}

/**
 * Wrap text to fit within maxWidth in canvas pixels.
 */
function wrapTextLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number,
): string[] {
    if (!text || maxLines <= 0) return [];
    if (maxLines === 1) return [text];

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
            current = candidate;
        } else {
            if (current) lines.push(current);
            current = word;
            if (lines.length >= maxLines - 1) break;
        }
    }
    if (current && lines.length < maxLines) {
        lines.push(current);
    }
    return lines;
}

/**
 * Draw a complete centered label onto a canvas.
 */
export function drawLabelToCanvas(
    config: LabelConfig,
    data: LabelData,
    canvas: HTMLCanvasElement,
): { widthDots: number; heightDots: number } {
    const { dpi } = config;
    const widthDots = mmToDots(config.widthMm, dpi);
    const heightDots = mmToDots(config.heightMm, dpi);

    // Byte-align width so each row is a whole number of bytes (required for TSPL BITMAP)
    const widthBytes = Math.ceil(widthDots / 8);
    const alignedWidth = widthBytes * 8;

    canvas.width = alignedWidth;
    canvas.height = heightDots;

    const ctx = canvas.getContext('2d');
    if (!ctx) return { widthDots: alignedWidth, heightDots };

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, alignedWidth, heightDots);
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';

    const pad = Math.max(4, mmToDots(1.2, dpi));
    const topMargin = Math.max(6, mmToDots(2.0, dpi)); // Breathing room from top label edge
    const innerWidth = widthDots - pad * 2;
    const centerX = Math.round(widthDots / 2);

    // Scaling helpers
    const scale = config.textScale || 1.0;
    const fontPx = (mm: number) => Math.max(8, Math.round(mmToDots(mm, dpi) * scale));

    // Measure elements to compute vertical centering
    interface CanvasRow {
        type: 'text' | 'barcode';
        lines?: string[];
        fontSize?: number;
        fontWeight?: string;
        lineHeight?: number;
        height: number;
        barcodeText?: string;
        barHeight?: number;
        moduleWidth?: number;
        symbolWidth?: number;
        hrHeight?: number;
    }

    const rows: CanvasRow[] = [];

    // 1. Shop name (centered)
    if (config.showShop && config.shopName) {
        const size = fontPx(2.2);
        ctx.font = `bold ${size}px Arial, sans-serif`;
        const lines = wrapTextLines(ctx, config.shopName, innerWidth, 1);
        const lh = Math.round(size * 1.15);
        rows.push({
            type: 'text',
            lines,
            fontSize: size,
            fontWeight: 'bold',
            lineHeight: lh,
            height: lines.length * lh,
        });
    }

    // 2. Product name (centered, up to 2 lines)
    if (config.showName && data.name) {
        const size = fontPx(3.0);
        ctx.font = `bold ${size}px Arial, sans-serif`;
        const lines = wrapTextLines(ctx, data.name, innerWidth, 2);
        const lh = Math.round(size * 1.15);
        rows.push({
            type: 'text',
            lines,
            fontSize: size,
            fontWeight: 'bold',
            lineHeight: lh,
            height: lines.length * lh,
        });
    }

    // 3. Variant (centered)
    if (config.showVariant && data.variant) {
        const size = fontPx(2.0);
        ctx.font = `${size}px Arial, sans-serif`;
        const lines = wrapTextLines(ctx, data.variant, innerWidth, 1);
        const lh = Math.round(size * 1.15);
        rows.push({
            type: 'text',
            lines,
            fontSize: size,
            fontWeight: 'normal',
            lineHeight: lh,
            height: lines.length * lh,
        });
    }

    // 4. Barcode (centered)
    if (config.showBarcode && data.barcode) {
        const barcodeText = String(data.barcode).trim();
        const moduleWidth = fitModuleWidth(barcodeText, innerWidth);
        const barHeight = mmToDots(config.barcodeHeightMm, dpi);
        const hrHeight = config.showBarcodeText ? fontPx(2.0) : 0;
        const symbolWidth = code128Modules(barcodeText) * moduleWidth;

        rows.push({
            type: 'barcode',
            barcodeText,
            barHeight,
            moduleWidth,
            symbolWidth,
            hrHeight,
            height: barHeight + (hrHeight ? hrHeight + 4 : 0),
        });
    }

    // 5. Price (centered, prominent)
    if (config.showPrice) {
        const priceStr = `${config.currency} ${data.price.toFixed(2)}`.trim();
        const size = fontPx(3.8);
        ctx.font = `bold ${size}px Arial, sans-serif`;
        const lines = [priceStr];
        const lh = Math.round(size * 1.15);
        rows.push({
            type: 'text',
            lines,
            fontSize: size,
            fontWeight: 'bold',
            lineHeight: lh,
            height: lh,
        });
    }

    // 6. Footer (centered)
    if (config.footer) {
        const size = fontPx(4.0);
        ctx.font = `bold ${size}px Arial, sans-serif`;
        const lines = wrapTextLines(ctx, config.footer, innerWidth, 1);
        const lh = Math.round(size * 1.15);
        rows.push({
            type: 'text',
            lines,
            fontSize: size,
            fontWeight: 'bold',
            lineHeight: lh,
            height: lines.length * lh,
        });
    }

    // Draw border if enabled
    if (config.showBorder) {
        const thickness = Math.max(1, Math.round(dpi / 100));
        ctx.lineWidth = thickness;
        ctx.strokeRect(thickness / 2, thickness / 2, alignedWidth - thickness, heightDots - thickness);
    }

    if (rows.length === 0) return { widthDots: alignedWidth, heightDots };

    // Compute vertical layout with centering
    const gap = Math.max(2, mmToDots(0.6, dpi));
    const totalGaps = gap * (rows.length - 1);
    let totalContentHeight = rows.reduce((acc, r) => acc + r.height, 0) + totalGaps;
    const availableHeight = heightDots - pad * 2 - topMargin;

    // Proportional shrink if content overflows
    if (totalContentHeight > availableHeight) {
        const shrinkFactor = availableHeight / totalContentHeight;
        for (const row of rows) {
            if (row.type === 'barcode' && row.barHeight) {
                row.barHeight = Math.max(mmToDots(3, dpi), Math.round(row.barHeight * shrinkFactor));
                row.height = row.barHeight + (row.hrHeight ? row.hrHeight + 4 : 0);
            } else if (row.fontSize && row.lineHeight) {
                row.fontSize = Math.max(6, Math.round(row.fontSize * shrinkFactor));
                row.lineHeight = Math.round(row.fontSize * 1.15);
                row.height = (row.lines?.length || 1) * row.lineHeight;
            }
        }
        totalContentHeight = rows.reduce((acc, r) => acc + r.height, 0) + totalGaps;
    }

    // Vertical start position — top margin with centered remainder
    let curY = pad + topMargin + Math.max(0, Math.round((availableHeight - totalContentHeight) / 2));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const row of rows) {
        if (row.type === 'text' && row.lines && row.fontSize && row.lineHeight) {
            ctx.font = `${row.fontWeight || 'normal'} ${row.fontSize}px Arial, sans-serif`;
            ctx.fillStyle = '#000000';
            for (let i = 0; i < row.lines.length; i++) {
                ctx.fillText(row.lines[i], centerX, curY + i * row.lineHeight);
            }
            curY += row.height + gap;
        } else if (row.type === 'barcode' && row.barcodeText && row.barHeight && row.moduleWidth) {
            const barX = Math.round((alignedWidth - (row.symbolWidth || 0)) / 2);
            const bars = code128Bars(row.barcodeText);

            ctx.fillStyle = '#000000';
            for (const [offset, width] of bars) {
                ctx.fillRect(
                    barX + offset * row.moduleWidth,
                    curY,
                    width * row.moduleWidth,
                    row.barHeight,
                );
            }

            // Human-readable barcode digits under barcode (centered)
            if (row.hrHeight) {
                ctx.font = `${row.hrHeight}px "Courier New", monospace`;
                ctx.fillText(row.barcodeText, centerX, curY + row.barHeight + 2);
            }

            curY += row.height + gap;
        }
    }

    return { widthDots: alignedWidth, heightDots };
}

/**
 * Render a label to a 1-bit monochrome bitmap.
 * Returns hex-encoded byte string where 1 = black, 0 = white, MSB = leftmost dot.
 */
export function renderLabelBitmap(
    config: LabelConfig,
    data: LabelData,
    canvasInstance?: HTMLCanvasElement,
): { imageHex: string; widthDots: number; heightDots: number } {
    const canvas = canvasInstance || document.createElement('canvas');
    const { widthDots, heightDots } = drawLabelToCanvas(config, data, canvas);

    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, widthDots, heightDots);

    const widthBytes = Math.ceil(widthDots / 8);
    const totalBytes = widthBytes * heightDots;
    const bitmap = new Uint8Array(totalBytes);

    for (let y = 0; y < heightDots; y++) {
        for (let x = 0; x < widthDots; x++) {
            const px = (y * widthDots + x) * 4;
            const r = imageData.data[px];
            const g = imageData.data[px + 1];
            const b = imageData.data[px + 2];
            const a = imageData.data[px + 3];

            // Black pixel if not transparent and dark
            if (a > 128) {
                const gray = (r * 299 + g * 587 + b * 114) / 1000;
                if (gray < 128) {
                    const byteIdx = y * widthBytes + (x >> 3);
                    bitmap[byteIdx] |= 0x80 >> (x & 7);
                }
            }
        }
    }

    // Convert to hex string
    const hexParts = new Array(totalBytes);
    for (let i = 0; i < totalBytes; i++) {
        hexParts[i] = bitmap[i].toString(16).padStart(2, '0');
    }

    return {
        imageHex: hexParts.join(''),
        widthDots,
        heightDots,
    };
}

/**
 * Send label batch as image bitmaps to the printer via Tauri `print_label_bitmap`.
 */
export async function sendLabelBitmap(
    target: ZplTarget,
    config: LabelConfig,
    items: Array<{ data: LabelData; copies: number }>,
): Promise<string> {
    if (!isTauri()) {
        throw new Error('Direct printing is only available in the desktop app.');
    }

    const { invoke } = await import('@tauri-apps/api/core');

    const labels: BitmapLabel[] = items
        .filter(item => item.copies > 0)
        .map(item => {
            const { imageHex, widthDots, heightDots } = renderLabelBitmap(config, item.data);
            return { imageHex, widthDots, heightDots, copies: item.copies };
        });

    if (labels.length === 0) {
        throw new Error('No labels to print');
    }

    return invoke<string>('print_label_bitmap', {
        job: {
            target,
            labels,
            printerModel: config.printerModel,
            density: tsplDensity(config.darkness),
            darkness: config.darkness,
            labelWidthMm: config.widthMm,
            labelHeightMm: config.heightMm,
            gapMm: config.gapMm ?? 2,
        },
    });
}

/**
 * Send a single test label as bitmap image.
 */
export async function sendTestLabelBitmap(
    target: ZplTarget,
    config: LabelConfig,
): Promise<string> {
    return sendLabelBitmap(target, config, [{ data: SAMPLE_LABEL, copies: 1 }]);
}
