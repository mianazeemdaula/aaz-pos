import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer, Plus, Minus, Trash2, ChevronLeft, Copy, Download,
  CheckCircle2, AlertCircle, X, Tag, Code2,
} from 'lucide-react';

import { ProductSearch } from '../components/ui/ProductSearch';
import { settingsService } from '../services/pos.service';
import type { ProductVariant } from '../types/pos';
import {
  buildBatchCode, buildLabelCode, renderLabel, sendLabel, downloadLabel, copyLabel,
  listLabelPrinters, isLikelyLabelPrinter, isLikelySpeedXPrinter, isLikelyZebraPrinter,
  detectPrinterModel, isTauri, loadZplSettings, saveZplSettings, tsplDensity,
  DEFAULT_LABEL_CONFIG, SIZE_PRESETS, SAMPLE_LABEL,
  type LabelConfig, type LabelData, type PrinterInfo, type ZplTarget, type Dpi,
} from '../utils/zpl';

type PriceType = 'MRP' | 'Retail' | 'Wholesale' | 'Custom';

interface LabelItem {
  variant: ProductVariant;
  copies: number;
  priceType: PriceType;
  customPrice?: number;
}

const priceOf = (item: LabelItem): number => {
  const { variant, priceType, customPrice } = item;
  if (priceType === 'Custom') return customPrice ?? 0;
  if (priceType === 'Retail' && variant.retail != null) return variant.retail;
  if (priceType === 'Wholesale' && variant.wholesale != null) return variant.wholesale;
  return variant.price;
};

const toLabelData = (item: LabelItem): LabelData => ({
  name: item.variant.product?.name ?? item.variant.name,
  variant: item.variant.name,
  barcode: item.variant.barcode,
  price: priceOf(item),
});

/** Canvas render of a label format (TSPL or ZPL) — this is the preview. */
function LabelPreview({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [widthDots, setWidthDots] = useState(400);

  useEffect(() => {
    if (!canvasRef.current) return;
    const result = renderLabel(code, canvasRef.current, { scale: 2.5 });
    setWidthDots(result.widthDots);
  }, [code]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: 'auto',
        maxWidth: `${Math.min(widthDots, 220)}px`,
        maxHeight: '130px',
        height: 'auto',
      }}
      className="rounded-sm shadow-xs ring-1 ring-gray-300 dark:ring-gray-600 block mx-auto"
    />
  );
}

const field =
  'w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md ' +
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-teal-500';
const labelText = 'block text-[10px] font-medium text-gray-400 mb-0.5';

