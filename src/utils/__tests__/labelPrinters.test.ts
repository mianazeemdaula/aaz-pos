import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LABEL_CONFIG,
  SAMPLE_LABEL,
  buildLabelZpl,
  buildBatchZpl,
  buildLabelTspl,
  buildBatchTspl,
  buildLabelCode,
  buildBatchCode,
  selectTsplFont,
  tsplDensity,
  escapeTspl,
  isLikelySpeedXPrinter,
  isLikelyZebraPrinter,
  isLikelyLabelPrinter,
  detectPrinterModel,
  renderLabel,
  type LabelConfig,
} from '../zpl';

describe('Speed-X & Zebra Printer Detection', () => {
  it('detects various Speed-X printer names', () => {
    expect(isLikelySpeedXPrinter('Speed-X SP-700U')).toBe(true);
    expect(isLikelySpeedXPrinter('SpeedX SPT-710B')).toBe(true);
    expect(isLikelySpeedXPrinter('SPEED-X SP-690')).toBe(true);
    expect(isLikelySpeedXPrinter('SpeedX SP-650UL')).toBe(true);
    expect(isLikelySpeedXPrinter('SP-700 Thermal Printer')).toBe(true);
    expect(isLikelySpeedXPrinter('TSC TTP-244 Pro')).toBe(true);
    expect(isLikelySpeedXPrinter('Xprinter XP-365B')).toBe(true);
  });

  it('detects various Zebra printer names', () => {
    expect(isLikelyZebraPrinter('Zebra ZD230')).toBe(true);
    expect(isLikelyZebraPrinter('Zebra GK420d')).toBe(true);
    expect(isLikelyZebraPrinter('ZD220 Direct Thermal')).toBe(true);
    expect(isLikelyZebraPrinter('ZDesigner ZD421-203dpi ZPL')).toBe(true);
  });

  it('identifies general label printers', () => {
    expect(isLikelyLabelPrinter('Speed-X SP-700U')).toBe(true);
    expect(isLikelyLabelPrinter('Zebra ZD230')).toBe(true);
    expect(isLikelyLabelPrinter('Barcode Label Printer')).toBe(true);
    expect(isLikelyLabelPrinter('HP LaserJet Pro')).toBe(false);
  });

  it('auto-detects model family correctly', () => {
    expect(detectPrinterModel('Speed-X SP-700U')).toBe('speedx');
    expect(detectPrinterModel('Zebra ZD220')).toBe('zebra');
    expect(detectPrinterModel('Generic Label Printer')).toBe('zebra');
  });
});

describe('TSPL Label Generation for Speed-X', () => {
  const baseConfig: LabelConfig = {
    ...DEFAULT_LABEL_CONFIG,
    printerModel: 'speedx',
    widthMm: 50,
    heightMm: 30,
    gapMm: 2,
    darkness: 0,
    shopName: 'Aazify POS',
  };

  it('maps darkness to TSPL density properly', () => {
    expect(tsplDensity(0)).toBe(8);
    expect(tsplDensity(30)).toBe(15);
    expect(tsplDensity(-30)).toBe(1);
    expect(tsplDensity(15)).toBe(12);
  });

  it('escapes quotes and illegal characters', () => {
    expect(escapeTspl('Hello "World"')).toBe("Hello 'World'");
    expect(escapeTspl('Line1\nLine2\tBack\\slash')).toBe('Line1 Line2 Back slash');
  });

  it('selects appropriate bitmap font based on dot height', () => {
    expect(selectTsplFont(12).font).toBe('1');
    expect(selectTsplFont(20).font).toBe('2');
    expect(selectTsplFont(24).font).toBe('3');
    expect(selectTsplFont(32).font).toBe('4');
    expect(selectTsplFont(48).font).toBe('5');
  });

  it('generates valid TSPL commands with SIZE, GAP, CLS, BARCODE, and PRINT', () => {
    const tspl = buildLabelTspl(baseConfig, SAMPLE_LABEL, 2);

    expect(tspl).toContain('SIZE 50 mm, 30 mm');
    expect(tspl).toContain('GAP 2 mm, 0 mm');
    expect(tspl).toContain('DIRECTION 1');
    expect(tspl).toContain('CLS');
    expect(tspl).toContain('TEXT');
    expect(tspl).toContain('Aazify POS');
    expect(tspl).toContain('BARCODE');
    expect(tspl).toContain('"128"');
    expect(tspl).toContain(SAMPLE_LABEL.barcode);
    expect(tspl).toContain('PRINT 2, 1');
  });

  it('includes border when showBorder is enabled', () => {
    const withBorder = buildLabelTspl({ ...baseConfig, showBorder: true }, SAMPLE_LABEL, 1);
    expect(withBorder).toContain('BOX 1, 1');
  });

  it('generates batch TSPL formats for multiple items', () => {
    const batch = buildBatchTspl(baseConfig, [
      { data: { ...SAMPLE_LABEL, barcode: '111111' }, copies: 2 },
      { data: { ...SAMPLE_LABEL, barcode: '222222' }, copies: 3 },
    ]);

    expect(batch).toContain('111111');
    expect(batch).toContain('PRINT 2, 1');
    expect(batch).toContain('222222');
    expect(batch).toContain('PRINT 3, 1');
  });
});

