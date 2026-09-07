/**
 * Type metrics for native ESC/POS printing.
 *
 * Kept free of localStorage and Tauri so the column arithmetic — the part that
 * decides whether a receipt line wraps or fits — can be unit tested on its own.
 *
 * The one rule everything here serves: a thermal printer has a fixed number of
 * dots across, and a character occupies `cell width x size multiplier` of them.
 * Get that wrong and every padded line on the slip wraps at an arbitrary point.
 */

/** ESC/POS type faces. A is the large face, B the compact one. */
export type EscPosFont = 'A' | 'B' | 'C';

/** ESC/POS character scaling. `Double` is double width *and* height. */
export type EscPosSize = 'normal' | 'height' | 'width' | 'Double';

export type EscPosPaper = 'Mm58' | 'Mm80';

/** Character cell width in dots, per face. */
export const FONT_CELL_DOTS: Record<EscPosFont, number> = { A: 12, B: 9, C: 9 };

/** Character cell height in dots, per face — used to describe the result. */
export const FONT_CELL_HEIGHT_DOTS: Record<EscPosFont, number> = { A: 24, B: 17, C: 17 };

/** Printable dots across, per paper size. */
export const PAPER_DOTS: Record<EscPosPaper, number> = { Mm80: 576, Mm58: 384 };

/** How many cells wide one character becomes at this size. */
export function widthMultiplier(size: EscPosSize): number {
    return size === 'width' || size === 'Double' ? 2 : 1;
}

/** How many cells tall one character becomes at this size. */
export function heightMultiplier(size: EscPosSize): number {
    return size === 'height' || size === 'Double' ? 2 : 1;
}

export interface ColumnQuery {
    paperSize: EscPosPaper;
    font: EscPosFont;
    size: EscPosSize;
}

/**
 * Characters that fit on one line.
 *
 * Doubling the width halves the columns, which is why a heading that looks fine
 * at `normal` wraps the moment someone picks `Double`.
 */
export function columnsFor({ paperSize, font, size }: ColumnQuery): number {
    const dots = PAPER_DOTS[paperSize] ?? PAPER_DOTS.Mm80;
    const cell = (FONT_CELL_DOTS[font] ?? FONT_CELL_DOTS.A) * widthMultiplier(size);
    return Math.max(1, Math.floor(dots / cell));
}

/**
 * Apply a manual characters-per-line override, scaled to the face and size
 * actually being printed.
 *
 * The override is entered against the *body* type, because that is the width a
 * user measures off a real slip. A heading printed larger has to be scaled down
 * from it in the same proportion, not handed the body's number.
 */
export function scaleOverride(
    override: number,
    base: ColumnQuery,
    target: ColumnQuery,
): number {
    const baseColumns = columnsFor(base);
    const targetColumns = columnsFor(target);
    if (baseColumns === targetColumns) return Math.max(1, Math.round(override));
    return Math.max(1, Math.round(override * (targetColumns / baseColumns)));
}

/**
 * Final column count for a line: the measured width if one was configured,
 * otherwise the nominal width for the paper, face and size.
 */
export function resolveColumns(
    target: ColumnQuery,
    body: ColumnQuery,
    override?: number | null,
): number {
    if (!override || !Number.isFinite(override) || override <= 0) return columnsFor(target);
    return scaleOverride(override, body, target);
}

// ─── Option lists for the settings screen ───────────────────────────────────

export interface FontOption {
    value: EscPosFont;
    label: string;
    hint: string;
}

export const FONT_OPTIONS: readonly FontOption[] = [
    { value: 'B', label: 'Font B — Compact', hint: '9 dots wide. Fits the most on a line; the usual receipt face.' },
    { value: 'A', label: 'Font A — Standard', hint: '12 dots wide. Larger and easier to read, ~25% fewer characters per line.' },
    { value: 'C', label: 'Font C — Compact (if supported)', hint: 'Not present on every printer; falls back to Font B on those that lack it.' },
];

export interface SizeOption {
    value: EscPosSize;
    label: string;
    hint: string;
}

export const SIZE_OPTIONS: readonly SizeOption[] = [
    { value: 'normal', label: 'Normal', hint: 'One cell per character.' },
    { value: 'height', label: 'Tall (double height)', hint: 'Twice as tall, same characters per line.' },
    { value: 'width', label: 'Wide (double width)', hint: 'Twice as wide — halves the characters per line.' },
    { value: 'Double', label: 'Large (double both)', hint: 'Twice as tall and wide — halves the characters per line.' },
];

/** A short human description of what a choice yields, for the settings preview. */
export function describeMetrics(query: ColumnQuery, override?: number | null): string {
    const columns = resolveColumns(query, query, override);
    const height = FONT_CELL_HEIGHT_DOTS[query.font] * heightMultiplier(query.size);
    return `${columns} characters per line · ${height} dots tall`;
}
