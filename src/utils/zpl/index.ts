import { buildLabelZpl, buildBatchZpl, type LabelConfig, type LabelData } from './generate';
import { buildLabelTspl, buildBatchTspl } from './tspl';

export * from './code128';
export * from './generate';
export * from './tspl';
export * from './render';
export * from './print';

/** Build label command string for the configured printer model (Speed-X TSPL or Zebra ZPL). */
export function buildLabelCode(config: LabelConfig, data: LabelData, copies = 1): string {
    if (config.printerModel === 'speedx') {
        return buildLabelTspl(config, data, copies);
    }
    return buildLabelZpl(config, data, copies);
}

/** Build batch command string for the configured printer model (Speed-X TSPL or Zebra ZPL). */
export function buildBatchCode(
    config: LabelConfig,
    items: Array<{ data: LabelData; copies: number }>,
): string {
    if (config.printerModel === 'speedx') {
        return buildBatchTspl(config, items);
    }
    return buildBatchZpl(config, items);
}
