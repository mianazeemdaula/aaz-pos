import { ScanLine, Search, Loader2, X, Receipt, RotateCcw, AlertCircle } from 'lucide-react';
import { Kbd } from '../pos/PosKit';

interface SaleHeaderProps {
  barcode: string;
  setBarcode: (val: string) => void;
  barcodeLoading: boolean;
  barcodeError: string;
  setBarcodeError: (val: string) => void;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
  onBarcodeEnter: (barcode: string) => void;
  onOpenSearchModal: () => void;
  returnMode: boolean;
  setReturnMode: React.Dispatch<React.SetStateAction<boolean>>;
  setAccountAmounts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  /** True when the cart holds at least one returned (negative qty) line. */
  hasReturnLines: boolean;
  originalInvoiceId: string;
  setOriginalInvoiceId: (val: string) => void;
}

export function SaleHeader({
  barcode,
  setBarcode,
  barcodeLoading,
  barcodeError,
  setBarcodeError,
  barcodeRef,
  onBarcodeEnter,
  onOpenSearchModal,
  returnMode,
  setReturnMode,
  setAccountAmounts,
  hasReturnLines,
  originalInvoiceId,
  setOriginalInvoiceId,
}: SaleHeaderProps) {
  const setMode = (toReturn: boolean) => {
    if (toReturn === returnMode) return;
    setReturnMode(toReturn);
    setAccountAmounts({});
    setTimeout(() => barcodeRef.current?.focus(), 0);
  };

  return (
    <div className="shrink-0 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1.5 p-1.5">
        {/* Scan field — the screen's primary target. */}
        <div className="relative flex-1 min-w-0">
          <ScanLine
            size={17}
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${returnMode ? 'text-red-500' : 'text-gray-400'}`}
          />
          <input
            ref={barcodeRef}
            autoFocus
            type="text"
            value={barcode}
            onChange={e => {
              setBarcode(e.target.value);
              setBarcodeError('');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onBarcodeEnter(barcode);
              }
            }}
            placeholder={returnMode ? 'Scan the item being returned…' : 'Scan or type a barcode…'}
            aria-label="Barcode"
            className={`pos-scan w-full pl-10 pr-16 border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none ${
              returnMode ? 'border-red-300 dark:border-red-500/50' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {barcodeLoading ? (
              <Loader2 size={15} className="text-gray-400 animate-spin" />
            ) : barcode ? (
              <button
                type="button"
                aria-label="Clear barcode"
                onClick={() => {
                  setBarcode('');
                  setBarcodeError('');
                  barcodeRef.current?.focus();
                }}
                className="w-6 h-6 grid place-items-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={14} />
              </button>
            ) : (
              <Kbd>F2</Kbd>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSearchModal}
          title="Search products (F5)"
          className="h-9 inline-flex items-center gap-2 px-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
        >
          <Search size={15} className="text-gray-500" />
          <span className="hidden sm:inline">Search</span>
          <Kbd className="hidden md:inline-flex">F5</Kbd>
        </button>

        {/* Sale / Return — a mode, so it reads as a two-way switch. */}
        <div role="radiogroup" aria-label="Scan mode" className="h-9 inline-flex p-0.5 rounded-md bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <button
            type="button"
            role="radio"
            aria-checked={!returnMode}
            onClick={() => setMode(false)}
            className={`px-3 rounded text-[13px] font-medium transition-colors ${
              !returnMode
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-[var(--shadow-sm)]'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Sale
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={returnMode}
            onClick={() => setMode(true)}
            className={`px-3 rounded text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors ${
              returnMode
                ? 'bg-red-600 text-white shadow-[var(--shadow-sm)]'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <RotateCcw size={13} /> Return
          </button>
        </div>
      </div>

      {barcodeError && (
        <p role="alert" className="flex items-center gap-1.5 px-2 pb-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={13} /> {barcodeError}
        </p>
      )}

      {(returnMode || hasReturnLines) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2 py-1 bg-red-50 dark:bg-red-500/[0.08] border-t border-red-100 dark:border-red-500/20 text-xs">
          {returnMode && (
            <span className="inline-flex items-center gap-1.5 font-medium text-red-700 dark:text-red-400">
              <RotateCcw size={13} /> Return mode — scanned items are added as returns
            </span>
          )}
          {hasReturnLines && (
            <label className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 ml-auto">
              <Receipt size={13} className="text-red-500" />
              Original invoice #
              <input
                type="number"
                min={1}
                value={originalInvoiceId}
                onChange={e => setOriginalInvoiceId(e.target.value)}
                placeholder="Optional"
                className="pos-amount !h-7 w-28 px-2 text-right border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
