/**
 * ZPL II preview renderer.
 *
 * Parses a label format and draws it onto a canvas at printer resolution
 * (1 canvas pixel = 1 printer dot), so the preview is a render of the actual
 * ZPL rather than a separate HTML mock-up that can drift out of sync.
 *
 * Supports the command subset the generator emits, plus a little slack so
 * hand-written ZPL still previews sensibly:
 *   ^XA ^XZ ^CI ^PW ^LL ^LH ^FO ^FT ^A ^CF ^FB ^FD ^FS ^GB ^BY ^BC ^PQ ^MD
 */

import { code128Bars, code128Modules } from './code128';
import { textWidthDots, ZPL_FONT_ADVANCE } from './generate';

interface Command {
    name: string;
    params: string[];
    /** Raw tail, used for `^FD` where commas are literal data. */
    raw: string;
}

/** Split a format into `^XX` commands. `~` commands are recognised and skipped. */
function parseCommands(zpl: string): Command[] {
    const commands: Command[] = [];
    const re = /[\^~]([A-Za-z][A-Za-z0-9])([^\^~]*)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(zpl)) !== null) {
        const raw = match[2] ?? '';
        commands.push({ name: match[1].toUpperCase(), params: raw.split(','), raw });
    }
    return commands;
}

/** Isolate one `^XA … ^XZ` format. Returns the whole string if there are none. */
export function splitLabels(zpl: string): string[] {
    const labels = zpl.match(/\^XA[\s\S]*?\^XZ/g);
    return labels && labels.length > 0 ? labels : [zpl];
}

