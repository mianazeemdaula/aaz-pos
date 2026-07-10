import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer, Plus, Minus, Trash2, Settings,
  CheckCircle2, AlertCircle, X, ChevronLeft, Eye, ChevronDown, ChevronUp
} from 'lucide-react';

import { ProductSearch } from '../components/ui/ProductSearch';
import { settingsService } from '../services/pos.service';
import type { ProductVariant } from '../types/pos';
import {
  printDocument,
  loadThermalConfig,
  listPrinters,
  type PrintSection,
  type PrinterInfo
} from '../utils/thermalPrinter';
import JsBarcode from 'jsbarcode';


// Barcode rendering sub-component
interface BarcodeProps {
  value: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
  fontSize?: number;
}

function BarcodeRenderer({
  value,
  height = 35,
  width = 1.8,
  displayValue = false,
  fontSize = 10,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [value, height, width, displayValue, fontSize]);

  if (!value) return null;
  return <svg ref={svgRef} className="mx-auto max-w-full" />;
}

interface SelectedPrintItem {
  variant: ProductVariant;
  copies: number;
  customPrice?: number;
  priceType: 'MRP' | 'Retail' | 'Wholesale' | 'Custom';
}

const SIZE_PRESETS = [
  { name: '50×30mm (Standard)', width: 50, height: 30, type: 'roll' },
  { name: '38×25mm (Small)', width: 38, height: 25, type: 'roll' },
  { name: '40×30mm (Medium)', width: 40, height: 30, type: 'roll' },
  { name: '100×150mm (Shipping)', width: 100, height: 150, type: 'roll' },
  { name: 'A4 Sheet (3×10)', width: 70, height: 29.7, type: 'sheet', cols: 3, rows: 10, gap: 2, mTop: 10, mSide: 5 },
  { name: 'A4 Sheet (4×11)', width: 48.5, height: 25.4, type: 'sheet', cols: 4, rows: 11, gap: 2, mTop: 8, mSide: 6 },
  { name: 'Custom', width: 50, height: 30, type: 'roll', isCustom: true },
];

