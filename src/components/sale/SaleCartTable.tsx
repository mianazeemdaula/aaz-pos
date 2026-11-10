import { ShoppingCart } from 'lucide-react';
import type { CartItem, PriceType } from './types';
import { SaleCartRow } from './SaleCartRow';
import { EmptyCart, SHORTCUTS, posTable } from '../pos/PosKit';

interface SaleCartTableProps {
  cart: CartItem[];
  lastQtyRef: React.RefObject<HTMLInputElement | null>;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
  returnMode: boolean;
  allowPriceChange: boolean;
  allowDiscountTypeSwitch: boolean;
  maxDiscountPercent?: number | null;
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
  maxDiscountPercent = null,
  updateField,
  removeItem,
  changeVariant,
  changePriceType,
  onToggleDiscountType,
}: SaleCartTableProps) {
  if (cart.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EmptyCart
          icon={<ShoppingCart size={24} />}
          title={returnMode ? 'Ready to take a return' : 'Ready for the next sale'}
          shortcuts={[...SHORTCUTS, ['F10', 'Customer']]}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <table className="table-raw w-full min-w-[860px] table-fixed text-[13px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className={`${posTable.th} w-8 text-center`}>#</th>
            <th className={`${posTable.th} text-left`}>Item</th>
            <th className={`${posTable.th} text-left w-24`}>Variant</th>
            <th className={`${posTable.th} text-center w-20`}>Qty</th>
            <th className={`${posTable.th} text-right w-24`}>Price</th>
            <th className={`${posTable.th} text-right w-28`}>Discount</th>
            <th className={`${posTable.th} text-right w-16`}>Tax</th>
            <th className={`${posTable.th} text-left w-24`}>Rate</th>
            <th className={`${posTable.th} text-right w-28`}>Total</th>
            <th className={`${posTable.th} w-9`}><span className="sr-only">Remove</span></th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item: CartItem, idx: number) => (
            <SaleCartRow
              key={`${item.variant.id}-${idx}`}
              item={item}
              idx={idx}
              lineNo={idx + 1}
              isLast={idx === 0}
              highlight={idx === 0 && cart.length > 1}
              lastQtyRef={lastQtyRef}
              barcodeRef={barcodeRef}
              returnMode={returnMode}
              allowPriceChange={allowPriceChange}
              maxDiscountPercent={maxDiscountPercent}
              allowDiscountTypeSwitch={allowDiscountTypeSwitch}
              updateField={updateField}
              removeItem={removeItem}
              changeVariant={changeVariant}
              changePriceType={changePriceType}
              onToggleDiscountType={onToggleDiscountType}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
