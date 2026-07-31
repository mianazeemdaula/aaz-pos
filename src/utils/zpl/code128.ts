/**
 * Code 128 encoder.
 *
 * Used for two things:
 *   1. Measuring the exact printed width of a `^BC` field so the generator can
 *      centre it inside the label with a plain `^FO`.
 *   2. Drawing the same bars in the on-screen preview.
 *
 * The subset-switching rules mirror the ZPL `^BC…,A` (automatic) mode so the
 * measured width matches what the printer actually lays down.
 */

/** Bar/space module widths for values 0-106. Digits alternate bar, space, … */
const PATTERNS = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const CODE_B = 100;
const START_B = 104;
const START_C = 105;
const STOP = 106;

const isDigit = (ch: string) => ch >= '0' && ch <= '9';

function digitRun(data: string, from: number): number {
    let n = 0;
    while (from + n < data.length && isDigit(data[from + n])) n++;
    return n;
}

/** Printable-ASCII value in subset B; anything else degrades to '?'. */
function valueB(ch: string): number {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) return '?'.charCodeAt(0) - 32;
    return code - 32;
}

/**
 * Encode to raw symbol values: start, payload, checksum, stop.
 * Only subsets B and C are used — that covers every character a barcode field
 * can realistically hold and matches the printer's automatic mode.
 */
export function encodeCode128(data: string): number[] {
    const values: number[] = [];
    const lead = digitRun(data, 0);
    let mode: 'B' | 'C' =
        lead >= 4 || (lead === data.length && data.length >= 2 && data.length % 2 === 0) ? 'C' : 'B';

    values.push(mode === 'C' ? START_C : START_B);

    let i = 0;
    while (i < data.length) {
        if (mode === 'C') {
            if (digitRun(data, i) >= 2) {
                values.push(parseInt(data.substring(i, i + 2), 10));
                i += 2;
            } else {
                values.push(CODE_B);
                mode = 'B';
            }
        } else {
            const run = digitRun(data, i);
            const worthSwitching = run >= 6 || (run >= 4 && i + run === data.length);
            if (worthSwitching) {
                // Subset C consumes digits in pairs — emit a lone digit first if
                // the run would otherwise start on an odd boundary.
                if (run % 2 === 1) {
                    values.push(valueB(data[i]));
                    i++;
                }
                values.push(99); // CODE C
                mode = 'C';
                continue;
            }
            values.push(valueB(data[i]));
            i++;
        }
    }

    // Modulo-103 checksum over start (weight 1) + payload (weights 1, 2, 3, …)
    let sum = values[0];
    for (let p = 1; p < values.length; p++) sum += values[p] * p;
    values.push(sum % 103);
    values.push(STOP);

    return values;
}

/** Total width of the symbol in modules (no quiet zone). */
export function code128Modules(data: string): number {
    if (!data) return 0;
    return encodeCode128(data).reduce(
        (total, value) => total + [...PATTERNS[value]].reduce((w, d) => w + Number(d), 0),
        0,
    );
}

/** Printed width in printer dots for a given module (`^BY`) width. */
export function code128WidthDots(data: string, moduleDots: number): number {
    return code128Modules(data) * moduleDots;
}

/** Bar runs as `[xOffsetInModules, widthInModules]` pairs, for canvas drawing. */
export function code128Bars(data: string): Array<[number, number]> {
    const bars: Array<[number, number]> = [];
    if (!data) return bars;
    let x = 0;
    for (const value of encodeCode128(data)) {
        const pattern = PATTERNS[value];
        for (let i = 0; i < pattern.length; i++) {
            const width = Number(pattern[i]);
            if (i % 2 === 0) bars.push([x, width]); // even index = bar
            x += width;
        }
    }
    return bars;
}

/** Largest module width in `[min, max]` whose symbol still fits `availableDots`. */
export function fitModuleWidth(data: string, availableDots: number, min = 1, max = 4): number {
    const modules = code128Modules(data);
    if (!modules) return min;
    for (let m = max; m > min; m--) {
        if (modules * m <= availableDots) return m;
    }
    return min;
}
