import { ScanLine, Search, Loader2, X, Plus, AlertCircle } from 'lucide-react';
import { Kbd } from '../pos/PosKit';

interface PurchaseHeaderProps {
  barcode: string;
  setBarcode: (val: string) => void;
  barcodeLoading: boolean;
  barcodeError: string;
  setBarcodeError: (val: string) => void;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
  onBarcodeEnter: (barcode: string) => void;
  onOpenSearchModal: () => void;
  onOpenQuickProduct?: () => void;
}

export function PurchaseHeader({
  barcode,
  setBarcode,
  barcodeLoading,
  barcodeError,
  setBarcodeError,
  barcodeRef,
  onBarcodeEnter,
  onOpenSearchModal,
  onOpenQuickProduct,
}: PurchaseHeaderProps) {
  return (
    <div className="shrink-0 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-1.5 p-1.5">
        {/* Scan field — the screen's primary target. */}
        <div className="relative flex-1 min-w-0">
          <ScanLine size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
            placeholder="Scan or type a barcode to receive stock…"
            aria-label="Barcode"
            className="pos-scan w-full pl-10 pr-16 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
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

        {onOpenQuickProduct && (
          <button
            type="button"
            onClick={onOpenQuickProduct}
            title="Create a new product"
            className="h-9 inline-flex items-center gap-1.5 px-3 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            <Plus size={15} className="text-gray-500" /> <span className="hidden sm:inline">New product</span>
          </button>
        )}
      </div>

      {barcodeError && (
        <p role="alert" className="flex items-center gap-1.5 px-2 pb-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={13} /> {barcodeError}
        </p>
      )}
    </div>
  );
}
