/**
 * Fit checks for `native` mode (printer-resident fonts + native barcode).
 *
 * A barcode wider than the label (with its quiet zones) or running off the
 * bottom makes the label unprintable; other overflow is a warning.
 */

import { code128Modules } from './code128';
import {
    type LabelConfig,
    type LabelData,
    buildRows,
    labelModuleDots,
    mmToDots,
    QUIET_ZONE_MODULES,
    zplLayout,
} from './generate';
import { tsplLayout } from './tspl';

export interface NativeLabelCheck {
    printable: boolean;
    warnings: string[];
}

const URDU_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/** True when `text` contains Arabic-script characters (Urdu). */
export const hasUrdu = (text?: string) => !!text && URDU_RE.test(text);

export function checkNativeLabel(config: LabelConfig, data: LabelData): NativeLabelCheck {
    const warnings: string[] = [];
    let printable = true;

    // The barcode sits in the main column; its quiet zones may use the outer
    // margins (or the clear space before a side strip), hence + 2 × pad.
    const { innerWidth, pad } = buildRows(config, data);
    const available = innerWidth + pad * 2;
    const bottom = mmToDots(config.heightMm, config.dpi) - Math.max(2, mmToDots(0.5, config.dpi));

    const printedText = [
        config.showShop ? config.shopName : '',
        config.showName ? data.name : '',
        config.showVariant ? data.variant : '',
        config.footer,
    ];
    if (printedText.some(hasUrdu)) {
        printable = false;
        warnings.push('The printer\'s built-in fonts can\'t print Urdu. Use an English product name for this label.');
    }

    const barcode = String(data.barcode ?? '').trim();
    if (config.showBarcode && barcode) {
        const module = labelModuleDots(config);
        const needed = (code128Modules(barcode) + QUIET_ZONE_MODULES * 2) * module;
        if (needed > available) {
            printable = false;
            const needMm = Math.ceil(((needed - available) * 25.4) / config.dpi);
            const design = config.design && config.design !== 'standard' ? ' with this design' : '';
            warnings.push(
                `Barcode "${barcode}" doesn't fit a ${config.widthMm} mm label${design} at bar width ${module}` +
                ` — ${needMm} mm short. Use a wider label, a smaller bar width, or the Standard design.`,
            );
        }
    }

    const layout = config.printerModel === 'speedx' ? tsplLayout(config, data) : zplLayout(config, data);
    if (layout.barcodeBottom !== undefined && layout.barcodeBottom > bottom) {
        printable = false;
        warnings.push('Barcode runs past the bottom of the label. Reduce top padding, barcode height or text size.');
    } else if (layout.endY > bottom) {
        warnings.push('Content is taller than the label and will be cut off at the bottom.');
    }
    if (layout.sideTruncated) {
        warnings.push('The vertical text is longer than the label height and was shortened.');
    }

    return { printable, warnings };
}
