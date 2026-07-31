import type { CartItem, PriceType } from './types';
import { SaleCartRow } from './SaleCartRow';

interface SaleCartTableProps {
  cart: CartItem[];
  lastQtyRef: React.RefObject<HTMLInputElement | null>;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
  returnMode: boolean;
  allowPriceChange: boolean;
  allowDiscountTypeSwitch: boolean;
  updateQty: (idx: number, delta: number) => void;
  updateField: (idx: number, field: 'price' | 'discount' | 'qty', val: number) => void;
  removeItem: (idx: number) => void;
  changeVariant: (idx: number, variantId: number) => void;
  changePriceType: (idx: number, pt: PriceType) => void;
  onToggleDiscountType: (idx: number) => void;
}

export function SaleCartTable({
  cart,
  lastQtyRef,
  barcodeRef,
  returnMode,
  allowPriceChange,
  allowDiscountTypeSwitch,
  updateQty,
  updateField,
  removeItem,
  changeVariant,
  changePriceType,
  onToggleDiscountType,
}: SaleCartTableProps) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ShoppingCartIcon />
          <p className="text-sm mt-2">Cart is empty • scan a barcode or press F5 to search</p>
          <p className="text-xs mt-1 text-gray-300">
            F2 Scan &middot; F3 Qty &middot; F5 Search &middot; F7 Save &middot; F8 Hold &middot; F9 Held &middot; F12
            Clear
          </p>
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <th className="text-left px-3 py-2 font-medium text-gray-500 min-w-[140px]">Product</th>
              <th className="text-left px-2 py-2 font-medium text-gray-500 w-[96px]">Variant</th>
              <th className="px-2 py-2 font-medium text-gray-500 text-center w-[96px]">Qty</th>
              <th className="px-2 py-2 font-medium text-gray-500 text-center w-[88px]">Price</th>
              <th className="px-2 py-2 font-medium text-gray-500 text-center w-[112px]">Disc</th>
              <th className="px-2 py-2 font-medium text-gray-500 text-center w-[76px]">Tax</th>
              <th className="px-2 py-2 font-medium text-gray-500 text-center w-[88px]">Rate</th>
              <th className="px-2 py-2 font-medium text-gray-500 text-right w-[104px]">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item: CartItem, idx: number) => (
              <SaleCartRow
                key={`${item.variant.id}-${idx}`}
                item={item}
                idx={idx}
                isLast={idx === 0}
                lastQtyRef={lastQtyRef}
                barcodeRef={barcodeRef}
                returnMode={returnMode}
                allowPriceChange={allowPriceChange}
                allowDiscountTypeSwitch={allowDiscountTypeSwitch}
                updateQty={updateQty}
                updateField={updateField}
                removeItem={removeItem}
                changeVariant={changeVariant}
                changePriceType={changePriceType}
                onToggleDiscountType={onToggleDiscountType}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ShoppingCartIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
