import { Scan, Search, Loader2, X } from 'lucide-react';

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
}: SaleHeaderProps) {
  return (
    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
      <div className="flex gap-1">
        <div className="relative flex-1">
          <Scan size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
            placeholder="Scan barcode (F2) • F5 to search"
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
          {barcodeLoading ? (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          ) : barcode ? (
            <button
              onClick={() => {
                setBarcode('');
                setBarcodeError('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        <button
          onClick={onOpenSearchModal}
          title="Search Product (F5)"
          className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors whitespace-nowrap"
        >
          <Search size={14} /> <span className="hidden sm:inline">Search</span>{' '}
          <span className="text-xs text-primary-400">F5</span>
        </button>
        <label
          title="Toggle Return Mode"
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            returnMode
              ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600'
              : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100'
          }`}
        >
          <input
            type="checkbox"
            checked={returnMode}
            onChange={() => {
              setReturnMode(r => !r);
              setAccountAmounts({});
            }}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          Return
        </label>
      </div>
      {barcodeError && <p className="text-xs text-red-500 mt-1 pl-1">{barcodeError}</p>}
    </div>
  );
}
