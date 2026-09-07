import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { AlertCircle, Settings2, Type } from 'lucide-react';

import {
  nativeFont, nativeTextSize, nativeHeadingSize, nativeTotalFont, nativeTotalSize,
  nativeWidth, nativeHeadingWidth, nativeTotalWidth, feedLines,
  type ThermalPrinterConfig,
} from '../../utils/thermalPrinter';
import {
  FONT_OPTIONS, SIZE_OPTIONS, columnsFor,
  type EscPosFont, type EscPosSize,
} from '../../utils/thermalFont';
import { inputCls, labelCls, sectionNoteCls, sectionTitleCls } from './formStyles';

/** Compact checkbox row. The longer rationale rides on the `title` tooltip. */
function Toggle({
  id, checked, onChange, label, title,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  title: string;
}) {
  return (
    <label htmlFor={id} title={title} className="flex items-center gap-2 cursor-pointer py-0.5">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
      />
      <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

/** A labelled field. `title` carries the explanation that used to sit under it. */
function Field({
  label, title, children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div title={title}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

interface Props {
  thermal: ThermalPrinterConfig;
  setThermal: Dispatch<SetStateAction<ThermalPrinterConfig>>;
}

/**
 * Type and hardware settings for the native ESC/POS pipeline.
 *
 * A thermal printer has a fixed number of dots across, so the font choice
 * decides how many characters fit on a line — and every padded line on a slip
 * is laid out against that number. The widths are shown live in one summary row
 * so a choice that would wrap the receipt is visible before any paper is used.
 */
export function NativeEscPosSettings({ thermal, setThermal }: Props) {
  const autoColumns = columnsFor({
    paperSize: thermal.paperSize,
    font: nativeFont(thermal),
    size: nativeTextSize(thermal),
  });

  const bodyColumns = nativeWidth(thermal);
  const ruler = '1234567890'.repeat(Math.ceil(bodyColumns / 10)).slice(0, bodyColumns);

  const widths = [
    { label: 'Body', value: bodyColumns },
    { label: 'Name', value: nativeHeadingWidth(thermal) },
    { label: 'Total', value: nativeTotalWidth(thermal) },
  ];

  const numberOrUndefined = (raw: string): number | undefined =>
    raw === '' ? undefined : Math.max(1, parseInt(raw, 10) || 0);

  const fontHint = (f: EscPosFont) => FONT_OPTIONS.find(o => o.value === f)?.hint ?? '';
  const sizeHint = (s: EscPosSize) => SIZE_OPTIONS.find(o => o.value === s)?.hint ?? '';

  return (
    <>
      {/* ── Type ──────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
        <div>
          <h3 className={sectionTitleCls}>
            <Type className="text-primary-600" size={14} /> Native Text Size &amp; Font
          </h3>
          <p className={sectionNoteCls}>
            Type for Native ESC/POS mode. A larger font fits fewer characters per line — see the widths
            below. Hover any field for detail.
          </p>
        </div>

        {thermal.invoiceMode !== 'native' && (
          <div className="flex items-start gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-md text-[11px] leading-snug">
            <AlertCircle size={12} className="mt-0.5 shrink-0" />
            <span>
              Render mode is HTML, which draws the receipt as an image and ignores these. The test slip
              still uses them.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2.5">
          <Field label="Body font" title={fontHint(nativeFont(thermal))}>
            <select
              value={nativeFont(thermal)}
              onChange={e => setThermal(t => ({ ...t, nativeFont: e.target.value as EscPosFont }))}
              className={inputCls}
            >
              {FONT_OPTIONS.map(o => <option key={o.value} value={o.value} title={o.hint}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Body size" title={sizeHint(nativeTextSize(thermal))}>
            <select
              value={nativeTextSize(thermal)}
              onChange={e => setThermal(t => ({ ...t, nativeTextSize: e.target.value as EscPosSize }))}
              className={inputCls}
            >
              {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value} title={o.hint}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Business name size" title="Size of the heading at the top of every slip.">
            <select
              value={nativeHeadingSize(thermal)}
              onChange={e => setThermal(t => ({ ...t, nativeHeadingSize: e.target.value as EscPosSize }))}
              className={inputCls}
            >
              {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field
            label="Grand total"
            title="Face and size of the one figure printed larger than the body."
          >
            <div className="flex gap-1.5">
              <select
                value={nativeTotalFont(thermal)}
                onChange={e => setThermal(t => ({ ...t, nativeTotalFont: e.target.value as EscPosFont }))}
                className={inputCls}
              >
                {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
              </select>
              <select
                value={nativeTotalSize(thermal)}
                onChange={e => setThermal(t => ({ ...t, nativeTotalSize: e.target.value as EscPosSize }))}
                className={inputCls}
              >
                {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </Field>

          <Field
            label="Chars per line"
            title="Leave blank unless the printer disagrees with the calculated width. Count the characters on one printed line and enter that number — headings and totals are scaled from it."
          >
            <input
              type="number"
              min={10}
              max={99}
              value={thermal.nativeColumns ?? ''}
              onChange={e => setThermal(t => ({ ...t, nativeColumns: numberOrUndefined(e.target.value) }))}
              className={inputCls}
              placeholder={`Auto (${autoColumns})`}
            />
          </Field>

          <Field
            label="Image width (px)"
            title="HTML render mode only. Some 180dpi printers want 504 rather than the nominal 576."
          >
            <input
              type="number"
              min={100}
              max={1200}
              value={thermal.imageWidth ?? ''}
              onChange={e => setThermal(t => ({ ...t, imageWidth: numberOrUndefined(e.target.value) }))}
              className={inputCls}
              placeholder={thermal.paperSize === 'Mm58' ? 'Auto (384)' : 'Auto (576)'}
            />
          </Field>

          <Field
            label="Blank lines before cut"
            title="Feeds the slip clear of the print head so the last line is not cut through. Raise it if the bottom of the receipt comes out clipped."
          >
            <input
              type="number"
              min={0}
              max={10}
              value={feedLines(thermal)}
              onChange={e =>
                setThermal(t => ({
                  ...t,
                  feedLines: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)),
                }))
              }
              className={inputCls}
            />
          </Field>
        </div>

        {/* Live widths + a ruler one body line wide. */}
        <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Chars/line</span>
            {widths.map(row => (
              <span key={row.label} className="text-gray-500 dark:text-gray-400">
                {row.label}{' '}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{row.value}</span>
              </span>
            ))}
            {thermal.nativeColumns ? (
              <span className="text-amber-600 dark:text-amber-400">manual override</span>
            ) : null}
          </div>
          <pre
            title="One body line at the current settings. Send a test print to confirm it matches the paper."
            className="overflow-x-auto text-[10px] leading-none font-mono text-gray-500 dark:text-gray-400"
          >
            {ruler}
          </pre>
        </div>
      </div>

      {/* ── Hardware behaviour ────────────────────────────────────────── */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
        <div>
          <h3 className={sectionTitleCls}>
            <Settings2 className="text-primary-600" size={14} /> Printer Behaviour
          </h3>
          <p className={sectionNoteCls}>What the printer does when a slip finishes. Both render modes.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3">
          <Toggle
            id="thermal-cut-paper"
            checked={thermal.cutPaper ?? true}
            onChange={v => setThermal(t => ({ ...t, cutPaper: v }))}
            label="Cut paper"
            title="Turn off for printers with no cutter, which would otherwise jam or beep on the cut command."
          />
          <Toggle
            id="thermal-beep"
            checked={thermal.beep ?? false}
            onChange={v => setThermal(t => ({ ...t, beep: v }))}
            label="Beep when done"
            title="Sounds the printer's buzzer — useful when the printer sits away from the till."
          />
          <Toggle
            id="thermal-drawer"
            checked={thermal.openCashDrawer ?? false}
            onChange={v => setThermal(t => ({ ...t, openCashDrawer: v }))}
            label="Open cash drawer"
            title="Sends the drawer kick pulse, for a cash drawer wired to the printer."
          />
          <Toggle
            id="thermal-bold-body"
            checked={thermal.nativeBold ?? false}
            onChange={v => setThermal(t => ({ ...t, nativeBold: v }))}
            label="Bold body text"
            title="Prints every native line in bold. Helps on a worn print head or pale paper, at the cost of slightly slower printing."
          />
        </div>
      </div>
    </>
  );
}
