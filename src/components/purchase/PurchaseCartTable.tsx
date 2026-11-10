import { PackagePlus } from 'lucide-react';
import type { CartItem } from './types';
import { PurchaseCartRow } from './PurchaseCartRow';
import { fmt } from './types';
import { EmptyCart, SHORTCUTS, posTable } from '../pos/PosKit';

interface PurchaseCartTableProps {
  cart: CartItem[];
  lastQtyRef: React.RefObject<HTMLInputElement | null>;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
  allowPriceChange: boolean;
  allowDiscountTypeSwitch: boolean;
  itemNetTotal: number;
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

const qtyLabel = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''));

export function PurchaseCartTable({
  cart,
  lastQtyRef,
  barcodeRef,
  allowPriceChange,
  allowDiscountTypeSwitch,
  itemNetTotal,
  updateField,
  updatePermanentSellingRate,
  removeItem,
  changeVariant,
  onToggleDiscountType,
}: PurchaseCartTableProps) {
  if (cart.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EmptyCart icon={<PackagePlus size={24} />} title="Ready to receive stock" shortcuts={SHORTCUTS} />
      </div>
    );
  }

  const totalQty = cart.reduce((a, i) => a + i.qty, 0);

  return (
    <>
      <div className="flex-1 overflow-auto min-h-0">
        <table className="table-raw w-full min-w-[960px] table-fixed text-[13px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={`${posTable.th} w-8 text-center`}>#</th>
              <th className={`${posTable.th} text-left`}>Item</th>
              <th className={`${posTable.th} text-left w-24`}>Variant</th>
              <th className={`${posTable.th} text-center w-20`}>Qty</th>
              <th className={`${posTable.th} text-right w-24`}>Unit cost</th>
              <th className={`${posTable.th} text-right w-24`}>Total cost</th>
              <th className={`${posTable.th} text-right w-28`}>Discount</th>
              <th className={`${posTable.th} text-right w-28`}>Sale rate</th>
              <th className={`${posTable.th} text-right w-24`}>Profit</th>
              <th className={`${posTable.th} text-right w-28`}>Net</th>
              <th className={`${posTable.th} w-9`}><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, idx) => (
              <PurchaseCartRow
                key={`${item.variant.id}-${idx}`}
                item={item}
                idx={idx}
                lineNo={idx + 1}
                isFirst={idx === 0}
                highlight={idx === 0 && cart.length > 1}
                lastQtyRef={lastQtyRef}
                barcodeRef={barcodeRef}
                allowPriceChange={allowPriceChange}
                allowDiscountTypeSwitch={allowDiscountTypeSwitch}
                updateField={updateField}
                updatePermanentSellingRate={updatePermanentSellingRate}
                removeItem={removeItem}
                changeVariant={changeVariant}
                onToggleDiscountType={onToggleDiscountType}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-0.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-2 py-1 text-xs">
        <span className="flex items-baseline gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Lines</span>
          <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-200">{cart.length}</span>
        </span>
        <span className="flex items-baseline gap-1">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Qty</span>
          <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-200">{qtyLabel(totalQty)}</span>
        </span>
        <span className="ml-auto flex items-baseline gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Items net</span>
          <span className="text-base font-semibold tabular-nums tracking-tight text-gray-900 dark:text-gray-100">{fmt(itemNetTotal)}</span>
        </span>
      </div>
    </>
  );
}
