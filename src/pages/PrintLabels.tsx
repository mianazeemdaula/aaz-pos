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
  buildBatchZpl, buildLabelZpl, renderZpl, sendZpl, downloadZpl, copyZpl,
  listLabelPrinters, isLikelyZplPrinter, isTauri, loadZplSettings, saveZplSettings,
  DEFAULT_LABEL_CONFIG, SIZE_PRESETS, SAMPLE_LABEL, mmToDots,
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

/** Canvas render of a ZPL format — this is the preview. */
function ZplPreview({ zpl }: { zpl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [widthDots, setWidthDots] = useState(400);

  useEffect(() => {
    if (!canvasRef.current) return;
    const result = renderZpl(zpl, canvasRef.current, { scale: 3 });
    setWidthDots(result.widthDots);
  }, [zpl]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', maxWidth: `${widthDots}px`, height: 'auto' }}
      className="rounded-sm shadow-md ring-1 ring-gray-300 dark:ring-gray-600"
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
  const [tab, setTab] = useState<'label' | 'zpl'>('label');
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
        const zebra = found.find(p => isLikelyZplPrinter(p.name));
        setPrinterName(zebra?.name ?? found[0]?.name ?? '');
      })
      .catch(() => setPrinters([]));
  }, []);

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

  const previewZpl = useMemo(
    () => buildLabelZpl(config, items[0] ? toLabelData(items[0]) : SAMPLE_LABEL, 1),
    [config, items],
  );

  const batchZpl = useMemo(
    () => (items.length === 0
      ? previewZpl
      : buildBatchZpl(config, items.map(item => ({ data: toLabelData(item), copies: item.copies })))),
    [config, items, previewZpl],
  );

  const target: ZplTarget = targetKind === 'system'
    ? { kind: 'system', name: printerName }
    : { kind: 'tcp', host, port };

  const send = async (zpl: string, description: string) => {
    if (targetKind === 'system' && !printerName) { showToast('error', 'Select a printer first'); return; }
    if (targetKind === 'tcp' && !host.trim()) { showToast('error', 'Enter the printer IP address'); return; }
    setSending(true);
    try {
      await sendZpl(target, zpl);
      showToast('success', `${description} sent to ${targetKind === 'system' ? printerName : host}`);
    } catch (err: any) {
      showToast('error', String(err?.message ?? err));
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    if (items.length === 0) { showToast('error', 'Add a product first'); return; }
    send(batchZpl, `${totalLabels} label(s)`);
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

  return (
    <div className="flex flex-col gap-3">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-start gap-2 px-4 py-3 rounded-xl shadow-xl text-xs text-white max-w-sm ${toast.type === 'success' ? 'bg-teal-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 mt-px" /> : <AlertCircle size={14} className="shrink-0 mt-px" />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100"><X size={13} /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <Tag size={20} className="text-teal-600" /> Label Printing
            </h1>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              ZPL II · {config.widthMm}×{config.heightMm}mm · {config.dpi} dpi
              ({mmToDots(config.widthMm, config.dpi)}×{mmToDots(config.heightMm, config.dpi)} dots)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select value={targetKind} onChange={e => setTargetKind(e.target.value as 'system' | 'tcp')} className={`${field} w-auto`}>
            <option value="system">Printer</option>
            <option value="tcp">Network</option>
          </select>

          {targetKind === 'system' ? (
            <select value={printerName} onChange={e => setPrinterName(e.target.value)} className={`${field} w-auto max-w-[220px]`}>
              {printers.length === 0 && <option value="">No printers found</option>}
              {printers.map(p => (
                <option key={p.identifier + p.name} value={p.name}>
                  {p.name}{isLikelyZplPrinter(p.name) ? ' 🏷️' : ''}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input value={host} onChange={e => setHost(e.target.value)} placeholder="192.168.1.50" className={`${field} w-32`} />
              <input type="number" value={port} onChange={e => setPort(parseInt(e.target.value) || 9100)} className={`${field} w-16`} />
            </>
          )}

          <button
            onClick={() => send(buildLabelZpl(config, SAMPLE_LABEL, 1), 'Test label')}
            disabled={sending}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Test
          </button>
          <button
            onClick={handlePrint}
            disabled={items.length === 0 || sending}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <Printer size={14} /> Print ({totalLabels})
          </button>
        </div>
      </div>

      {!isTauri() && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5">
          Running outside the desktop app — direct printing is unavailable. Use <strong>Download .zpl</strong> to send labels manually.
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
        <div className="w-full lg:w-2/5 flex flex-col gap-3 lg:sticky lg:top-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-2">
              <div className="flex">
                {(['label', 'zpl'] as const).map(key => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide border-b-2 -mb-px transition-colors ${tab === key
                      ? 'border-teal-600 text-teal-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                  >
                    {key === 'label' ? 'Preview' : 'ZPL'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => copyZpl(batchZpl).then(() => showToast('success', 'ZPL copied'))} title="Copy ZPL" className="p-1.5 text-gray-400 hover:text-teal-600">
                  <Copy size={14} />
                </button>
                <button onClick={() => downloadZpl(batchZpl, `labels-${totalLabels || 1}.zpl`)} title="Download .zpl" className="p-1.5 text-gray-400 hover:text-teal-600">
                  <Download size={14} />
                </button>
              </div>
            </div>

            {tab === 'label' ? (
              <div className="p-5 flex justify-center bg-gray-50 dark:bg-gray-900/30">
                <ZplPreview zpl={previewZpl} />
              </div>
            ) : (
              <pre className="p-3 text-[10px] leading-relaxed font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 max-h-[280px] overflow-auto whitespace-pre-wrap break-all">
                {batchZpl}
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
                  <option value={203}>203 dpi (8 dots/mm)</option>
                  <option value={300}>300 dpi (12 dots/mm)</option>
                  <option value={600}>600 dpi (24 dots/mm)</option>
                </select>
              </div>
              <div>
                <label className={labelText}>Darkness (^MD)</label>
                <input type="number" min={-30} max={30} value={config.darkness} onChange={e => set('darkness', Math.max(-30, Math.min(30, parseInt(e.target.value) || 0)))} className={field} />
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
              <Code2 size={11} /> Preview is rendered from the same ZPL that is sent to the printer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
