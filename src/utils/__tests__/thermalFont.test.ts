import { describe, it, expect } from 'vitest';

import {
  FONT_CELL_DOTS,
  FONT_OPTIONS,
  PAPER_DOTS,
  SIZE_OPTIONS,
  columnsFor,
  describeMetrics,
  heightMultiplier,
  resolveColumns,
  scaleOverride,
  widthMultiplier,
  type EscPosFont,
  type EscPosSize,
} from '../thermalFont';

const SIZES: EscPosSize[] = ['normal', 'height', 'width', 'Double'];
const FONTS: EscPosFont[] = ['A', 'B', 'C'];

describe('escpos size multipliers', () => {
  it('doubles the width only for the wide sizes', () => {
    expect(widthMultiplier('normal')).toBe(1);
    expect(widthMultiplier('height')).toBe(1);
    expect(widthMultiplier('width')).toBe(2);
    expect(widthMultiplier('Double')).toBe(2);
  });

  it('doubles the height only for the tall sizes', () => {
    expect(heightMultiplier('normal')).toBe(1);
    expect(heightMultiplier('height')).toBe(2);
    expect(heightMultiplier('width')).toBe(1);
    expect(heightMultiplier('Double')).toBe(2);
  });
});

describe('columns per line', () => {
  it('matches the known widths for 80mm paper', () => {
    expect(columnsFor({ paperSize: 'Mm80', font: 'A', size: 'normal' })).toBe(48);
    expect(columnsFor({ paperSize: 'Mm80', font: 'B', size: 'normal' })).toBe(64);
  });

  it('matches the known widths for 58mm paper', () => {
    expect(columnsFor({ paperSize: 'Mm58', font: 'A', size: 'normal' })).toBe(32);
    expect(columnsFor({ paperSize: 'Mm58', font: 'B', size: 'normal' })).toBe(42);
  });

  it('halves the columns when the type is double width', () => {
    for (const paperSize of ['Mm58', 'Mm80'] as const) {
      for (const font of FONTS) {
        const normal = columnsFor({ paperSize, font, size: 'normal' });
        expect(columnsFor({ paperSize, font, size: 'width' })).toBe(Math.floor(normal / 2));
        expect(columnsFor({ paperSize, font, size: 'Double' })).toBe(Math.floor(normal / 2));
      }
    }
  });

  it('leaves the columns alone when only the height doubles', () => {
    for (const paperSize of ['Mm58', 'Mm80'] as const) {
      for (const font of FONTS) {
        expect(columnsFor({ paperSize, font, size: 'height' })).toBe(
          columnsFor({ paperSize, font, size: 'normal' })
        );
      }
    }
  });

  it('never returns a width a line could not use', () => {
    for (const paperSize of ['Mm58', 'Mm80'] as const) {
      for (const font of FONTS) {
        for (const size of SIZES) {
          const columns = columnsFor({ paperSize, font, size });
          expect(columns).toBeGreaterThan(0);
          expect(Number.isInteger(columns)).toBe(true);
          // Must actually fit: columns x cell width cannot exceed the paper.
          expect(columns * FONT_CELL_DOTS[font] * widthMultiplier(size)).toBeLessThanOrEqual(
            PAPER_DOTS[paperSize]
          );
        }
      }
    }
  });

  it('falls back to 80mm for an unrecognised paper size', () => {
    expect(columnsFor({ paperSize: 'Mm99' as never, font: 'B', size: 'normal' })).toBe(64);
  });
});

describe('manual characters-per-line override', () => {
  const body = { paperSize: 'Mm80', font: 'B', size: 'normal' } as const;

  it('is used as-is for a line printed in the body type', () => {
    expect(resolveColumns(body, body, 42)).toBe(42);
  });

  it('is ignored when blank, zero or nonsense', () => {
    for (const bad of [undefined, null, 0, -5, NaN]) {
      expect(resolveColumns(body, body, bad)).toBe(64);
    }
  });

  it('scales down for a larger face rather than being taken literally', () => {
    // Measured 42 columns of Font B; Font A fits 48/64 of that.
    const inFontA = resolveColumns({ ...body, font: 'A' }, body, 42);
    expect(inFontA).toBe(Math.round(42 * (48 / 64)));
    expect(inFontA).toBeLessThan(42);
  });

  it('scales down for double-width type', () => {
    expect(resolveColumns({ ...body, size: 'Double' }, body, 42)).toBe(21);
  });

  it('keeps a scaled override usable', () => {
    expect(scaleOverride(1, body, { ...body, size: 'Double' })).toBeGreaterThanOrEqual(1);
  });

  it('preserves the override when the target type equals the body type', () => {
    for (const font of FONTS) {
      for (const size of SIZES) {
        const q = { paperSize: 'Mm80', font, size } as const;
        expect(resolveColumns(q, q, 37)).toBe(37);
      }
    }
  });
});

describe('what the settings screen offers', () => {
  it('offers every real font and size, with an explanation for each', () => {
    expect(FONT_OPTIONS.map(o => o.value).sort()).toEqual(['A', 'B', 'C']);
    expect(SIZE_OPTIONS.map(o => o.value).sort()).toEqual(SIZES.slice().sort());
    for (const o of [...FONT_OPTIONS, ...SIZE_OPTIONS]) {
      expect(o.label.length, `${o.value} needs a label`).toBeGreaterThan(0);
      expect(o.hint.length, `${o.value} needs a hint`).toBeGreaterThan(10);
    }
  });

  it('lists the compact face first, since it is the receipt default', () => {
    expect(FONT_OPTIONS[0].value).toBe('B');
    expect(SIZE_OPTIONS[0].value).toBe('normal');
  });

  it('describes a choice in characters and dot height', () => {
    expect(describeMetrics({ paperSize: 'Mm80', font: 'B', size: 'normal' })).toBe(
      '64 characters per line · 17 dots tall'
    );
    expect(describeMetrics({ paperSize: 'Mm80', font: 'A', size: 'Double' })).toBe(
      '24 characters per line · 48 dots tall'
    );
  });

  it('reflects an override in the description', () => {
    expect(describeMetrics({ paperSize: 'Mm80', font: 'B', size: 'normal' }, 42)).toContain('42 characters');
  });
});