const num = (value: string | undefined, fallback: number) => {
    const parsed = parseInt((value ?? '').trim(), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export interface ZplRenderOptions {
    /** Canvas pixels per printer dot. Larger = crisper preview. */
    scale?: number;
    /** Fallback label size in dots when the format omits `^PW` / `^LL`. */
    defaultWidth?: number;
    defaultHeight?: number;
}

export interface ZplRenderResult {
    /** Label size in printer dots. */
    widthDots: number;
    heightDots: number;
    /** Total copies requested by `^PQ`. */
    copies: number;
}

interface TextStyle {
    height: number;
    width: number;
}

/**
 * Render the first `^XA … ^XZ` format found in `zpl` onto `canvas`.
 * The canvas is resized to the label dimensions × `scale`.
 */
export function renderZpl(
    zpl: string,
    canvas: HTMLCanvasElement,
    options: ZplRenderOptions = {},
): ZplRenderResult {
    const scale = options.scale ?? 3;
    const commands = parseCommands(splitLabels(zpl)[0] ?? '');

    let widthDots = options.defaultWidth ?? 400;
    let heightDots = options.defaultHeight ?? 240;
    let copies = 1;

    // `^PW` / `^LL` decide the canvas size, so read them before drawing.
    for (const command of commands) {
        if (command.name === 'PW') widthDots = num(command.params[0], widthDots);
        else if (command.name === 'LL') heightDots = num(command.params[0], heightDots);
        else if (command.name === 'PQ') copies = Math.max(1, num(command.params[0], 1));
    }

    canvas.width = Math.max(1, Math.round(widthDots * scale));
    canvas.height = Math.max(1, Math.round(heightDots * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) return { widthDots, heightDots, copies };

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthDots, heightDots);
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';

    // Drawing state
    let originX = 0;
    let originY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let font: TextStyle = { height: 20, width: 20 };
    let defaultFont: TextStyle = { height: 20, width: 20 };
    let block: { width: number; lines: number; spacing: number; justify: string } | null = null;
    let byModule = 2;
    let byHeight = 50;
    let pendingBarcode:
        | { height: number; showText: boolean; textAbove: boolean }
        | null = null;

    /**
     * Split `text` into at most `maxLines` lines that fit `maxWidth`.
     *
     * Line breaking uses the printer's font metrics, not the browser's, so the
     * preview breaks where the printer will — the canvas font is only an
     * approximation of CG Triumvirate and measures narrower.
     */
    const wrapText = (text: string, maxWidth: number, maxLines: number): string[] => {
        if (maxLines <= 1) return [text];
        const fits = (candidate: string) => textWidthDots(candidate, font.height) <= maxWidth;
        const charsPerLine = Math.max(1, Math.floor(maxWidth / (font.height * ZPL_FONT_ADVANCE)));

        const lines: string[] = [];
        let current = '';
        for (const word of text.split(' ')) {
            const candidate = current ? `${current} ${word}` : word;
            if (fits(candidate) || !current) {
                current = candidate;
            } else {
                lines.push(current);
                current = word;
                if (lines.length === maxLines) break;
            }
            // A single word wider than the block is broken mid-word, as ^FB does.
            while (!fits(current) && current.length > charsPerLine && lines.length < maxLines) {
                lines.push(current.slice(0, charsPerLine));
                current = current.slice(charsPerLine);
            }
        }
        if (lines.length < maxLines && current) lines.push(current);
        return lines.slice(0, maxLines);
    };

    const drawText = (text: string) => {
        // ZPL font 0 is a Helvetica-alike; the glyph box sits inside the cell.
        const size = font.height * 0.82;
        ctx.font = `${size}px Helvetica, Arial, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        const x = originX + cursorX;
        const y = originY + cursorY;
        const padTop = (font.height - size) / 2;

        if (!block) {
            ctx.fillText(text, x, y + padTop);
            return;
        }

        const lines = wrapText(text, block.width, block.lines);
        lines.forEach((line, index) => {
            const lineY = y + padTop + index * (font.height + block!.spacing);
            let lineX = x;
            const lineWidth = ctx.measureText(line).width;
            if (block!.justify === 'C') lineX = x + (block!.width - lineWidth) / 2;
            else if (block!.justify === 'R') lineX = x + block!.width - lineWidth;
            ctx.fillText(line, lineX, lineY);
        });
    };

    const drawBarcode = (data: string, spec: NonNullable<typeof pendingBarcode>) => {
        const x = originX + cursorX;
        const y = originY + cursorY;
        const barsHeight = spec.height;
        const textHeight = spec.showText ? font.height : 0;
        const barsY = spec.showText && spec.textAbove ? y + textHeight : y;

        for (const [offset, width] of code128Bars(data)) {
            ctx.fillRect(x + offset * byModule, barsY, width * byModule, barsHeight);
        }

        if (spec.showText) {
            const size = font.height * 0.82;
            ctx.font = `${size}px Helvetica, Arial, sans-serif`;
            ctx.textBaseline = 'top';
            const symbolWidth = code128Modules(data) * byModule;
            const textWidth = ctx.measureText(data).width;
            const textX = x + (symbolWidth - textWidth) / 2;
            const textY = spec.textAbove ? y : barsY + barsHeight + font.height * 0.15;
            ctx.fillText(data, textX, textY);
        }
    };

    for (const command of commands) {
        const { name, params, raw } = command;

        switch (name) {
            case 'LH':
                originX = num(params[0], 0);
                originY = num(params[1], 0);
                break;

            case 'FO':
            case 'FT':
                cursorX = num(params[0], 0);
                cursorY = num(params[1], 0);
                break;

            case 'CF': {
                // ^CFf,h,w — set the default font
                defaultFont = {
                    height: num(params[1], defaultFont.height),
                    width: num(params[2], num(params[1], defaultFont.width)),
                };
                font = { ...defaultFont };
                break;
            }

            case 'A0':
            case 'AA':
            case 'AB':
            case 'AD':
            case 'AE':
            case 'AF':
            case 'AG': {
                // ^A0N,h,w — the orientation letter is folded into params[0]
                const height = num(params[1], font.height);
                font = { height, width: num(params[2], height) };
                break;
            }

            case 'FB':
                block = {
                    width: num(params[0], widthDots),
                    lines: Math.max(1, num(params[1], 1)),
                    spacing: num(params[2], 0),
                    justify: (params[3] || 'L').trim().toUpperCase(),
                };
                break;

            case 'BY':
                byModule = Math.max(1, num(params[0], byModule));
                byHeight = num(params[2], byHeight);
                break;

            case 'BC':
                pendingBarcode = {
                    height: num(params[1], byHeight),
                    showText: (params[2] || 'Y').trim().toUpperCase() !== 'N',
                    textAbove: (params[3] || 'N').trim().toUpperCase() === 'Y',
                };
                break;

            case 'GB': {
                const boxWidth = num(params[0], 0);
                const boxHeight = num(params[1], 0);
                const thickness = Math.max(1, num(params[2], 1));
                const x = originX + cursorX;
                const y = originY + cursorY;
                // A ^GB thinner than its border is a solid line, not a box.
                if (boxWidth <= thickness || boxHeight <= thickness) {
                    ctx.fillRect(x, y, Math.max(boxWidth, thickness), Math.max(boxHeight, thickness));
                } else {
                    ctx.lineWidth = thickness;
                    ctx.strokeRect(
                        x + thickness / 2,
                        y + thickness / 2,
                        boxWidth - thickness,
                        boxHeight - thickness,
                    );
                }
                break;
            }

            case 'FD': {
                const data = raw;
                if (pendingBarcode) drawBarcode(data, pendingBarcode);
                else drawText(data);
                break;
            }

            case 'FS':
                pendingBarcode = null;
                block = null;
                font = { ...defaultFont };
                break;

            default:
                break; // ^XA, ^XZ, ^CI, ^MD, ^PQ, ^PR … nothing to draw
        }
    }

    return { widthDots, heightDots, copies };
}
