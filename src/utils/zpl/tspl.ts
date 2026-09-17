/**
 * TSPL / TSPL2 label generation for Speed-X, TSC, and compatible barcode printers.
 *
 * Emits standard TSPL commands (SIZE, GAP, DIRECTION, CLS, TEXT, BARCODE, BOX, PRINT)
 * so labels print natively and crisply on Speed-X thermal barcode printers (such as
 * SP-700U, SPT-710B, SP-690, SP-650UL, etc.) without relying on ZPL emulation.
 */

import { code128WidthDots } from './code128';
import {
    type LabelConfig,
    type LabelData,
    buildRows,
} from './generate';

export interface TsplFontMatch {
    font: string;
    xMult: number;
    yMult: number;
    charWidth: number;
    charHeight: number;
}

/**
 * Select built-in TSPL bitmap font and scaling multipliers closest to requested height in dots.
 * Built-in TSPL bitmap fonts:
 *   1: 8 x 12 dots
 *   2: 12 x 20 dots
 *   3: 16 x 24 dots
 *   4: 24 x 32 dots
 *   5: 32 x 48 dots
 */
export function selectTsplFont(targetHeightDots: number): TsplFontMatch {
    if (targetHeightDots <= 15) {
        return { font: '1', xMult: 1, yMult: 1, charWidth: 8, charHeight: 12 };
    }
    if (targetHeightDots <= 21) {
        return { font: '2', xMult: 1, yMult: 1, charWidth: 12, charHeight: 20 };
    }
    if (targetHeightDots <= 27) {
        return { font: '3', xMult: 1, yMult: 1, charWidth: 16, charHeight: 24 };
    }
    if (targetHeightDots <= 38) {
        return { font: '4', xMult: 1, yMult: 1, charWidth: 24, charHeight: 32 };
    }
    if (targetHeightDots <= 54) {
        return { font: '5', xMult: 1, yMult: 1, charWidth: 32, charHeight: 48 };
    }
    // High-resolution / large text: Font 4 with 2x2 multiplier (48x64 dots)
    return { font: '4', xMult: 2, yMult: 2, charWidth: 48, charHeight: 64 };
}

/** Strip quotes, backslashes, and control characters for safe TSPL string literals. */
export function escapeTspl(text: string): string {
    return text.replace(/"/g, "'").replace(/[\r\n\t\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Wrap text into lines that fit within maxCharPerLine, up to maxLines. */
function wrapTsplLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
    if (maxLines <= 1 || text.length <= maxCharsPerLine) return [text.slice(0, maxCharsPerLine * maxLines)];

    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxCharsPerLine) {
            current = candidate;
        } else {
            if (current) lines.push(current);
            current = word;
            if (lines.length >= maxLines) break;
        }
    }
    if (current && lines.length < maxLines) {
        lines.push(current);
    }

    return lines.slice(0, maxLines);
}

/**
 * Map generic darkness setting (-30..30, 0 = default) to TSPL DENSITY (1..15, 8 = default).
 */
export function tsplDensity(darkness: number): number {
    if (darkness === 0) return 8;
    const mapped = Math.round(8 + (darkness / 30) * 7);
    return Math.max(1, Math.min(15, mapped));
}

/**
 * Build TSPL commands for a single label.
 */
export function buildLabelTspl(config: LabelConfig, data: LabelData, copies = 1): string {
    const { rows, width, height, pad, innerWidth, gap, startY } = buildRows(config, data);
    const density = tsplDensity(config.darkness);
    const gapMm = config.gapMm ?? 2;

    const lines: string[] = [
        `SIZE ${config.widthMm} mm, ${config.heightMm} mm`,
        `GAP ${gapMm} mm, 0 mm`,
        'DIRECTION 1',
        'REFERENCE 0, 0',
        `DENSITY ${density}`,
        'CLS',
    ];

    if (config.showBorder) {
        const thickness = Math.max(1, Math.round(config.dpi / 100));
        lines.push(`BOX 1, 1, ${width - 1}, ${height - 1}, ${thickness}`);
    }

    let y = startY;

    for (const row of rows) {
        if (row.kind === 'barcode' && row.barHeight && row.module) {
            const module = row.module;
            const barWidth = code128WidthDots(row.text, module);
            const x = Math.max(pad, Math.round((width - barWidth) / 2));
            const readable = config.showBarcodeText ? 2 : 0; // 2 = centered text in TSPL
            const safeText = escapeTspl(row.text);

            lines.push(`BARCODE ${x}, ${y}, "128", ${row.barHeight}, ${readable}, 0, ${module}, ${module}, "${safeText}"`);
        } else {
            const fontMatch = selectTsplFont(row.fontHeight);
            const charsPerLine = Math.max(1, Math.floor(innerWidth / fontMatch.charWidth));
            const wrapped = wrapTsplLines(row.text, charsPerLine, row.lines);
            const safeWrapped = wrapped.map(escapeTspl).filter(Boolean);

            let lineY = y;
            for (const lineText of safeWrapped) {
                const textWidth = lineText.length * fontMatch.charWidth;
                const x = Math.max(pad, Math.round((width - textWidth) / 2));
                lines.push(`TEXT ${x}, ${lineY}, "${fontMatch.font}", 0, ${fontMatch.xMult}, ${fontMatch.yMult}, "${lineText}"`);
                lineY += fontMatch.charHeight + 2;
            }
        }
        y += row.height + gap;
    }

    lines.push(`PRINT ${Math.max(1, copies)}, 1`);
    return lines.join('\r\n') + '\r\n';
}

/**
 * Concatenated TSPL formats for a batch of labels.
 */
export function buildBatchTspl(
    config: LabelConfig,
    items: Array<{ data: LabelData; copies: number }>,
): string {
    return items
        .filter(item => item.copies > 0)
        .map(item => buildLabelTspl(config, item.data, item.copies))
        .join('\r\n');
}
