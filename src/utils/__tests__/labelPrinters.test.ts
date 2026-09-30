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
  checkNativeLabel,
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
    expect(isLikelySpeedXPrinter('4BARCODE 3B-365B')).toBe(true);
    expect(isLikelySpeedXPrinter('4barcode 3b-365b')).toBe(true);
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
    expect(detectPrinterModel('4BARCODE 3B-365B')).toBe('speedx');
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
    expect(tspl).toContain('SPEED 4');
    expect(tspl).toContain('CLS');
    expect(tspl).toContain('TEXT');
    expect(tspl).toContain('Aazify POS');
    expect(tspl).toContain('BARCODE');
    expect(tspl).toContain('"128"');
    expect(tspl).toContain(SAMPLE_LABEL.barcode);
    expect(tspl).toContain('PRINT 2,1');
    expect(tspl).not.toContain('REFERENCE');
  });

  it('includes border when showBorder is enabled', () => {
    const withBorder = buildLabelTspl({ ...baseConfig, showBorder: true }, SAMPLE_LABEL, 1);
    expect(withBorder).toContain('BOX 1,1');
  });

  it('generates batch TSPL formats for multiple items', () => {
    const batch = buildBatchTspl(baseConfig, [
      { data: { ...SAMPLE_LABEL, barcode: '111111' }, copies: 2 },
      { data: { ...SAMPLE_LABEL, barcode: '222222' }, copies: 3 },
    ]);

    expect(batch).toContain('111111');
    expect(batch).toContain('PRINT 2,1');
    expect(batch).toContain('222222');
    expect(batch).toContain('PRINT 3,1');
  });
});

