import { describe, it, expect } from 'vitest';

import {
  bodyQuery,
  feedLines,
  hardwareOptions,
  headline,
  jobStyles,
  nativeBold,
  nativeDefaultWidth,
  nativeFont,
  nativeHeadingSize,
  nativeHeadingWidth,
  nativeTextSize,
  nativeTotalFont,
  nativeTotalSize,
  nativeTotalWidth,
  nativeWidth,
  nativeWidthFor,
  textEmphasis,
  type ThermalPrinterConfig,
} from '../thermalPrinter';

/**
 * These settings replaced values that used to be hard-coded. The defaults must
 * therefore reproduce the old behaviour exactly, or every existing install
 * silently changes how its receipts print the moment it updates.
 */
const base = (over: Partial<ThermalPrinterConfig> = {}): ThermalPrinterConfig => ({
  connectionType: 'USB',
  ipAddress: '',
  printerName: 'POS-80',
  paperSize: 'Mm80',
  businessName: 'Test Shop',
  invoiceMode: 'native',
  ...over,
});

describe('defaults reproduce the previous hard-coded behaviour', () => {
  const config = base();

  it('prints the body in the compact face at normal size', () => {
    expect(nativeFont(config)).toBe('B');
    expect(nativeTextSize(config)).toBe('normal');
    expect(nativeBold(config)).toBe(false);
  });

  it('prints the business name double height', () => {
    expect(nativeHeadingSize(config)).toBe('height');
  });

  it('prints the grand total in Font A at normal size', () => {
    expect(nativeTotalFont(config)).toBe('A');
    expect(nativeTotalSize(config)).toBe('normal');
  });

  it('keeps the historic widths', () => {
    expect(nativeWidth(config)).toBe(64); // Font B on 80mm
    expect(nativeTotalWidth(config)).toBe(48); // Font A on 80mm
    expect(nativeWidth(base({ paperSize: 'Mm58' }))).toBe(42);
  });

  it('feeds three lines and cuts, without beeping or opening the drawer', () => {
    expect(feedLines(config)).toBe(3);
    expect(hardwareOptions(config)).toEqual({
      cut_paper: true,
      beep: false,
      open_cash_drawer: false,
    });
  });

  it('opens a job with the compact face at normal size', () => {
    expect(jobStyles(config)).toEqual({ font: 'B', size: 'normal', bold: false });
  });
});

describe('the chosen font drives every derived width', () => {
  it('narrows the body when the larger face is chosen', () => {
    expect(nativeWidth(base({ nativeFont: 'A' }))).toBe(48);
    expect(nativeWidth(base({ nativeFont: 'A', paperSize: 'Mm58' }))).toBe(32);
  });

  it('halves the body when the body is double width', () => {
    expect(nativeWidth(base({ nativeTextSize: 'width' }))).toBe(32);
    expect(nativeWidth(base({ nativeTextSize: 'Double' }))).toBe(32);
  });

  it('leaves the body alone when only the height doubles', () => {
    expect(nativeWidth(base({ nativeTextSize: 'height' }))).toBe(64);
  });

  it('gives the heading its own width when it prints larger than the body', () => {
    const config = base({ nativeHeadingSize: 'Double' });
    expect(nativeWidth(config)).toBe(64);
    // A heading padded to 64 would wrap; it gets 32.
    expect(nativeHeadingWidth(config)).toBe(32);
  });

  it('gives the total its own width', () => {
    const config = base({ nativeTotalFont: 'A', nativeTotalSize: 'Double' });
    expect(nativeTotalWidth(config)).toBe(24);
  });

  it('lets the heading match the body when the sizes agree', () => {
    const config = base({ nativeHeadingSize: 'normal' });
    expect(nativeHeadingWidth(config)).toBe(nativeWidth(config));
  });

  it('reports the body metrics as one query', () => {
    expect(bodyQuery(base({ nativeFont: 'A', nativeTextSize: 'height' }))).toEqual({
      paperSize: 'Mm80',
      font: 'A',
      size: 'height',
    });
  });
});

describe('a manual characters-per-line override', () => {
  it('wins over the calculated body width', () => {
    expect(nativeWidth(base({ nativeColumns: 42 }))).toBe(42);
  });

  it('does not disturb the nominal width used for scaling', () => {
    expect(nativeDefaultWidth(base({ nativeColumns: 42 }))).toBe(64);
  });

  it('is scaled, not copied, onto the heading and the total', () => {
    const config = base({ nativeColumns: 42, nativeHeadingSize: 'Double' });
    expect(nativeHeadingWidth(config)).toBe(21);
    // Font A fits 48 where Font B fits 64, so 42 measured columns become 32.
    expect(nativeTotalWidth(config)).toBe(Math.round(42 * (48 / 64)));
  });

  it('is measured against the body type, so changing the body rescales it', () => {
    // 42 columns measured while the body was Font A -> Font A width is 42.
    expect(nativeWidthFor(base({ nativeColumns: 42, nativeFont: 'A' }), 'A')).toBe(42);
  });
});

describe('job styles and hardware options follow the settings', () => {
  it('carries the chosen face, size and weight into the job', () => {
    expect(jobStyles(base({ nativeFont: 'A', nativeTextSize: 'Double', nativeBold: true }))).toEqual({
      font: 'A',
      size: 'Double',
      bold: true,
    });
  });

  it('passes the hardware toggles through', () => {
    expect(hardwareOptions(base({ cutPaper: false, beep: true, openCashDrawer: true }))).toEqual({
      cut_paper: false,
      beep: true,
      open_cash_drawer: true,
    });
  });

  it('clamps the feed to something a printer will accept', () => {
    expect(feedLines(base({ feedLines: 0 }))).toBe(0);
    expect(feedLines(base({ feedLines: 10 }))).toBe(10);
    expect(feedLines(base({ feedLines: 99 }))).toBe(10);
    expect(feedLines(base({ feedLines: -4 }))).toBe(3);
    expect(feedLines(base({ feedLines: NaN }))).toBe(3);
    expect(feedLines(base({ feedLines: 2.6 }))).toBe(3);
  });
});

describe('sections built from the settings', () => {
  it('centres a heading on the width it is given, at the size asked for', () => {
    const section = headline('SHOP', 10, 'Double') as unknown as { Text: { text: string; styles: Record<string, unknown> } };
    expect(section.Text.text).toBe('   SHOP');
    expect(section.Text.styles.size).toBe('Double');
    expect(section.Text.styles.bold).toBe(true);
  });

  it('truncates a heading rather than letting it wrap', () => {
    const section = headline('A VERY LONG BUSINESS NAME', 8) as unknown as { Text: { text: string } };
    expect(section.Text.text).toHaveLength(8);
  });

  it('defaults a heading to double height, as before', () => {
    const section = headline('SHOP', 10) as unknown as { Text: { styles: Record<string, unknown> } };
    expect(section.Text.styles.size).toBe('height');
  });

  it('gives the emphasised total the configured face and size', () => {
    const section = textEmphasis(
      base({ nativeTotalFont: 'A', nativeTotalSize: 'height' }),
      'GRAND TOTAL: 500'
    ) as unknown as { Text: { styles: Record<string, unknown> } };

    expect(section.Text.styles.font).toBe('A');
    expect(section.Text.styles.size).toBe('height');
    expect(section.Text.styles.bold).toBe(true);
  });
});
