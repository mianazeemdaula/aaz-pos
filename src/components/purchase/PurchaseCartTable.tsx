import type { CartItem } from './types';
import { PurchaseCartRow } from './PurchaseCartRow';
import { fmt } from './types';

interface PurchaseCartTableProps {
  cart: CartItem[];
  lastQtyRef: React.RefObject<HTMLInputElement | null>;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
  allowPriceChange: boolean;
  allowDiscountTypeSwitch: boolean;
  itemNetTotal: number;
  updateQty: (idx: number, delta: number) => void;
  updateField: (
    idx: number,
    field: 'qty' | 'unitCost' | 'totalCost' | 'discount' | 'unitRate',
    val: number
  ) => void;
  updatePermanentSellingRate: (idx: number, newRate: number) => Promise<void>;
  removeItem: (idx: number) => void;
  changeVariant: (idx: number, variantId: number) => void;
  onToggleDiscountType: (idx: number) => void;
}

export function PurchaseCartTable({
  cart,
  lastQtyRef,
  barcodeRef,
  allowPriceChange,
  allowDiscountTypeSwitch,
  itemNetTotal,
  updateQty,
  updateField,
  updatePermanentSellingRate,
  removeItem,
  changeVariant,
  onToggleDiscountType,
}: PurchaseCartTableProps) {
  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BoxIcon />
            <p className="text-sm mt-2">Cart is empty — scan a barcode or press F5 to search</p>
            <p className="text-xs mt-1 text-gray-300">
              F2 Scan · F3 Qty · F5 Search · F7 Save · F8 Hold · F9 Held · F12 Clear
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left px-3 py-2 font-medium text-gray-500 min-w-[160px]">Product</th>
                <th className="text-left px-2 py-2 font-medium text-gray-500 w-[100px]">Variant</th>
                <th className="px-2 py-2 font-medium text-gray-500 text-center w-[96px]">Qty</th>
                <th className="px-2 py-2 font-medium text-gray-500 text-right w-[100px]">Unit Price</th>
                <th className="px-2 py-2 font-medium text-gray-500 text-right w-[104px]">Total Cost</th>
                <th className="px-2 py-2 font-medium text-gray-500 text-right w-[100px]">Disc</th>
                <th className="px-2 py-2 font-medium text-gray-500 text-right w-[100px]">Sale Rate</th>
                <th className="px-2 py-2 font-medium text-gray-500 text-right w-[80px]">Profit</th>
                <th className="px-2 py-2 font-medium text-gray-500 text-right w-[96px]">Net</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, idx) => (
                <PurchaseCartRow
                  key={`${item.variant.id}-${idx}`}
                  item={item}
                  idx={idx}
                  isFirst={idx === 0}
                  lastQtyRef={lastQtyRef}
                  barcodeRef={barcodeRef}
                  allowPriceChange={allowPriceChange}
                  allowDiscountTypeSwitch={allowDiscountTypeSwitch}
                  updateQty={updateQty}
                  updateField={updateField}
                  updatePermanentSellingRate={updatePermanentSellingRate}
                  removeItem={removeItem}
                  changeVariant={changeVariant}
                  onToggleDiscountType={onToggleDiscountType}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-between text-xs text-gray-500 shrink-0">
          <span>{cart.reduce((a, i) => a + i.qty, 0)} items</span>
          <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{fmt(itemNetTotal)}</span>
        </div>
      )}
    </>
  );
}

function BoxIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