export function PrintLabels() {
  const [items, setItems] = useState<SelectedPrintItem[]>([]);
  const [shopName, setShopName] = useState('AAZ Point of Sale');

  // Size & Layout
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [widthMm, setWidthMm] = useState(50);
  const [heightMm, setHeightMm] = useState(30);
  const [layoutType, setLayoutType] = useState<'roll' | 'sheet'>('roll');
  const [sheetCols, setSheetCols] = useState(3);
  const [sheetRows, setSheetRows] = useState(10);
  const [sheetGapMm, setSheetGapMm] = useState(2);
  const [sheetMarginTopMm, setSheetMarginTopMm] = useState(10);
  const [sheetMarginSideMm, setSheetMarginSideMm] = useState(5);

  // Content toggles
  const [showShopName, setShowShopName] = useState(true);
  const [showProductName, setShowProductName] = useState(true);
  const [showVariantName, setShowVariantName] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBorder, setShowBorder] = useState(true);
  const [centerContent, setCenterContent] = useState(true);
  const [customFooter, setCustomFooter] = useState('');

  // Font sizes
  const [fontShopSize, setFontShopSize] = useState<'xs' | 'sm' | 'base'>('xs');
  const [fontProductSize, setFontProductSize] = useState<'xs' | 'sm' | 'base' | 'lg'>('sm');
  const [fontPriceSize, setFontPriceSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [fontPriceBold, setFontPriceBold] = useState(true);
  const [barcodeHeight, setBarcodeHeight] = useState(35);
  const barcodeBarWidth = 1.8;

  // Printer
  const [printMethod, setPrintMethod] = useState<'browser' | 'direct'>('browser');
  const [availablePrinters, setAvailablePrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [feedLines, setFeedLines] = useState(2);
  const [cutAfterJob, setCutAfterJob] = useState(false);

  // UI state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Load settings & detect printers on mount
  useEffect(() => {
    settingsService.get()
      .then(res => { if (res?.businessName) setShopName(String(res.businessName)); })
      .catch(err => console.error('Failed to load company details:', err));

    listPrinters()
      .then(printers => {
        setAvailablePrinters(printers);
        const thermalConfig = loadThermalConfig();
        // Try to find a label/zebra printer first, then fall back to configured or first
        const labelPrinter = printers.find(p =>
          /zebra|label|zpl|godex|tsc|xprinter|dymo|brother.*ql/i.test(p.name)
        );
        if (labelPrinter) {
          setSelectedPrinter(labelPrinter.name);
        } else if (thermalConfig.printerName) {
          setSelectedPrinter(thermalConfig.printerName);
        } else if (printers.length > 0) {
          setSelectedPrinter(printers[0].name);
        }
      })
      .catch(err => console.error('Failed to list printers:', err));
  }, []);

  const handlePresetChange = (idx: number) => {
    setSelectedPresetIdx(idx);
    const preset = SIZE_PRESETS[idx];
    if (!preset) return;
    setWidthMm(preset.width);
    setHeightMm(preset.height);
    setLayoutType(preset.type as 'roll' | 'sheet');
    if (preset.type === 'sheet') {
      setSheetCols(preset.cols || 3);
      setSheetRows(preset.rows || 10);
      setSheetGapMm(preset.gap || 2);
      setSheetMarginTopMm(preset.mTop || 10);
      setSheetMarginSideMm(preset.mSide || 5);
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const addVariant = (variant: ProductVariant) => {
    setItems(prev => {
      const existingIdx = prev.findIndex(item => item.variant.id === variant.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].copies += 1;
        return next;
      }
      return [...prev, { variant, copies: 1, priceType: 'MRP' }];
    });
    showToast('success', `Added ${variant.product?.name ?? variant.name}`);
  };

  const updateCopies = (idx: number, delta: number) => {
    setItems(prev => {
      const next = [...prev];
      const newCopies = next[idx].copies + delta;
      if (newCopies <= 0) { next.splice(idx, 1); } else { next[idx].copies = newCopies; }
      return next;
    });
  };

  const updatePriceType = (idx: number, type: 'MRP' | 'Retail' | 'Wholesale' | 'Custom') => {
    setItems(prev => {
      const next = [...prev];
      next[idx].priceType = type;
      if (type !== 'Custom') { next[idx].customPrice = undefined; }
      else { next[idx].customPrice = getPrice(next[idx].variant, 'MRP'); }
      return next;
    });
  };

  const updateCustomPrice = (idx: number, price: number) => {
    setItems(prev => { const next = [...prev]; next[idx].customPrice = Math.max(0, price); return next; });
  };

  const removeProduct = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const clearAll = () => { if (confirm('Clear all items?')) setItems([]); };

  const getPrice = (variant: ProductVariant, type: 'MRP' | 'Retail' | 'Wholesale' | 'Custom', customVal?: number) => {
    if (type === 'Custom') return customVal ?? 0;
    if (type === 'Retail' && variant.retail != null) return variant.retail;
    if (type === 'Wholesale' && variant.wholesale != null) return variant.wholesale;
    return variant.price;
  };

  const totalLabels = useMemo(() => items.reduce((acc, item) => acc + item.copies, 0), [items]);

  // Direct thermal printing (ESC/POS printers only)
  const printDirect = async () => {
    if (!selectedPrinter) { showToast('error', 'Please select a printer'); return; }
    try {
      const sections: PrintSection[] = [];
      items.forEach(item => {
        const priceVal = getPrice(item.variant, item.priceType, item.customPrice);
        const name = item.variant.product?.name ?? item.variant.name;
        const variantName = item.variant.name;
        const barcodeVal = item.variant.barcode;

        for (let i = 0; i < item.copies; i++) {
          if (showShopName && shopName) {
            sections.push({ Text: { text: shopName, styles: { align: centerContent ? 'center' : 'left', bold: true } } });
          }
          if (showProductName) {
            sections.push({ Text: { text: name, styles: { align: centerContent ? 'center' : 'left', bold: true } } });
          }
          if (showVariantName && variantName && variantName !== 'Default' && variantName !== 'Standard') {
            sections.push({ Text: { text: `(${variantName})`, styles: { align: centerContent ? 'center' : 'left' } } });
          }
          if (showBarcode && barcodeVal) {
            sections.push({ Barcode: { data: barcodeVal, barcode_type: 'CODE128', width: 2, height: barcodeHeight, text_position: showBarcodeText ? 'below' : 'none', align: centerContent ? 'center' : 'left' } });
          }
          if (showPrice) {
            sections.push({ Text: { text: `Rs ${priceVal.toFixed(2)}`, styles: { align: centerContent ? 'center' : 'left', bold: fontPriceBold, size: fontPriceSize === 'lg' || fontPriceSize === 'xl' ? 'Double' : 'normal' } } });
          }
          if (customFooter) {
            sections.push({ Text: { text: customFooter, styles: { align: centerContent ? 'center' : 'left' } } });
          }
          if (feedLines > 0) sections.push({ Feed: { feed_type: 'lines', value: feedLines } });
        }
      });
      if (cutAfterJob) sections.push({ Cut: { mode: 'full', feed: 0 } });

      const success = await printDocument({ printer: selectedPrinter, sections });
      if (success) showToast('success', `Sent ${totalLabels} labels to ${selectedPrinter}`);
      else showToast('error', 'Print failed. Check printer connection.');
    } catch (err: any) {
      console.error('Direct print failed:', err);
      showToast('error', err.message || 'Direct print failed.');
    }
  };

  const handlePrint = () => {
    if (items.length === 0) { showToast('error', 'Add at least one product first'); return; }
    if (printMethod === 'direct') { printDirect(); }
    else { window.print(); }
  };

  // Flat list of labels for print rendering
  const flatLabelsToPrint = useMemo(() => {
    const arr: { variant: ProductVariant; price: number }[] = [];
    items.forEach(item => {
      const priceVal = getPrice(item.variant, item.priceType, item.customPrice);
      for (let i = 0; i < item.copies; i++) arr.push({ variant: item.variant, price: priceVal });
    });
    return arr;
  }, [items]);

  // CSS class maps
  const shopFontClass = { xs: 'text-[9px] leading-tight', sm: 'text-[11px] leading-tight', base: 'text-[13px] leading-snug font-medium' }[fontShopSize];
  const productFontClass = { xs: 'text-[10px] leading-tight', sm: 'text-[12px] leading-tight font-medium', base: 'text-[14px] leading-snug font-semibold', lg: 'text-[16px] leading-normal font-bold' }[fontProductSize];
  const priceFontClass = { sm: 'text-[12px] font-semibold', base: 'text-[14px] font-bold', lg: 'text-[17px] font-black', xl: 'text-[20px] font-black tracking-tight' }[fontPriceSize];

  // Detect if selected printer looks like a label/Zebra printer
  const isLabelPrinter = /zebra|label|zpl|godex|tsc|xprinter|dymo|brother.*ql/i.test(selectedPrinter);

  return (
    <div className="flex flex-col gap-3 min-h-[calc(100vh-5rem)]">
      {/* Dynamic Print Stylesheet */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body * { visibility: hidden !important; }
            #label-print-area, #label-print-area * { visibility: visible !important; }
            #label-print-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            #root, #root > *, #root > * > *, #root > * > * > * {
              display: block !important;
              overflow: visible !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .no-print, aside, header { display: none !important; visibility: hidden !important; }
            ${layoutType === 'roll' ? `
              @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
              .print-label-card {
                page-break-after: always; break-after: page;
                width: ${widthMm}mm; height: ${heightMm}mm;
                box-sizing: border-box; overflow: hidden;
                display: flex; flex-direction: column; justify-content: center;
                align-items: ${centerContent ? 'center' : 'stretch'};
                padding: 1.5mm; background: white;
                text-align: ${centerContent ? 'center' : 'left'};
              }
            ` : `
              @page { size: A4; margin: 0; }
              .print-sheet-container {
                width: 210mm; min-height: 297mm;
                padding-top: ${sheetMarginTopMm}mm; padding-bottom: ${sheetMarginTopMm}mm;
                padding-left: ${sheetMarginSideMm}mm; padding-right: ${sheetMarginSideMm}mm;
                box-sizing: border-box;
                display: grid;
                grid-template-columns: repeat(${sheetCols}, ${widthMm}mm);
                grid-auto-rows: ${heightMm}mm;
                gap: ${sheetGapMm}mm; justify-content: center;
                page-break-after: always; break-after: page; background: white;
              }
              .print-label-card {
                width: ${widthMm}mm; height: ${heightMm}mm;
                box-sizing: border-box; overflow: hidden;
                display: flex; flex-direction: column; justify-content: center;
                align-items: ${centerContent ? 'center' : 'stretch'};
                padding: 1.5mm; background: white;
                text-align: ${centerContent ? 'center' : 'left'};
                page-break-inside: avoid; break-inside: avoid;
              }
            `}
          }
        `
      }} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-100 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm text-white animate-fade-in ${toast.type === 'success' ? 'bg-teal-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700 no-print">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <Printer size={22} className="text-teal-600" />
              Label Printing
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {availablePrinters.length > 0 ? `${availablePrinters.length} printer(s) detected` : 'No printers detected — using system dialog'}
            </p>
          </div>
        </div>

        {/* Printer + Print button group */}
        <div className="flex items-center gap-2">
          {/* Printer selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={printMethod}
              onChange={e => setPrintMethod(e.target.value as 'browser' | 'direct')}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="browser">System Dialog</option>
              <option value="direct">Direct Print</option>
            </select>
            {printMethod === 'direct' && availablePrinters.length > 0 && (
              <select
                value={selectedPrinter}
                onChange={e => setSelectedPrinter(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-teal-500 max-w-[200px]"
              >
                {availablePrinters.map(p => (
                  <option key={p.identifier} value={p.name}>
                    {p.name} {/zebra|label|zpl|godex|tsc|dymo/i.test(p.name) ? '🏷️' : ''} ({p.interface_type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {items.length > 0 && (
            <button onClick={clearAll} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Clear
            </button>
          )}
          <button
            onClick={handlePrint}
            disabled={items.length === 0}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer size={14} />
            Print ({totalLabels})
          </button>
        </div>
      </div>

      {/* ── Main Content: 2 columns ── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start no-print flex-1">

        {/* LEFT: Product Selection + Items */}
        <div className="w-full lg:w-3/5 flex flex-col gap-3">

          {/* Search bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-xs">
            <ProductSearch
              onSelect={addVariant}
              placeholder="Search product by name or scan barcode..."
              autoFocus
              className="w-full"
            />
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
              <div className="max-h-[340px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-750 text-gray-500 font-medium border-b border-gray-150 dark:border-gray-700">
                      <th className="p-2.5 pl-3">Product</th>
                      <th className="p-2.5 w-28">Price</th>
                      <th className="p-2.5 text-center w-24">Copies</th>
                      <th className="p-2.5 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {items.map((item, idx) => (
                      <tr key={item.variant.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                        <td className="p-2.5 pl-3">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                            {item.variant.product?.name ?? item.variant.name}
                          </p>
                          <p className="text-gray-400 font-mono text-[10px] mt-0.5">
                            {item.variant.barcode || '—'} · {item.variant.name}
                          </p>
                        </td>
                        <td className="p-2.5">
                          <select
                            value={item.priceType}
                            onChange={e => updatePriceType(idx, e.target.value as any)}
                            className="w-full py-0.5 px-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs outline-none"
                          >
                            <option value="MRP">Rs {item.variant.price.toFixed(0)}</option>
                            {item.variant.retail != null && <option value="Retail">Retail {item.variant.retail.toFixed(0)}</option>}
                            {item.variant.wholesale != null && <option value="Wholesale">W/S {item.variant.wholesale.toFixed(0)}</option>}
                            <option value="Custom">Custom</option>
                          </select>
                          {item.priceType === 'Custom' && (
                            <input type="number" step="0.01" placeholder="Price" value={item.customPrice ?? ''}
                              onChange={e => updateCustomPrice(idx, parseFloat(e.target.value) || 0)}
                              className="w-full mt-1 px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs text-right" />
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => updateCopies(idx, -1)} className="w-5 h-5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center text-gray-500 transition-colors">
                              <Minus size={10} />
                            </button>
                            <input type="number" min="1" value={item.copies}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 1;
                                setItems(prev => { const next = [...prev]; next[idx].copies = Math.max(1, val); return next; });
                              }}
                              className="w-10 py-0.5 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold text-xs" />
                            <button onClick={() => updateCopies(idx, 1)} className="w-5 h-5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center text-gray-500 transition-colors">
                              <Plus size={10} />
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <button onClick={() => removeProduct(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 dark:bg-gray-750/50 px-3 py-2 border-t border-gray-150 dark:border-gray-700 flex justify-between text-xs text-gray-500">
                <span>{items.length} product(s)</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{totalLabels} label(s)</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-250 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-center">
              <Printer size={32} className="text-gray-300 mb-2" />
              <p className="font-semibold text-gray-500 dark:text-gray-400 text-sm">No products selected</p>
              <p className="text-xs text-gray-400 mt-1">Search or scan barcode above to start</p>
            </div>
          )}
        </div>

        {/* RIGHT: Preview + Settings */}
        <div className="w-full lg:w-2/5 lg:sticky lg:top-4 flex flex-col gap-3">

          {/* Live Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={14} className="text-teal-600" /> Preview
              </h2>
              <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded font-mono">
                {widthMm}×{heightMm}mm
              </span>
            </div>

            <div className="border border-dashed border-gray-250 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 p-6 rounded-lg flex items-center justify-center min-h-[180px]">
              <div
                style={{ width: `${widthMm * 5}px`, height: `${heightMm * 5}px`, padding: '8px', boxSizing: 'border-box' }}
                className={`bg-white text-black shadow-lg rounded border border-gray-300 flex flex-col justify-center ${centerContent ? 'items-center text-center' : 'items-start text-left'} overflow-hidden`}
              >
                {showShopName && (
                  <div className={`font-semibold tracking-wide uppercase text-gray-700 border-b border-gray-250 w-full pb-0.5 mb-1 ${shopFontClass}`}>
                    {shopName || 'SHOP NAME'}
                  </div>
                )}
                {showProductName && (
                  <div className={`font-bold text-gray-900 leading-tight w-full break-words ${productFontClass}`}>
                    {items[0]?.variant.product?.name ?? 'Sample Product'}
                  </div>
                )}
                {showVariantName && (
                  <div className="text-[9px] text-gray-500 font-medium leading-none mb-1">
                    {items[0]?.variant.name ?? 'Default'}
                  </div>
                )}
                <div className="flex-grow"></div>
                {showBarcode && (
                  <div className="w-full overflow-hidden my-0.5">
                    <BarcodeRenderer value={items[0]?.variant.barcode ?? '123456789012'} height={barcodeHeight} width={barcodeBarWidth} displayValue={showBarcodeText} fontSize={8} />
                  </div>
                )}
                <div className="flex-grow"></div>
                {showPrice && (
                  <div className={`text-gray-950 leading-none mt-1 ${priceFontClass} ${fontPriceBold ? 'font-bold' : 'font-normal'}`}>
                    Rs {(items[0] ? getPrice(items[0].variant, items[0].priceType, items[0].customPrice) : 250.00).toFixed(2)}
                  </div>
                )}
                {customFooter && (
                  <div className="text-[8px] text-gray-400 font-medium leading-none mt-1 uppercase">{customFooter}</div>
                )}
              </div>
            </div>

            {/* Print info hint */}
            <div className="mt-3 text-[10px] text-gray-400 text-center">
              {printMethod === 'browser'
                ? <>System print dialog — set <strong>Margins: None</strong> for best results</>
                : <>Direct print to <strong>{selectedPrinter || 'selected printer'}</strong></>
              }
              {isLabelPrinter && <span className="ml-1 text-teal-600">🏷️ Label printer detected</span>}
            </div>
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className="flex items-center justify-between w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 shadow-xs text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Settings size={14} className="text-teal-600" />
              Label Settings
            </span>
            {showSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Collapsible Settings */}
          {showSettings && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-xs space-y-4 text-xs">

              {/* Label Size */}
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Label Size</p>
                <select value={selectedPresetIdx} onChange={e => handlePresetChange(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-teal-500">
                  {SIZE_PRESETS.map((p, i) => (<option key={i} value={i}>{p.name}</option>))}
                </select>
                {SIZE_PRESETS[selectedPresetIdx]?.isCustom && (
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-400 mb-0.5">Width (mm)</label>
                      <input type="number" value={widthMm} onChange={e => setWidthMm(Math.max(10, parseFloat(e.target.value) || 0))}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-gray-400 mb-0.5">Height (mm)</label>
                      <input type="number" value={heightMm} onChange={e => setHeightMm(Math.max(10, parseFloat(e.target.value) || 0))}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs" />
                    </div>
                  </div>
                )}
                {layoutType === 'sheet' && (
                  <div className="grid grid-cols-3 gap-2 mt-2 bg-gray-50 dark:bg-gray-750/30 p-2.5 rounded-lg border border-gray-150 dark:border-gray-700">
                    <div><label className="block text-[10px] text-gray-400">Cols</label><input type="number" min="1" max="10" value={sheetCols} onChange={e => setSheetCols(Math.max(1, parseInt(e.target.value) || 1))} className="w-full mt-0.5 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" /></div>
                    <div><label className="block text-[10px] text-gray-400">Rows</label><input type="number" min="1" max="30" value={sheetRows} onChange={e => setSheetRows(Math.max(1, parseInt(e.target.value) || 1))} className="w-full mt-0.5 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" /></div>
                    <div><label className="block text-[10px] text-gray-400">Gap (mm)</label><input type="number" min="0" max="15" step="0.5" value={sheetGapMm} onChange={e => setSheetGapMm(Math.max(0, parseFloat(e.target.value) || 0))} className="w-full mt-0.5 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" /></div>
                  </div>
                )}
              </div>

              {/* Layout mode */}
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Layout</p>
                <div className="flex gap-2">
                  <button onClick={() => setLayoutType('roll')} className={`flex-1 py-1.5 text-xs font-medium border rounded-lg transition ${layoutType === 'roll' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 border-teal-500' : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50'}`}>
                    Roll / Single
                  </button>
                  <button onClick={() => setLayoutType('sheet')} className={`flex-1 py-1.5 text-xs font-medium border rounded-lg transition ${layoutType === 'sheet' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 border-teal-500' : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50'}`}>
                    A4 Sheet
                  </button>
                </div>
              </div>

              {/* Content toggles - compact grid */}
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Show on Label</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {[
                    { label: 'Shop Name', checked: showShopName, onChange: setShowShopName },
                    { label: 'Product Name', checked: showProductName, onChange: setShowProductName },
                    { label: 'Variant', checked: showVariantName, onChange: setShowVariantName },
                    { label: 'Barcode', checked: showBarcode, onChange: setShowBarcode },
                    { label: 'Barcode Text', checked: showBarcodeText, onChange: setShowBarcodeText },
                    { label: 'Price', checked: showPrice, onChange: setShowPrice },
                    { label: 'Border', checked: showBorder, onChange: setShowBorder },
                    { label: 'Center Align', checked: centerContent, onChange: setCenterContent },
                  ].map(opt => (
                    <label key={opt.label} className="flex items-center gap-1.5 cursor-pointer text-gray-600 dark:text-gray-400">
                      <input type="checkbox" checked={opt.checked} onChange={e => opt.onChange(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3 h-3" />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                {showShopName && (
                  <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Shop Name"
                    className="w-full mt-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-teal-500" />
                )}
                <input type="text" value={customFooter} onChange={e => setCustomFooter(e.target.value)} placeholder="Custom footer text (optional)"
                  className="w-full mt-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-teal-500" />
              </div>

              {/* Font / size controls */}
              <div>
                <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sizes</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Product Font</label>
                    <select value={fontProductSize} onChange={e => setFontProductSize(e.target.value as any)} className="w-full px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      <option value="xs">Extra Small</option><option value="sm">Small</option><option value="base">Medium</option><option value="lg">Large</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Price Font</label>
                    <select value={fontPriceSize} onChange={e => setFontPriceSize(e.target.value as any)} className="w-full px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      <option value="sm">Small</option><option value="base">Medium</option><option value="lg">Large</option><option value="xl">XL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Shop Font</label>
                    <select value={fontShopSize} onChange={e => setFontShopSize(e.target.value as any)} className="w-full px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      <option value="xs">Extra Small</option><option value="sm">Small</option><option value="base">Medium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Barcode Height</label>
                    <input type="number" min="15" max="100" value={barcodeHeight} onChange={e => setBarcodeHeight(Math.max(10, parseInt(e.target.value) || 30))}
                      className="w-full px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 dark:text-gray-400 mt-2">
                  <input type="checkbox" checked={fontPriceBold} onChange={e => setFontPriceBold(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3 h-3" />
                  <span>Bold Price</span>
                </label>
              </div>

              {/* Direct print options */}
              {printMethod === 'direct' && (
                <div>
                  <p className="font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Direct Print Options</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Feed Lines</label>
                      <input type="number" min="0" max="10" value={feedLines} onChange={e => setFeedLines(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-center" />
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 dark:text-gray-400 pt-4">
                      <input type="checkbox" checked={cutAfterJob} onChange={e => setCutAfterJob(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3 h-3" />
                      <span>Cut paper after</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Big print button (bottom of right column) */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={items.length === 0}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Printer size={16} />
            {printMethod === 'direct'
              ? `Print ${totalLabels} Label(s) → ${selectedPrinter || 'Printer'}`
              : `Print ${totalLabels} Label(s)`
            }
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PRINT-ONLY AREA: Hidden on screen, shown only during window.print() */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div id="label-print-area" className="hidden">
        {layoutType === 'roll' ? (
          flatLabelsToPrint.map((label, labelIdx) => (
            <div key={labelIdx} className="print-label-card" style={{ border: showBorder ? '1px solid #ddd' : 'none' }}>
              {showShopName && (
                <div className={`font-semibold tracking-wide uppercase text-gray-700 border-b border-gray-250 w-full pb-0.5 mb-1 ${shopFontClass}`}>
                  {shopName}
                </div>
              )}
              {showProductName && (
                <div className={`font-bold text-gray-900 leading-tight w-full break-words ${productFontClass}`}>
                  {label.variant.product?.name ?? label.variant.name}
                </div>
              )}
              {showVariantName && (
                <div className="text-[9px] text-gray-500 font-medium leading-none mb-1">
                  {label.variant.name}
                </div>
              )}
              <div className="flex-grow"></div>
              {showBarcode && (
                <div className="w-full overflow-hidden my-0.5">
                  <BarcodeRenderer value={label.variant.barcode} height={barcodeHeight} width={barcodeBarWidth} displayValue={showBarcodeText} fontSize={8} />
                </div>
              )}
              <div className="flex-grow"></div>
              {showPrice && (
                <div className={`text-gray-950 font-black leading-none mt-1 ${priceFontClass} ${fontPriceBold ? 'font-bold' : 'font-normal'}`}>
                  Rs {label.price.toFixed(2)}
                </div>
              )}
              {customFooter && (
                <div className="text-[8px] text-gray-400 font-medium leading-none mt-1 uppercase">{customFooter}</div>
              )}
            </div>
          ))
        ) : (
          (() => {
            const pageSize = sheetCols * sheetRows;
            const pagesCount = Math.ceil(flatLabelsToPrint.length / pageSize);
            const pagesArray = [];
            for (let p = 0; p < pagesCount; p++) {
              const startIdx = p * pageSize;
              const pageLabels = flatLabelsToPrint.slice(startIdx, startIdx + pageSize);
              pagesArray.push(
                <div key={p} className="print-sheet-container">
                  {pageLabels.map((label, labelIdx) => (
                    <div key={labelIdx} className="print-label-card" style={{ border: showBorder ? '1px solid #ddd' : 'none' }}>
                      {showShopName && (
                        <div className={`font-semibold tracking-wide uppercase text-gray-700 border-b border-gray-250 w-full pb-0.5 mb-1 ${shopFontClass}`}>
                          {shopName}
                        </div>
                      )}
                      {showProductName && (
                        <div className={`font-bold text-gray-900 leading-tight w-full break-words ${productFontClass}`}>
                          {label.variant.product?.name ?? label.variant.name}
                        </div>
                      )}
                      {showVariantName && (
                        <div className="text-[9px] text-gray-500 font-medium leading-none mb-1">
                          {label.variant.name}
                        </div>
                      )}
                      <div className="flex-grow"></div>
                      {showBarcode && (
                        <div className="w-full overflow-hidden my-0.5">
                          <BarcodeRenderer value={label.variant.barcode} height={barcodeHeight} width={barcodeBarWidth} displayValue={showBarcodeText} fontSize={8} />
                        </div>
                      )}
                      <div className="flex-grow"></div>
                      {showPrice && (
                        <div className={`text-gray-950 font-black leading-none mt-1 ${priceFontClass} ${fontPriceBold ? 'font-bold' : 'font-normal'}`}>
                          Rs {label.price.toFixed(2)}
                        </div>
                      )}
                      {customFooter && (
                        <div className="text-[8px] text-gray-400 font-medium leading-none mt-1 uppercase">{customFooter}</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            }
            return pagesArray;
          })()
        )}
      </div>
    </div>
  );
}