describe('Printer-fonts (native) mode', () => {
  const speedx: LabelConfig = { ...DEFAULT_LABEL_CONFIG, printerModel: 'speedx' };

  it('stacks TSPL rows by the real printer-font heights, without overlap', () => {
    const tspl = buildLabelTspl({ ...speedx, showVariant: true }, SAMPLE_LABEL, 1);
    const tops = [...tspl.matchAll(/^(?:TEXT|BARCODE) \d+,(\d+),/gm)].map(m => Number(m[1]));
    expect(tops.length).toBeGreaterThan(3);
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeGreaterThan(tops[i - 1] + 10);
    expect(tops[0]).toBe(12); // top padding 1.5 mm at 203 dpi
  });

  it('flags a barcode too wide for the label and Urdu text', () => {
    expect(checkNativeLabel(speedx, SAMPLE_LABEL).printable).toBe(true);

    const long = checkNativeLabel(speedx, { ...SAMPLE_LABEL, barcode: 'ABCDEFGHIJKLMNOPQRSTUV' });
    expect(long.printable).toBe(false);
    expect(long.warnings[0]).toMatch(/doesn't fit/);
    expect(checkNativeLabel({ ...speedx, barcodeModuleDots: 1 }, { ...SAMPLE_LABEL, barcode: 'ABCDEFGHIJKLMNOPQRSTUV' }).printable).toBe(true);

    const urdu = checkNativeLabel(speedx, { ...SAMPLE_LABEL, name: 'چاول' });
    expect(urdu.printable).toBe(false);
    expect(urdu.warnings[0]).toMatch(/Urdu/);
  });

  it('fits the default 50×30 label with a one-line name, and prints the price with an Rs prefix', () => {
    const longName = { ...SAMPLE_LABEL, name: 'Basmati Rice Super Kernel Premium 5kg' };
    for (const model of ['speedx', 'zebra'] as const) {
      const check = checkNativeLabel({ ...DEFAULT_LABEL_CONFIG, printerModel: model }, longName);
      expect(check, model).toEqual({ printable: true, warnings: [] });
    }
    const tspl = buildLabelTspl(speedx, longName, 1);
    expect(tspl).toContain('"Rs 250.00"');
    expect(tspl).toMatch(/TEXT \d+,\d+,"3",0,1,1,"Basmati/); // name on font 3 (16×24)
    expect(tspl.match(/"3",0,1,1,"/g)!.length).toBe(2); // 1 name line + price
    expect(tspl).toMatch(/TEXT \d+,\d+,"2",0,1,1,"Aazify POS"/); // shop on font 2 (12×20)
  });

  it('side designs move price / note into rotated strips and narrow the main column', () => {
    const withNote = { ...speedx, footer: 'Keep dry' };

    const priceSide = buildLabelTspl({ ...withNote, design: 'price-side' }, SAMPLE_LABEL, 1);
    const priceLine = priceSide.split('\r\n').find(l => l.includes('"Rs 250.00"'))!;
    expect(priceLine).toMatch(/^TEXT \d+,\d+,"3",90,1,1,"Rs 250\.00"$/);
    // Right strip: anchor x is the strip's right edge, within the label.
    const px = Number(priceLine.split(/[ ,]/)[1]);
    expect(px).toBeGreaterThan(350);
    expect(px).toBeLessThanOrEqual(400);
    expect(priceSide).toMatch(/TEXT \d+,\d+,"2",0,1,1,"Keep dry"/); // note stays horizontal

    const both = buildLabelTspl({ ...withNote, design: 'price-note-side' }, SAMPLE_LABEL, 1);
    expect(both).toMatch(/TEXT 10,\d+,"2",270,1,1,"Keep dry"/);
    expect(both).toMatch(/"3",90,1,1,"Rs 250\.00"/);

    // Standard centres the barcode on the label; price-side shifts it left.
    const bx = (code: string) => Number(code.match(/^BARCODE (\d+),/m)![1]);
    expect(bx(priceSide)).toBeLessThan(bx(buildLabelTspl(withNote, SAMPLE_LABEL, 1)));
    expect(checkNativeLabel({ ...withNote, design: 'price-note-side' }, SAMPLE_LABEL).printable).toBe(true);

    const zpl = buildLabelZpl({ ...withNote, printerModel: 'zebra', design: 'price-note-side' }, SAMPLE_LABEL, 1);
    expect(zpl).toMatch(/\^A0R,24,24\^FDRs 250\.00\^FS/);
    expect(zpl).toMatch(/\^A0B,16,16\^FDKeep dry\^FS/);
  });

  it('sizes the note from the setting and centres it on the whole label', () => {
    const cfg = { ...speedx, footer: 'Keep dry', footerSizeMm: 3 };
    const noteX = (code: string) => Number(code.match(/^TEXT (\d+),\d+,"3",0,1,1,"Keep dry"$/m)![1]);
    const labelCentre = 400 / 2;
    const width = 'Keep dry'.length * 16;
    // Centred on the label in both Standard and price-side (column shifted left).
    expect(noteX(buildLabelTspl(cfg, SAMPLE_LABEL, 1))).toBe(labelCentre - width / 2);
    expect(noteX(buildLabelTspl({ ...cfg, design: 'price-side' }, SAMPLE_LABEL, 1))).toBe(labelCentre - width / 2);

    const zpl = buildLabelZpl({ ...cfg, printerModel: 'zebra', design: 'price-side' }, SAMPLE_LABEL, 1);
    // Price strip starts at x=366 (clear space to 356): the band is 200 ± 156.
    expect(zpl).toMatch(/\^FO44,\d+\^A0N,24,24\^FB312,1,0,C,0\^FDKeep dry\^FS/);

    // A note too wide for the band moves into the column and never reaches the price.
    const longNote = { ...cfg, design: 'price-side' as const, footer: 'Keep in a cool dry place' };
    const line = buildLabelTspl(longNote, SAMPLE_LABEL, 1).split('\r\n').find(l => l.includes('"Keep in'))!;
    const [, lx, text] = line.match(/^TEXT (\d+),\d+,"3",0,1,1,"(.*)"$/)!;
    expect(Number(lx)).toBeGreaterThanOrEqual(10);
    expect(Number(lx) + text.length * 16).toBeLessThanOrEqual(356);
    const zplLong = buildLabelZpl({ ...longNote, printerModel: 'zebra' }, SAMPLE_LABEL, 1);
    expect(zplLong).toMatch(/\^FO10,\d+\^A0N,24,24\^FB346,1,0,C,0\^FDKeep in/);

    // Vertical note uses the same size and stays centred along the label height.
    const side = buildLabelTspl({ ...cfg, design: 'note-side' }, SAMPLE_LABEL, 1);
    const [, sy] = side.match(/^TEXT \d+,(\d+),"3",270,1,1,"Keep dry"$/m)!;
    expect(Number(sy)).toBe((240 + width) / 2);
  });

  it('shortens vertical text that is longer than the label height, with a warning', () => {
    const cfg = { ...speedx, design: 'note-side' as const, footer: 'x'.repeat(60) };
    expect(checkNativeLabel(cfg, SAMPLE_LABEL).warnings.join(' ')).toMatch(/shortened/);
  });

  it('flags a barcode pushed off the bottom of the label', () => {
    const tall = checkNativeLabel({ ...speedx, topPaddingMm: 20 }, SAMPLE_LABEL);
    expect(tall.printable).toBe(false);
    expect(tall.warnings.join(' ')).toMatch(/bottom/);
  });
});

describe('Unified Label Dispatcher (Speed-X & Zebra)', () => {
  const speedxConfig: LabelConfig = { ...DEFAULT_LABEL_CONFIG, printerModel: 'speedx' };
  const zebraConfig: LabelConfig = { ...DEFAULT_LABEL_CONFIG, printerModel: 'zebra' };

  it('buildLabelCode routes to TSPL for speedx and ZPL for zebra', () => {
    const speedxCode = buildLabelCode(speedxConfig, SAMPLE_LABEL, 1);
    expect(speedxCode).toContain('SIZE 50 mm, 30 mm');
    expect(speedxCode).toContain('PRINT 1,1');
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
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
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