export function PrintLabels() {
  const [items, setItems] = useState<LabelItem[]>([]);
  const [config, setConfig] = useState<LabelConfig>(() => loadZplSettings(DEFAULT_LABEL_CONFIG));
  const [tab, setTab] = useState<'label' | 'code'>('label');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [sending, setSending] = useState(false);

  // Output target
  const [targetKind, setTargetKind] = useState<'system' | 'tcp'>('system');
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [printerName, setPrinterName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(9100);

  const set = useCallback(<K extends keyof LabelConfig>(key: K, value: LabelConfig[K]) => {
    setConfig(prev => {
      const next = { ...prev, [key]: value };
      saveZplSettings(next);
      return next;
    });
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Shop name defaults to the configured business name until it's overridden.
  useEffect(() => {
    const stored = loadZplSettings(DEFAULT_LABEL_CONFIG);
    if (stored.shopName !== DEFAULT_LABEL_CONFIG.shopName) return;
    settingsService.get()
      .then(res => { if (res?.businessName) set('shopName', String(res.businessName)); })
      .catch(() => { /* keep the default */ });
  }, [set]);

  useEffect(() => {
    listLabelPrinters()
      .then(found => {
        setPrinters(found);
        const likely = found.find(p => isLikelyLabelPrinter(p.name));
        const chosen = likely?.name ?? found[0]?.name ?? '';
        setPrinterName(chosen);
        if (chosen) {
          const detected = detectPrinterModel(chosen);
          set('printerModel', detected);
        }
      })
      .catch(() => setPrinters([]));
  }, [set]);

  const addVariant = (variant: ProductVariant) => {
    setItems(prev => {
      const index = prev.findIndex(item => item.variant.id === variant.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], copies: next[index].copies + 1 };
        return next;
      }
      return [...prev, { variant, copies: 1, priceType: 'MRP' }];
    });
  };

  const patchItem = (index: number, patch: Partial<LabelItem>) =>
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const bumpCopies = (index: number, delta: number) =>
    setItems(prev => prev.flatMap((item, i) => {
      if (i !== index) return [item];
      const copies = item.copies + delta;
      return copies <= 0 ? [] : [{ ...item, copies }];
    }));

  const totalLabels = useMemo(() => items.reduce((sum, item) => sum + item.copies, 0), [items]);

  const previewCode = useMemo(
    () => buildLabelCode(config, items[0] ? toLabelData(items[0]) : SAMPLE_LABEL, 1),
    [config, items],
  );

  const batchCode = useMemo(
    () => (items.length === 0
      ? previewCode
      : buildBatchCode(config, items.map(item => ({ data: toLabelData(item), copies: item.copies })))),
    [config, items, previewCode],
  );

  const target: ZplTarget = targetKind === 'system'
    ? { kind: 'system', name: printerName }
    : { kind: 'tcp', host, port };

  const send = async (code: string, description: string) => {
    if (targetKind === 'system' && !printerName) { showToast('error', 'Select a printer first'); return; }
    if (targetKind === 'tcp' && !host.trim()) { showToast('error', 'Enter the printer IP address'); return; }
    setSending(true);
    try {
      await sendLabel(target, code);
      showToast('success', `${description} sent to ${targetKind === 'system' ? printerName : host}`);
    } catch (err: any) {
      showToast('error', String(err?.message ?? err));
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    if (items.length === 0) { showToast('error', 'Add a product first'); return; }
    const modelDesc = config.printerModel === 'speedx' ? 'Speed-X (TSPL)' : 'Zebra (ZPL)';
    send(batchCode, `${totalLabels} label(s) [${modelDesc}]`);
  };

  const presetIndex = SIZE_PRESETS.findIndex(
    p => p.widthMm === config.widthMm && p.heightMm === config.heightMm,
  );

  const toggles: Array<[string, keyof LabelConfig]> = [
    ['Shop name', 'showShop'],
    ['Product', 'showName'],
    ['Variant', 'showVariant'],
    ['Barcode', 'showBarcode'],
    ['Barcode text', 'showBarcodeText'],
    ['Price', 'showPrice'],
    ['Border', 'showBorder'],
  ];

  const codeLangName = config.printerModel === 'speedx' ? 'TSPL' : 'ZPL';

  return (
    <div className="flex flex-col gap-3">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-start gap-2 px-4 py-3 rounded-xl shadow-xl text-xs text-white max-w-sm ${toast.type === 'success' ? 'bg-teal-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-px" /> : <AlertCircle size={14} className="shrink-0 mt-px" />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {/* Header — Single line compact toolbar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-gray-700 flex-nowrap overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/products" className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={16} />
          </Link>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-1">
              <Tag size={15} className="text-teal-600" /> Labels
            </h1>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden md:inline">
              ({config.widthMm}×{config.heightMm}mm)
            </span>
          </div>
        </div>

        {/* Printer Selection & Actions — tight single line */}
        <div className="flex items-center gap-1 flex-nowrap shrink-0">
          {/* Printer Model Switcher */}
          <div className="inline-flex items-center h-7 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px]">
            <button
              type="button"
              onClick={() => set('printerModel', 'speedx')}
              className={`h-full px-2 rounded-md font-medium transition-all flex items-center gap-1 ${
                config.printerModel === 'speedx'
                  ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
              title="Speed-X & TSC compatible barcode printers (TSPL)"
            >
              ⚡ Speed-X
            </button>
            <button
              type="button"
              onClick={() => set('printerModel', 'zebra')}
              className={`h-full px-2 rounded-md font-medium transition-all flex items-center gap-1 ${
                config.printerModel === 'zebra'
                  ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
              title="Zebra & ZPL-compatible printers (ZPL II)"
            >
              🦓 Zebra
            </button>
          </div>

          {/* Connection Type */}
          <select
            value={targetKind}
            onChange={e => setTargetKind(e.target.value as 'system' | 'tcp')}
            className="h-7 px-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="system">Printer</option>
            <option value="tcp">Network</option>
          </select>

          {/* Printer Dropdown / Network inputs */}
          {targetKind === 'system' ? (
            <select
              value={printerName}
              onChange={e => {
                const name = e.target.value;
                setPrinterName(name);
                if (name) {
                  const detected = detectPrinterModel(name);
                  set('printerModel', detected);
                }
              }}
              className="h-7 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-teal-500 max-w-[190px] truncate"
            >
              {printers.length === 0 && <option value="">No printers found</option>}
              {printers.map(p => {
                const isSpeedX = isLikelySpeedXPrinter(p.name);
                const isZebra = isLikelyZebraPrinter(p.name);
                const badge = isSpeedX ? ' ⚡' : isZebra ? ' 🦓' : '';
                return (
                  <option key={p.identifier + p.name} value={p.name}>
                    {p.name}{badge}
                  </option>
                );
              })}
            </select>
          ) : (
            <div className="inline-flex items-center gap-1">
              <input
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="192.168.1.50"
                className="h-7 w-28 px-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
              />
              <input
                type="number"
                value={port}
                onChange={e => setPort(parseInt(e.target.value) || 9100)}
                className="h-7 w-14 px-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
              />
            </div>
          )}

          {/* Test Button */}
          <button
            onClick={() => send(
              buildLabelCode(config, SAMPLE_LABEL, 1),
              `Test label (${config.printerModel === 'speedx' ? 'Speed-X' : 'Zebra'})`,
            )}
            disabled={sending}
            className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 shrink-0"
          >
            Test
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={items.length === 0 || sending}
            className="h-7 px-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
          >
            <Printer size={13} /> Print ({totalLabels})
          </button>
        </div>
      </div>

      {!isTauri() && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
          Running outside the desktop app — direct printing is unavailable. Use <strong>Download .{codeLangName.toLowerCase()}</strong> to send labels manually.
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Products */}
        <div className="w-full lg:w-3/5 flex flex-col gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <ProductSearch onSelect={addVariant} placeholder="Search product or scan barcode..." autoFocus />
          </div>

          {items.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
              <Tag size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-500">No products selected</p>
              <p className="text-xs text-gray-400 mt-1">Search or scan to add labels — the preview shows a sample</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="p-2.5 font-medium">Product</th>
                    <th className="p-2.5 font-medium w-32">Price</th>
                    <th className="p-2.5 font-medium text-center w-28">Copies</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((item, index) => (
                    <tr key={item.variant.id}>
                      <td className="p-2.5">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {item.variant.product?.name ?? item.variant.name}
                        </p>
                        <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                          {item.variant.barcode || 'no barcode'} · {item.variant.name}
                        </p>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={item.priceType}
                          onChange={e => {
                            const priceType = e.target.value as PriceType;
                            patchItem(index, {
                              priceType,
                              customPrice: priceType === 'Custom' ? item.variant.price : undefined,
                            });
                          }}
                          className={field}
                        >
                          <option value="MRP">Rs {item.variant.price.toFixed(0)}</option>
                          {item.variant.retail != null && <option value="Retail">Retail {item.variant.retail.toFixed(0)}</option>}
                          {item.variant.wholesale != null && <option value="Wholesale">W/S {item.variant.wholesale.toFixed(0)}</option>}
                          <option value="Custom">Custom</option>
                        </select>
                        {item.priceType === 'Custom' && (
                          <input
                            type="number" step="0.01" value={item.customPrice ?? ''}
                            onChange={e => patchItem(index, { customPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className={`${field} mt-1 text-right`}
                          />
                        )}
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => bumpCopies(index, -1)} className="w-5 h-5 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Minus size={10} />
                          </button>
                          <input
                            type="number" min={1} value={item.copies}
                            onChange={e => patchItem(index, { copies: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="w-11 py-0.5 text-center text-xs font-semibold border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                          <button onClick={() => bumpCopies(index, 1)} className="w-5 h-5 border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Plus size={10} />
                          </button>
                        </div>
                      </td>
                      <td className="p-2.5">
                        <button onClick={() => setItems(prev => prev.filter((_, i) => i !== index))} className="text-gray-400 hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between px-3 py-2 text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setItems([])} className="hover:text-red-500 font-medium">Clear all</button>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{totalLabels} label(s)</span>
              </div>
            </div>
          )}
        </div>

        {/* Preview + settings */}
        <div className="w-full lg:w-2/5 flex flex-col gap-2.5 lg:sticky lg:top-16">
          {/* Compact Preview & Code Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-2 py-0.5 bg-gray-50/60 dark:bg-gray-900/30">
              <div className="flex">
                <button
                  onClick={() => setTab('label')}
                  className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border-b-2 -mb-px transition-colors ${tab === 'label'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setTab('code')}
                  className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider border-b-2 -mb-px transition-colors ${tab === 'code'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  {codeLangName}
                </button>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => copyLabel(batchCode).then(() => showToast('success', `${codeLangName} copied`))}
                  title={`Copy ${codeLangName}`}
                  className="p-1 text-gray-400 hover:text-teal-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => downloadLabel(batchCode, `labels-${totalLabels || 1}.${codeLangName.toLowerCase()}`)}
                  title={`Download .${codeLangName.toLowerCase()}`}
                  className="p-1 text-gray-400 hover:text-teal-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download size={12} />
                </button>
              </div>
            </div>

            {tab === 'label' ? (
              <div className="p-2 flex items-center justify-center bg-gray-50/70 dark:bg-gray-900/30 min-h-[90px] max-h-[145px]">
                <LabelPreview code={previewCode} />
              </div>
            ) : (
              <pre className="p-2 text-[9px] leading-snug font-mono text-gray-700 dark:text-gray-300 bg-gray-50/70 dark:bg-gray-900/30 max-h-[135px] overflow-auto whitespace-pre-wrap break-all">
                {batchCode}
              </pre>
            )}
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className={labelText}>Label size</label>
                <select
                  value={presetIndex}
                  onChange={e => {
                    const preset = SIZE_PRESETS[Number(e.target.value)];
                    if (!preset) return;
                    setConfig(prev => {
                      const next = { ...prev, widthMm: preset.widthMm, heightMm: preset.heightMm };
                      saveZplSettings(next);
                      return next;
                    });
                  }}
                  className={field}
                >
                  {presetIndex === -1 && <option value={-1}>Custom ({config.widthMm}×{config.heightMm}mm)</option>}
                  {SIZE_PRESETS.map((preset, i) => <option key={preset.name} value={i}>{preset.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelText}>Width (mm)</label>
                <input type="number" min={10} value={config.widthMm} onChange={e => set('widthMm', Math.max(10, parseFloat(e.target.value) || 10))} className={field} />
              </div>
              <div>
                <label className={labelText}>Height (mm)</label>
                <input type="number" min={10} value={config.heightMm} onChange={e => set('heightMm', Math.max(10, parseFloat(e.target.value) || 10))} className={field} />
              </div>
              <div>
                <label className={labelText}>Resolution</label>
                <select value={config.dpi} onChange={e => set('dpi', Number(e.target.value) as Dpi)} className={field}>
                  <option value={203}>203 dpi (Speed-X & standard)</option>
                  <option value={300}>300 dpi (12 dots/mm)</option>
                  <option value={600}>600 dpi (24 dots/mm)</option>
                </select>
              </div>
              <div>
                <label className={labelText}>
                  {config.printerModel === 'speedx' ? 'Density (1–15)' : 'Darkness (^MD)'}
                </label>
                {config.printerModel === 'speedx' ? (
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={tsplDensity(config.darkness)}
                    onChange={e => {
                      const val = Math.max(1, Math.min(15, parseInt(e.target.value) || 8));
                      const darknessVal = Math.round(((val - 8) / 7) * 30);
                      set('darkness', darknessVal);
                    }}
                    className={field}
                  />
                ) : (
                  <input
                    type="number"
                    min={-30}
                    max={30}
                    value={config.darkness}
                    onChange={e => set('darkness', Math.max(-30, Math.min(30, parseInt(e.target.value) || 0)))}
                    className={field}
                  />
                )}
              </div>
              <div>
                <label className={labelText}>Barcode height (mm)</label>
                <input type="number" min={3} step={0.5} value={config.barcodeHeightMm} onChange={e => set('barcodeHeightMm', Math.max(3, parseFloat(e.target.value) || 3))} className={field} />
              </div>
              <div>
                <label className={labelText}>Text scale · {config.textScale.toFixed(2)}×</label>
                <input type="range" min={0.7} max={1.6} step={0.05} value={config.textScale} onChange={e => set('textScale', parseFloat(e.target.value))} className="w-full accent-teal-600 mt-1.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 border-t border-gray-100 dark:border-gray-700">
              {toggles.map(([label, key]) => (
                <label key={key} className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config[key] as boolean}
                    onChange={e => set(key, e.target.checked as LabelConfig[typeof key])}
                    className="w-3 h-3 rounded text-teal-600 focus:ring-teal-500"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <input value={config.shopName} onChange={e => set('shopName', e.target.value)} placeholder="Shop name" className={field} />
              <input value={config.currency} onChange={e => set('currency', e.target.value)} placeholder="Currency" className={field} />
              <input value={config.footer} onChange={e => set('footer', e.target.value)} placeholder="Footer (optional)" className={`${field} col-span-2`} />
            </div>

            <p className="flex items-center gap-1.5 text-[10px] text-gray-400 pt-1">
              <Code2 size={11} /> Preview is rendered from the same {codeLangName} commands sent to the printer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
