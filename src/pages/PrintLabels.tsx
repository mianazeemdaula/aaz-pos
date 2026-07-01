import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer, Plus, Minus, Trash2, Settings, Layers, Grid,
  CheckCircle2, AlertCircle, X, ChevronLeft, Eye
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
  { name: '50mm × 30mm (Standard Roll)', width: 50, height: 30, type: 'roll' },
  { name: '38mm × 25mm (Small Jewelry/Tags)', width: 38, height: 25, type: 'roll' },
  { name: '40mm × 30mm (Medium Roll)', width: 40, height: 30, type: 'roll' },
  { name: '100mm × 150mm (Shipping Label)', width: 100, height: 150, type: 'roll' },
  { name: 'A4 Sheet (3x10 Grid - 30 Labels)', width: 70, height: 29.7, type: 'sheet', cols: 3, rows: 10, gap: 2, mTop: 10, mSide: 5 },
  { name: 'A4 Sheet (4x11 Grid - 44 Labels)', width: 48.5, height: 25.4, type: 'sheet', cols: 4, rows: 11, gap: 2, mTop: 8, mSide: 6 },
  { name: 'Custom Size', width: 50, height: 30, type: 'roll', isCustom: true },
];

export function PrintLabels() {
  const [items, setItems] = useState<SelectedPrintItem[]>([]);
  const [shopName, setShopName] = useState('AAZ Point of Sale');
  
  // Size & Layout settings
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [widthMm, setWidthMm] = useState(50);
  const [heightMm, setHeightMm] = useState(30);
  const [layoutType, setLayoutType] = useState<'roll' | 'sheet'>('roll');
  
  // Sheet config (only visible if layoutType === 'sheet')
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

  // Font size multipliers (classes or inline styles)
  const [fontShopSize, setFontShopSize] = useState<'xs' | 'sm' | 'base'>('xs');
  const [fontProductSize, setFontProductSize] = useState<'xs' | 'sm' | 'base' | 'lg'>('sm');
  const [fontPriceSize, setFontPriceSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [fontPriceBold, setFontPriceBold] = useState(true);

  // Barcode scaling
  const [barcodeHeight, setBarcodeHeight] = useState(35);
  const barcodeBarWidth = 1.8;

  // Tauri Direct Thermal Print settings
  const [printMethod, setPrintMethod] = useState<'browser' | 'tauri'>('browser');
  const [availablePrinters, setAvailablePrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [feedLines, setFeedLines] = useState(2);
  const [cutAfterJob, setCutAfterJob] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Load shop settings and printers on mount
  useEffect(() => {
    settingsService.get()
      .then(res => {
        if (res?.businessName) {
          setShopName(String(res.businessName));
        }
      })
      .catch(err => console.error('Failed to load company details:', err));

    listPrinters()
      .then(printers => {
        setAvailablePrinters(printers);
        const thermalConfig = loadThermalConfig();
        if (thermalConfig.printerName) {
          setSelectedPrinter(thermalConfig.printerName);
        } else if (printers.length > 0) {
          setSelectedPrinter(printers[0].name);
        }
      })
      .catch(err => console.error('Failed to list thermal printers:', err));
  }, []);



  // Update sizes when preset changes
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
      return [...prev, {
        variant,
        copies: 1,
        priceType: 'MRP',
      }];
    });
    showToast('success', `Added ${variant.product?.name ?? variant.name}`);
  };

  const updateCopies = (idx: number, delta: number) => {
    setItems(prev => {
      const next = [...prev];
      const newCopies = next[idx].copies + delta;
      if (newCopies <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx].copies = newCopies;
      }
      return next;
    });
  };

  const updatePriceType = (idx: number, type: 'MRP' | 'Retail' | 'Wholesale' | 'Custom') => {
    setItems(prev => {
      const next = [...prev];
      next[idx].priceType = type;
      if (type !== 'Custom') {
        next[idx].customPrice = undefined;
      } else {
        next[idx].customPrice = getPrice(next[idx].variant, 'MRP');
      }
      return next;
    });
  };

  const updateCustomPrice = (idx: number, price: number) => {
    setItems(prev => {
      const next = [...prev];
      next[idx].customPrice = Math.max(0, price);
      return next;
    });
  };

  const removeProduct = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all items?')) {
      setItems([]);
    }
  };

  const getPrice = (variant: ProductVariant, type: 'MRP' | 'Retail' | 'Wholesale' | 'Custom', customVal?: number) => {
    if (type === 'Custom') return customVal ?? 0;
    if (type === 'Retail' && variant.retail != null) return variant.retail;
    if (type === 'Wholesale' && variant.wholesale != null) return variant.wholesale;
    return variant.price;
  };

  // Bulk actions
  const setAllCopies = (qty: number) => {
    setItems(prev => prev.map(item => ({ ...item, copies: qty })));
  };

  const setAllPriceTypes = (type: 'MRP' | 'Retail' | 'Wholesale') => {
    setItems(prev => prev.map(item => ({ ...item, priceType: type, customPrice: undefined })));
  };

  const totalLabels = useMemo(() => {
    return items.reduce((acc, item) => acc + item.copies, 0);
  }, [items]);

  const printViaTauri = async () => {
    if (!selectedPrinter) {
      showToast('error', 'Please select a printer first');
      return;
    }

    try {
      const sections: PrintSection[] = [];

      items.forEach(item => {
        const priceVal = getPrice(item.variant, item.priceType, item.customPrice);
        const name = item.variant.product?.name ?? item.variant.name;
        const variantName = item.variant.name;
        const barcodeVal = item.variant.barcode;

        for (let i = 0; i < item.copies; i++) {
          // Shop name
          if (showShopName && shopName) {
            sections.push({
              Text: {
                text: shopName,
                styles: {
                  align: centerContent ? 'center' : 'left',
                  bold: true,
                }
              }
            });
          }

          // Product name
          if (showProductName) {
            sections.push({
              Text: {
                text: name,
                styles: {
                  align: centerContent ? 'center' : 'left',
                  bold: true,
                }
              }
            });
          }

          // Variant name
          if (showVariantName && variantName && variantName !== 'Default' && variantName !== 'Standard') {
            sections.push({
              Text: {
                text: `(${variantName})`,
                styles: {
                  align: centerContent ? 'center' : 'left',
                }
              }
            });
          }

          // Barcode
          if (showBarcode && barcodeVal) {
            sections.push({
              Barcode: {
                data: barcodeVal,
                barcode_type: 'CODE128',
                width: 2,
                height: barcodeHeight,
                text_position: showBarcodeText ? 'below' : 'none',
                align: centerContent ? 'center' : 'left',
              }
            });
          }

          // Price
          if (showPrice) {
            sections.push({
              Text: {
                text: `Rs ${priceVal.toFixed(2)}`,
                styles: {
                  align: centerContent ? 'center' : 'left',
                  bold: fontPriceBold,
                  size: fontPriceSize === 'lg' || fontPriceSize === 'xl' ? 'Double' : 'normal',
                }
              }
            });
          }

          // Footer
          if (customFooter) {
            sections.push({
              Text: {
                text: customFooter,
                styles: {
                  align: centerContent ? 'center' : 'left',
                }
              }
            });
          }

          // Spacing lines between labels
          if (feedLines > 0) {
            sections.push({ Feed: { feed_type: 'lines', value: feedLines } });
          }
        }
      });

      // Cut at end of job
      if (cutAfterJob) {
        sections.push({ Cut: { mode: 'full', feed: 0 } });
      }

      const success = await printDocument({
        printer: selectedPrinter,
        sections,
      });

      if (success) {
        showToast('success', `Sent ${totalLabels} labels directly to thermal printer.`);
      } else {
        showToast('error', 'Thermal printer failed to print. Check connection.');
      }
    } catch (err: any) {
      console.error('Direct print failed:', err);
      showToast('error', err.message || 'Direct print failed. Make sure printer is active.');
    }
  };

  const handlePrint = () => {
    if (items.length === 0) {
      showToast('error', 'Select at least one product to print labels');
      return;
    }
    if (printMethod === 'tauri') {
      printViaTauri();
    } else {
      window.print();
    }
  };


  // Generate an array of labels to render flat in the print layout
  const flatLabelsToPrint = useMemo(() => {
    const arr: { variant: ProductVariant; price: number }[] = [];
    items.forEach(item => {
      const priceVal = getPrice(item.variant, item.priceType, item.customPrice);
      for (let i = 0; i < item.copies; i++) {
        arr.push({ variant: item.variant, price: priceVal });
      }
    });
    return arr;
  }, [items]);

  // CSS mappings
  const shopFontClass = {
    xs: 'text-[9px] leading-tight',
    sm: 'text-[11px] leading-tight',
    base: 'text-[13px] leading-snug font-medium'
  }[fontShopSize];

  const productFontClass = {
    xs: 'text-[10px] leading-tight',
    sm: 'text-[12px] leading-tight font-medium',
    base: 'text-[14px] leading-snug font-semibold',
    lg: 'text-[16px] leading-normal font-bold'
  }[fontProductSize];

  const priceFontClass = {
    sm: 'text-[12px] font-semibold',
    base: 'text-[14px] font-bold',
    lg: 'text-[17px] font-black',
    xl: 'text-[20px] font-black tracking-tight'
  }[fontPriceSize];

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-5rem)]">
      {/* Dynamic Print Stylesheet */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            /* Reset body */
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            /* Hide layout containers */
            #root > div, #root aside, #root header, #root main, .no-print {
              display: none !important;
            }
            /* Show printable container */
            #label-print-area {
              display: block !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            ${layoutType === 'roll' ? `
              /* Roll printing layout settings */
              @page {
                size: ${widthMm}mm ${heightMm}mm;
                margin: 0;
              }
              .print-label-card {
                page-break-after: always;
                break-after: page;
                width: ${widthMm}mm;
                height: ${heightMm}mm;
                box-sizing: border-box;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: ${centerContent ? 'center' : 'stretch'};
                padding: 1.5mm;
                background: white;
                text-align: ${centerContent ? 'center' : 'left'};
              }
            ` : `
              /* A4 Sheet layout settings */
              @page {
                size: A4;
                margin: 0;
              }
              .print-sheet-container {
                width: 210mm;
                min-height: 297mm;
                padding-top: ${sheetMarginTopMm}mm;
                padding-bottom: ${sheetMarginTopMm}mm;
                padding-left: ${sheetMarginSideMm}mm;
                padding-right: ${sheetMarginSideMm}mm;
                box-sizing: border-box;
                display: grid;
                grid-template-columns: repeat(${sheetCols}, ${widthMm}mm);
                grid-auto-rows: ${heightMm}mm;
                gap: ${sheetGapMm}mm;
                justify-content: center;
                page-break-after: always;
                break-after: page;
                background: white;
              }
              .print-label-card {
                width: ${widthMm}mm;
                height: ${heightMm}mm;
                box-sizing: border-box;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: ${centerContent ? 'center' : 'stretch'};
                padding: 1.5mm;
                background: white;
                text-align: ${centerContent ? 'center' : 'left'};
                page-break-inside: avoid;
                break-inside: avoid;
              }
            `}
          }
        `
      }} />

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-100 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm text-white animate-fade-in ${toast.type === 'success' ? 'bg-teal-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700 no-print">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              <Printer size={22} className="text-teal-600" />
              Barcode Label Printing
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Design, customize, and print tags for inventory items
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="px-3.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Clear List
            </button>
          )}
          <button
            onClick={handlePrint}
            disabled={items.length === 0}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer size={14} />
            Print Labels ({totalLabels})
          </button>
        </div>
      </div>

      {/* Main Designer Grid */}
      <div className="flex flex-col lg:flex-row gap-5 items-start no-print">
        
        {/* LEFT COLUMN: Products and Designer Panels */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4">
          
          {/* Card 1: Product Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-xs">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2.5">
              1. Add Products to Print
            </h2>
            <ProductSearch
              onSelect={addVariant}
              placeholder="Search product by name or scan barcode..."
              autoFocus
              className="w-full"
            />

            {items.length > 0 && (
              <div className="mt-4 border border-gray-150 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-750 text-gray-500 font-medium border-b border-gray-150 dark:border-gray-700">
                        <th className="p-3">Product / Variant</th>
                        <th className="p-3 w-32">Price Option</th>
                        <th className="p-3 text-center w-28">Copies</th>
                        <th className="p-3 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {items.map((item, idx) => (
                        <tr key={item.variant.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                          <td className="p-3">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {item.variant.product?.name ?? item.variant.name}
                            </p>
                            <p className="text-gray-400 font-mono text-[10px] mt-0.5">
                              BC: {item.variant.barcode || '—'} &middot; {item.variant.name}
                            </p>
                          </td>
                          <td className="p-3">
                            <select
                              value={item.priceType}
                              onChange={e => updatePriceType(idx, e.target.value as any)}
                              className="w-full py-1 px-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                            >
                              <option value="MRP">MRP (Rs {item.variant.price.toFixed(2)})</option>
                              {item.variant.retail != null && <option value="Retail">Retail (Rs {item.variant.retail.toFixed(2)})</option>}
                              {item.variant.wholesale != null && <option value="Wholesale">Wholesale (Rs {item.variant.wholesale.toFixed(2)})</option>}
                              <option value="Custom">Custom</option>
                            </select>
                            {item.priceType === 'Custom' && (
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Price"
                                value={item.customPrice ?? ''}
                                onChange={e => updateCustomPrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-full mt-1 px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-semibold text-right"
                              />
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => updateCopies(idx, -1)}
                                className="w-6 h-6 border border-gray-350 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-350 transition-colors"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.copies}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 1;
                                  setItems(prev => {
                                    const next = [...prev];
                                    next[idx].copies = Math.max(1, val);
                                    return next;
                                  });
                                }}
                                className="w-12 py-0.5 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold text-xs"
                              />
                              <button
                                onClick={() => updateCopies(idx, 1)}
                                className="w-6 h-6 border border-gray-350 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-350 transition-colors"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => removeProduct(idx)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Bulk tools */}
                <div className="bg-gray-50 dark:bg-gray-750/50 p-2.5 border-t border-gray-150 dark:border-gray-700 flex flex-wrap gap-3 items-center justify-between text-xs">
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-400 font-medium">Set copies for all:</span>
                    <button onClick={() => setAllCopies(1)} className="px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-600 dark:text-gray-300">1</button>
                    <button onClick={() => setAllCopies(5)} className="px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-600 dark:text-gray-300">5</button>
                    <button onClick={() => setAllCopies(10)} className="px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-600 dark:text-gray-300">10</button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-gray-400 font-medium">Bulk Price:</span>
                    <button onClick={() => setAllPriceTypes('MRP')} className="px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-600 dark:text-gray-300">MRP</button>
                    <button onClick={() => setAllPriceTypes('Retail')} className="px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-600 dark:text-gray-300">Retail</button>
                    <button onClick={() => setAllPriceTypes('Wholesale')} className="px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-600 dark:text-gray-300">Wholes.</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Size and Layout Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-xs">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Grid size={16} className="text-teal-600" />
              2. Dimensions &amp; Layout
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Presets */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Preset Label Templates</label>
                <select
                  value={selectedPresetIdx}
                  onChange={e => handlePresetChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {SIZE_PRESETS.map((p, i) => (
                    <option key={i} value={i}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Custom dimensions */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Label Width (mm)</label>
                <input
                  type="number"
                  value={widthMm}
                  onChange={e => {
                    setWidthMm(Math.max(10, parseFloat(e.target.value) || 0));
                    setSelectedPresetIdx(SIZE_PRESETS.length - 1); // custom preset
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Label Height (mm)</label>
                <input
                  type="number"
                  value={heightMm}
                  onChange={e => {
                    setHeightMm(Math.max(10, parseFloat(e.target.value) || 0));
                    setSelectedPresetIdx(SIZE_PRESETS.length - 1); // custom preset
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Printer / Layout type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Layout Mode</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => { setLayoutType('roll'); setSelectedPresetIdx(SIZE_PRESETS.length - 1); }}
                    className={`flex-1 py-1.5 text-xs font-medium border rounded-lg transition ${layoutType === 'roll' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 border-teal-500' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    Continuous Roll
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLayoutType('sheet'); setSelectedPresetIdx(SIZE_PRESETS.length - 1); }}
                    className={`flex-1 py-1.5 text-xs font-medium border rounded-lg transition ${layoutType === 'sheet' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 border-teal-500' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    A4 Sticker Sheet
                  </button>
                </div>
              </div>

              {/* Sheet customization parameters */}
              {layoutType === 'sheet' && (
                <div className="md:col-span-2 bg-gray-50 dark:bg-gray-750/30 p-3 rounded-lg border border-gray-150 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  <div className="col-span-full font-semibold text-[11px] text-gray-500 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700 pb-1.5">
                    A4 Sheet Grid Parameters
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500">Columns</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sheetCols}
                      onChange={e => setSheetCols(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500">Rows</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={sheetRows}
                      onChange={e => setSheetRows(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500">Label Gap (mm)</label>
                    <input
                      type="number"
                      min="0"
                      max="15"
                      step="0.5"
                      value={sheetGapMm}
                      onChange={e => setSheetGapMm(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500">Top/Bottom Margin (mm)</label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={sheetMarginTopMm}
                      onChange={e => setSheetMarginTopMm(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500">Side Margins (mm)</label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={sheetMarginSideMm}
                      onChange={e => setSheetMarginSideMm(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full mt-0.5 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Label Designer Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-xs">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Settings size={16} className="text-teal-600" />
              3. Customize Label Design
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              
              {/* Elements display list */}
              <div className="space-y-2 border-r border-gray-200 dark:border-gray-700 pr-2">
                <p className="font-semibold text-xs text-gray-500 uppercase tracking-wide mb-1.5">Visible Fields</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 text-xs">
                    <input type="checkbox" checked={showShopName} onChange={e => setShowShopName(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5" />
                    <span>Show Shop Name</span>
                  </label>
                  {showShopName && (
                    <input
                      type="text"
                      value={shopName}
                      onChange={e => setShopName(e.target.value)}
                      className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mt-1 ml-5 outline-none focus:ring-1 focus:ring-teal-500"
                      placeholder="Shop Name"
                    />
                  )}
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 text-xs mt-1">
                    <input type="checkbox" checked={showProductName} onChange={e => setShowProductName(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5" />
                    <span>Show Product Name</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 text-xs">
                    <input type="checkbox" checked={showVariantName} onChange={e => setShowVariantName(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5" />
                    <span>Show Variant Name</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 text-xs">
                    <input type="checkbox" checked={showBarcode} onChange={e => setShowBarcode(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5" />
                    <span>Show Barcode Image</span>
                  </label>
                  {showBarcode && (
                    <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400 text-[11px] ml-5">
                      <input type="checkbox" checked={showBarcodeText} onChange={e => setShowBarcodeText(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5" />
                      <span>Show Barcode Text Below Code</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 text-xs">
                    <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5" />
                    <span>Show Price Tag</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 text-xs">
                    <input type="checkbox" checked={showBorder} onChange={e => setShowBorder(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5" />
                    <span>Show Card Border (Outline)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300 text-xs">
                    <input type="checkbox" checked={centerContent} onChange={e => setCenterContent(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5" />
                    <span>Center Elements Horizontally</span>
                  </label>
                </div>
              </div>

              {/* Layout adjustments */}
              <div className="space-y-3">
                <p className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Sizes &amp; Styling</p>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Shop Name Font Size</label>
                  <select value={fontShopSize} onChange={e => setFontShopSize(e.target.value as any)} className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    <option value="xs">Extra Small</option>
                    <option value="sm">Small</option>
                    <option value="base">Medium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Product Name Font Size</label>
                  <select value={fontProductSize} onChange={e => setFontProductSize(e.target.value as any)} className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    <option value="xs">Extra Small</option>
                    <option value="sm">Small (Recommended)</option>
                    <option value="base">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Price Font Size</label>
                  <select value={fontPriceSize} onChange={e => setFontPriceSize(e.target.value as any)} className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                    <option value="sm">Small</option>
                    <option value="base">Medium (Recommended)</option>
                    <option value="lg">Large</option>
                    <option value="xl">Extra Large</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <input type="checkbox" id="bold-price" checked={fontPriceBold} onChange={e => setFontPriceBold(e.target.checked)} className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5" />
                  <label htmlFor="bold-price" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">Make Price Bold</label>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Barcode Height (px)</label>
                  <input
                    type="number"
                    min="15"
                    max="100"
                    value={barcodeHeight}
                    onChange={e => setBarcodeHeight(Math.max(10, parseInt(e.target.value) || 30))}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Custom Footer Label (Optional)</label>
                  <input
                    type="text"
                    value={customFooter}
                    onChange={e => setCustomFooter(e.target.value)}
                    placeholder="e.g. Non-Refundable, Expiry: ..."
                    className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-950 mt-0.5 outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Visual Preview and Print Actions */}
        <div className="w-full lg:w-2/5 lg:sticky lg:top-4 flex flex-col gap-4">
          
          {/* Visual Preview Box */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-xs flex flex-col items-center">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4 self-start flex items-center gap-1.5">
              <Eye size={16} className="text-teal-600" />
              Live Preview (Visual Simulator)
            </h2>

            {/* Simulated scale indicator */}
            <div className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded mb-4 font-mono">
              Dimension: {widthMm}mm × {heightMm}mm ({layoutType === 'roll' ? 'Continuous Roll' : 'Sheet Grid'})
            </div>

            {/* Label Wrapper (With Zoom/Responsive Size) */}
            <div className="border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 p-8 rounded-lg w-full flex items-center justify-center min-h-[220px]">
              {/* Dynamic simulated card container scaled up to ~250px wide for visual comfort */}
              <div 
                style={{
                  width: `${widthMm * 5}px`,
                  height: `${heightMm * 5}px`,
                  padding: '8px',
                  boxSizing: 'border-box',
                }}
                className={`bg-white text-black shadow-lg rounded border border-gray-300 flex flex-col justify-center ${centerContent ? 'items-center text-center' : 'items-start text-left'} overflow-hidden relative`}
              >
                {/* 1. Shop Name */}
                {showShopName && (
                  <div className={`font-semibold tracking-wide uppercase text-gray-700 border-b border-gray-250 w-full pb-0.5 mb-1 ${shopFontClass}`}>
                    {shopName || 'SHOP NAME'}
                  </div>
                )}
                
                {/* 2. Product Name */}
                {showProductName && (
                  <div className={`font-bold text-gray-900 leading-tight w-full break-words ${productFontClass}`}>
                    {items[0]?.variant.product?.name ?? 'Sample Product Name'}
                  </div>
                )}
                
                {/* 3. Variant Name */}
                {showVariantName && (
                  <div className="text-[9px] text-gray-500 font-medium leading-none mb-1">
                    {items[0]?.variant.name ?? 'Standard/Default Variant'}
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-grow"></div>
                
                {/* 4. Barcode Image */}
                {showBarcode && (
                  <div className="w-full overflow-hidden my-0.5">
                    <BarcodeRenderer
                      value={items[0]?.variant.barcode ?? '123456789012'}
                      height={barcodeHeight}
                      width={barcodeBarWidth}
                      displayValue={showBarcodeText}
                      fontSize={8}
                    />
                  </div>
                )}
                
                {/* Spacer */}
                <div className="flex-grow"></div>
                
                {/* 5. Price */}
                {showPrice && (
                  <div className={`text-gray-950 font-black leading-none mt-1 ${priceFontClass} ${fontPriceBold ? 'font-bold' : 'font-normal'}`}>
                    Rs {(items[0] ? getPrice(items[0].variant, items[0].priceType, items[0].customPrice) : 250.00).toFixed(2)}
                  </div>
                )}

                {/* 6. Custom Footer */}
                {customFooter && (
                  <div className="text-[8px] text-gray-400 font-medium leading-none mt-1 uppercase">
                    {customFooter}
                  </div>
                )}
              </div>
            </div>

            {/* Layout summary stats */}
            <div className="w-full mt-4 bg-gray-50 dark:bg-gray-750/30 p-3 rounded-lg border border-gray-150 dark:border-gray-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Unique Items:</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Stickers to Print:</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">{totalLabels}</span>
              </div>
              {layoutType === 'sheet' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated A4 Sheets Needed:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    {Math.ceil(totalLabels / (sheetCols * sheetRows))} sheet(s)
                  </span>
                </div>
              )}
            </div>

            {/* Print destination selection */}
            <div className="w-full mt-3 pt-3 border-t border-gray-255 dark:border-gray-700 text-xs space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Print Destination</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintMethod('browser')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold border rounded-lg transition cursor-pointer ${printMethod === 'browser' ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 border-teal-500' : 'border-gray-300 dark:border-gray-650 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-350'}`}
                  >
                    System Dialog
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMethod('tauri')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold border rounded-lg transition cursor-pointer ${printMethod === 'tauri' ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 border-teal-500' : 'border-gray-300 dark:border-gray-650 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-350'}`}
                  >
                    Direct Thermal
                  </button>
                </div>
              </div>

              {printMethod === 'tauri' && (
                <div className="bg-gray-50 dark:bg-gray-750/30 p-2.5 rounded-lg border border-gray-150 dark:border-gray-700 space-y-2">
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Select Printer</label>
                    <select
                      value={selectedPrinter}
                      onChange={e => setSelectedPrinter(e.target.value)}
                      className="w-full py-1 px-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      {availablePrinters.length === 0 ? (
                        <option value="">No printers found</option>
                      ) : (
                        availablePrinters.map(p => (
                          <option key={p.identifier} value={p.name}>
                            {p.name} ({p.interface_type})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Label Gap (Lines)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={feedLines}
                        onChange={e => setFeedLines(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full py-0.5 px-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 pt-4">
                      <input
                        type="checkbox"
                        id="cut-after-job"
                        checked={cutAfterJob}
                        onChange={e => setCutAfterJob(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor="cut-after-job" className="text-[10px] text-gray-600 dark:text-gray-400 cursor-pointer select-none">Cut paper</label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full mt-4">
              <button
                type="button"
                onClick={handlePrint}
                disabled={items.length === 0}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Printer size={16} />
                {printMethod === 'tauri' ? `Direct Print (${totalLabels} copies)` : `Print Labels (${totalLabels} copies)`}
              </button>
              
              {printMethod === 'browser' ? (
                <div className="text-[10px] text-gray-400 text-center mt-3 bg-teal-50/50 dark:bg-teal-950/20 p-2.5 rounded-lg border border-teal-100 dark:border-teal-900/50">
                  <p className="font-medium text-teal-800 dark:text-teal-400">Printing Pro Tip:</p>
                  <p className="mt-0.5">In the system print dialog, make sure to set <strong>Margins: None</strong> and enable <strong>Background Graphics</strong> to ensure perfect alignment!</p>
                </div>
              ) : (
                <div className="text-[10px] text-gray-400 text-center mt-3 bg-teal-50/50 dark:bg-teal-950/20 p-2.5 rounded-lg border border-teal-100 dark:border-teal-900/50">
                  <p className="font-medium text-teal-800 dark:text-teal-400">Direct Thermal Printing:</p>
                  <p className="mt-0.5">Prints instantly using ESC/POS formatting. Ensure the label printer is configured and connected.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* NO-PRINT empty placeholder warning */}
      {items.length === 0 && (
        <div className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl p-16 flex flex-col items-center justify-center text-center no-print">
          <Layers size={42} className="text-gray-300 mb-3" />
          <h3 className="font-bold text-gray-700 dark:text-gray-200">No products selected</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Use the search input above to look up products or scan barcode stickers to build your printing sheet.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT-ONLY AREA: Appended at root level, hidden in screen mode           */}
      {/* ========================================================================= */}
      <div id="label-print-area" className="hidden">
        {layoutType === 'roll' ? (
          // Continuous roll printer layout
          flatLabelsToPrint.map((label, labelIdx) => (
            <div
              key={labelIdx}
              className="print-label-card"
              style={{
                border: showBorder ? '1px solid #ddd' : 'none',
              }}
            >
              {/* Shop Name */}
              {showShopName && (
                <div className={`font-semibold tracking-wide uppercase text-gray-700 border-b border-gray-250 w-full pb-0.5 mb-1 ${shopFontClass}`}>
                  {shopName}
                </div>
              )}
              
              {/* Product Name */}
              {showProductName && (
                <div className={`font-bold text-gray-900 leading-tight w-full break-words ${productFontClass}`}>
                  {label.variant.product?.name ?? label.variant.name}
                </div>
              )}
              
              {/* Variant Name */}
              {showVariantName && (
                <div className="text-[9px] text-gray-500 font-medium leading-none mb-1">
                  {label.variant.name}
                </div>
              )}

              {/* Spacer */}
              <div className="flex-grow"></div>
              
              {/* Barcode Image */}
              {showBarcode && (
                <div className="w-full overflow-hidden my-0.5">
                  <BarcodeRenderer
                    value={label.variant.barcode}
                    height={barcodeHeight}
                    width={barcodeBarWidth}
                    displayValue={showBarcodeText}
                    fontSize={8}
                  />
                </div>
              )}
              
              {/* Spacer */}
              <div className="flex-grow"></div>
              
              {/* Price */}
              {showPrice && (
                <div className={`text-gray-950 font-black leading-none mt-1 ${priceFontClass} ${fontPriceBold ? 'font-bold' : 'font-normal'}`}>
                  Rs {label.price.toFixed(2)}
                </div>
              )}

              {/* Custom Footer */}
              {customFooter && (
                <div className="text-[8px] text-gray-400 font-medium leading-none mt-1 uppercase">
                  {customFooter}
                </div>
              )}
            </div>
          ))
        ) : (
          // A4 Sticker Sheets Layout
          // Divide labels into A4 pages (size = sheetCols * sheetRows)
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
                    <div
                      key={labelIdx}
                      className="print-label-card"
                      style={{
                        border: showBorder ? '1px solid #ddd' : 'none',
                      }}
                    >
                      {/* Shop Name */}
                      {showShopName && (
                        <div className={`font-semibold tracking-wide uppercase text-gray-700 border-b border-gray-250 w-full pb-0.5 mb-1 ${shopFontClass}`}>
                          {shopName}
                        </div>
                      )}
                      
                      {/* Product Name */}
                      {showProductName && (
                        <div className={`font-bold text-gray-900 leading-tight w-full break-words ${productFontClass}`}>
                          {label.variant.product?.name ?? label.variant.name}
                        </div>
                      )}
                      
                      {/* Variant Name */}
                      {showVariantName && (
                        <div className="text-[9px] text-gray-500 font-medium leading-none mb-1">
                          {label.variant.name}
                        </div>
                      )}

                      {/* Spacer */}
                      <div className="flex-grow"></div>
                      
                      {/* Barcode Image */}
                      {showBarcode && (
                        <div className="w-full overflow-hidden my-0.5">
                          <BarcodeRenderer
                            value={label.variant.barcode}
                            height={barcodeHeight}
                            width={barcodeBarWidth}
                            displayValue={showBarcodeText}
                            fontSize={8}
                          />
                        </div>
                      )}
                      
                      {/* Spacer */}
                      <div className="flex-grow"></div>
                      
                      {/* Price */}
                      {showPrice && (
                        <div className={`text-gray-950 font-black leading-none mt-1 ${priceFontClass} ${fontPriceBold ? 'font-bold' : 'font-normal'}`}>
                          Rs {label.price.toFixed(2)}
                        </div>
                      )}

                      {/* Custom Footer */}
                      {customFooter && (
                        <div className="text-[8px] text-gray-400 font-medium leading-none mt-1 uppercase">
                          {customFooter}
                        </div>
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
