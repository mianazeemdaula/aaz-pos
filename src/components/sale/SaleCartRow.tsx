import { Plus, Minus, Trash2 } from 'lucide-react';
import type { CartItem, PriceType } from './types';
import { computeLine, fmt } from './types';

interface SaleCartRowProps {
  item: CartItem;
  idx: number;
  isLast: boolean;
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

export function SaleCartRow({
  item,
  idx,
  isLast,
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
}: SaleCartRowProps) {
  const lc = computeLine(item);
  const variants = item.product.variants ?? [];
  const hasRetail = item.variant.retail != null;
  const hasWholesale = item.variant.wholesale != null;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-3 py-1.5 align-middle min-w-28">
        <p className="font-medium text-gray-900 dark:text-gray-100 break-words">{item.product.name}</p>
        <p
          className="text-gray-400 text-xs truncate"
          title={`${item.variant.barcode} · ${item.variant.name}`}
        >
          {item.variant.barcode} &middot; {item.variant.name}
        </p>
      </td>
      <td className="px-2 py-1.5 align-middle min-w-26">
        {variants.length > 1 ? (
          <select
            value={item.variant.id}
            onChange={e => changeVariant(idx, Number(e.target.value))}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-0.5 px-1 w-full"
          >
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} (×{v.factor})
              </option>
            ))}
          </select>
        ) : (
          <span className="text-gray-500 text-xs">{item.variant.name}</span>
        )}
      </td>
      <td className="px-2 py-1.5 align-middle">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => updateQty(idx, -1)}
            className="w-5 h-5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
          >
            <Minus size={10} />
          </button>
          <input
            ref={isLast ? lastQtyRef : undefined}
            type="number"
            value={item.qty}
            min={returnMode ? -9999 : 1}
            onChange={e => updateField(idx, 'qty', Number(e.target.value))}
            onKeyDown={
              isLast
                ? e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      barcodeRef.current?.focus();
                    }
                  }
                : undefined
            }
            className="w-10 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 text-xs"
          />
          <button
            onClick={() => updateQty(idx, 1)}
            className="w-5 h-5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
          >
            <Plus size={10} />
          </button>
        </div>
      </td>
      <td className="px-2 py-1.5 align-middle text-center">
        {allowPriceChange ? (
          <input
            type="number"
            value={item.price}
            min={0}
            step="0.01"
            onChange={e => updateField(idx, 'price', Math.max(0, Number(e.target.value)))}
            className="w-full text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 text-xs font-medium"
          />
        ) : (
          <span className="font-medium text-gray-900 dark:text-gray-100">{item.price.toFixed(2)}</span>
        )}
      </td>
      <td className="px-2 py-1.5 align-middle">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-0.5">
            <input
              type="number"
              value={item.discount}
              min={0}
              max={item.discountType === 'PERCENTAGE' ? 100 : undefined}
              step="0.01"
              onChange={e =>
                updateField(
                  idx,
                  'discount',
                  item.discountType === 'PERCENTAGE'
                    ? Math.min(100, Math.max(0, Number(e.target.value)))
                    : Math.max(0, Number(e.target.value))
                )
              }
              className="w-14 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 px-1 text-xs"
            />
            <button
              onClick={() => allowDiscountTypeSwitch && onToggleDiscountType(idx)}
              disabled={!allowDiscountTypeSwitch}
              className={`text-[10px] font-medium px-1 py-0.5 rounded border shrink-0 ${
                !allowDiscountTypeSwitch
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
              } ${
                item.discountType === 'PERCENTAGE'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border-blue-200 dark:border-blue-800'
                  : 'bg-green-50 dark:bg-green-900/30 text-green-600 border-green-200 dark:border-green-800'
              }`}
            >
              {item.discountType === 'PERCENTAGE' ? '%' : 'Rs'}
            </button>
          </div>
          {lc.discAmt > 0 && Math.abs(item.qty) > 1 && (
            <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
              Tot: -{fmt(lc.discAmt)}
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-1.5 align-middle text-center">
        {item.taxRate > 0 ? (
          <div className="inline-flex items-center justify-center gap-1 flex-wrap">
            <span className="text-primary-600 font-medium">{lc.taxAmt.toFixed(2)}</span>
            {item.taxMethod === 'INCLUSIVE' && (
              <span className="text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded">
                Incl.
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-2 py-1.5 align-middle">
        <div className="flex justify-center">
          {hasRetail || hasWholesale ? (
            <select
              value={item.priceType}
              onChange={e => changePriceType(idx, e.target.value as PriceType)}
              disabled={!allowPriceChange}
              className={`text-xs w-full border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-0.5 px-1 ${
                !allowPriceChange ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <option value="MRP">MRP</option>
              {hasRetail && <option value="Retail">Retail</option>}
              {hasWholesale && <option value="Wholesale">Wholesale</option>}
            </select>
          ) : (
            <span className="text-[10px] text-gray-400">MRP</span>
          )}
        </div>
      </td>
      <td className="px-2 py-1.5 align-middle text-right font-medium text-gray-900 dark:text-gray-100">
        {fmt(lc.lineTotal)}
      </td>
      <td className="px-1 py-1.5 align-middle text-center">
        <button
          onClick={() => removeItem(idx)}
          className="text-gray-300 hover:text-red-500 dark:hover:text-red-400"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}