describe('Unified Label Dispatcher (Speed-X & Zebra)', () => {
  const speedxConfig: LabelConfig = { ...DEFAULT_LABEL_CONFIG, printerModel: 'speedx' };
  const zebraConfig: LabelConfig = { ...DEFAULT_LABEL_CONFIG, printerModel: 'zebra' };

  it('buildLabelCode routes to TSPL for speedx and ZPL for zebra', () => {
    const speedxCode = buildLabelCode(speedxConfig, SAMPLE_LABEL, 1);
    expect(speedxCode).toContain('SIZE 50 mm, 30 mm');
    expect(speedxCode).toContain('PRINT 1, 1');
    expect(speedxCode).not.toContain('^XA');

    const zebraCode = buildLabelCode(zebraConfig, SAMPLE_LABEL, 1);
    expect(zebraCode).toContain('^XA');
    expect(zebraCode).toContain('^XZ');
    expect(zebraCode).not.toContain('SIZE 50 mm');
    expect(buildLabelZpl(zebraConfig, SAMPLE_LABEL, 1)).toBe(zebraCode);
  });

  it('buildBatchCode routes batch jobs according to printerModel', () => {
    const items = [{ data: SAMPLE_LABEL, copies: 1 }];
    const speedxBatch = buildBatchCode(speedxConfig, items);
    expect(speedxBatch).toContain('CLS');

    const zebraBatch = buildBatchCode(zebraConfig, items);
    expect(zebraBatch).toContain('^XA');
    expect(buildBatchZpl(zebraConfig, items)).toBe(zebraBatch);
  });
});

describe('Label Preview Renderer', () => {
  it('identifies and parses both ZPL and TSPL formats', () => {
    const dummyCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        setTransform: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        measureText: () => ({ width: 50 }),
      }),
    } as unknown as HTMLCanvasElement;

    const tspl = 'SIZE 50 mm, 30 mm\r\nCLS\r\nTEXT 10,10,"3",0,1,1,"Test"\r\nPRINT 2,1\r\n';
    const tsplResult = renderLabel(tspl, dummyCanvas);
    expect(tsplResult.widthDots).toBeGreaterThan(0);
    expect(tsplResult.heightDots).toBeGreaterThan(0);
    expect(tsplResult.copies).toBe(2);

    const zpl = '^XA^PW400^LL240^FO10,10^FDTest^FS^PQ3^XZ';
    const zplResult = renderLabel(zpl, dummyCanvas);
    expect(zplResult.widthDots).toBe(400);
    expect(zplResult.heightDots).toBe(240);
    expect(zplResult.copies).toBe(3);
  });
});
