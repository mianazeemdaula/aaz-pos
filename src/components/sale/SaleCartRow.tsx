import { Trash2 } from 'lucide-react';
import type { CartItem, PriceType } from './types';
import { computeLine, fmt } from './types';
import { posTable, rowTone } from '../pos/PosKit';

interface SaleCartRowProps {
  item: CartItem;
  idx: number;
  /** 1-based row number shown in the first column. */
  lineNo: number;
  isLast: boolean;
  /** Marks the most recently scanned line. */
  highlight?: boolean;
  lastQtyRef: React.RefObject<HTMLInputElement | null>;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
  returnMode: boolean;
  allowPriceChange: boolean;
  allowDiscountTypeSwitch: boolean;
  /** Discount ceiling for this cashier, as a percentage. `null` = no limit. */
  maxDiscountPercent?: number | null;
  updateField: (idx: number, field: 'price' | 'discount' | 'qty', val: number) => void;
  removeItem: (idx: number) => void;
  changeVariant: (idx: number, variantId: number) => void;
  changePriceType: (idx: number, pt: PriceType) => void;
  onToggleDiscountType: (idx: number) => void;
}

export function SaleCartRow({
  item,
  idx,
  lineNo,
  isLast,
  highlight = false,
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
}: SaleCartRowProps) {
  // A percentage discount is capped at 100 anyway; a fixed one at the line
  // price. The cashier's own limit tightens whichever applies, so the input
  // cannot be nudged past what the API would accept.
  const percentCeiling = maxDiscountPercent ?? 100;
  const discountCeiling =
    item.discountType === 'PERCENTAGE' ? percentCeiling : (item.price * percentCeiling) / 100;
  const clampDiscount = (v: number) => Math.min(discountCeiling, Math.max(0, v));
  const overLimit = item.qty > 0 && item.discount > discountCeiling + 0.001;

  const lc = computeLine(item);
  const variants = item.product.variants ?? [];
  const hasRetail = item.variant.retail != null;
  const hasWholesale = item.variant.wholesale != null;
  const isReturn = item.qty < 0;
  const td = posTable.td;

  return (
    <tr className={`transition-colors ${rowTone({ latest: highlight, isReturn })}`}>
      <td className={`${td} text-center relative`}>
        {(highlight || isReturn) && (
          <span
            aria-hidden
            className={`absolute left-0 top-0 bottom-0 w-[3px] ${isReturn ? 'bg-red-500' : 'bg-primary-500'}`}
          />
        )}
        <span className="text-xs text-gray-400 tabular-nums">{lineNo}</span>
      </td>

      <td className={td}>
        <div className="flex items-baseline gap-2 min-w-0" title={`${item.product.name} · ${item.variant.barcode}`}>
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.product.name}</span>
          <span className="shrink-0 text-[11px] text-gray-400 font-mono">{item.variant.barcode}</span>
          {isReturn && (
            <span className="shrink-0 px-1 rounded-sm bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 text-[10px] font-semibold uppercase tracking-wide">
              Return
            </span>
          )}
        </div>
      </td>

      <td className={td}>
        {variants.length > 1 ? (
          <select
            value={item.variant.id}
            onChange={e => changeVariant(idx, Number(e.target.value))}
            className={posTable.select}
            aria-label="Variant"
          >
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} (×{v.factor})
              </option>
            ))}
          </select>
        ) : (
          <span className="block truncate text-gray-600 dark:text-gray-300" title={item.variant.name}>{item.variant.name}</span>
        )}
      </td>

      <td className={td}>
        <input
            ref={isLast ? lastQtyRef : undefined}
            type="number"
            aria-label="Quantity"
            value={item.qty === 0 ? '' : item.qty}
            min={returnMode ? -9999 : 1}
            step="any"
            onChange={e => updateField(idx, 'qty', e.target.value === '' ? 0 : Number(e.target.value))}
            onBlur={() => {
              if (!item.qty || item.qty === 0) {
                updateField(idx, 'qty', returnMode ? -1 : 1);
              }
            }}
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
            className={`${posTable.input} text-center font-semibold ${isReturn ? '!text-red-600 dark:!text-red-400' : ''}`}
          />
      </td>

      <td className={`${td} text-right`}>
        {allowPriceChange ? (
          <input
            type="number"
            aria-label="Unit price"
            value={item.price}
            min={0}
            step="0.01"
            onChange={e => updateField(idx, 'price', Math.max(0, Number(e.target.value)))}
            className={`${posTable.input} text-right`}
          />
        ) : (
          <span className="tabular-nums text-gray-900 dark:text-gray-100">{item.price.toFixed(2)}</span>
        )}
      </td>

      <td className={`${td} text-right`} title={lc.discAmt > 0 ? `Line discount: ${fmt(lc.discAmt)}` : undefined}>
        <div className="flex items-center justify-end">
          <input
            type="number"
            aria-label="Discount"
            value={item.discount}
            min={0}
            max={discountCeiling}
            step="0.01"
            title={
              maxDiscountPercent !== null
                ? `Your discount limit is ${maxDiscountPercent}% (max ${discountCeiling.toFixed(2)} on this line)`
                : undefined
            }
            onChange={e => updateField(idx, 'discount', clampDiscount(Number(e.target.value)))}
            className={`${posTable.input} !w-16 text-right !rounded-r-none ${
              overLimit ? '!border-red-400 !text-red-600 dark:!text-red-400' : ''
            }`}
          />
          <button
            type="button"
            onClick={() => allowDiscountTypeSwitch && onToggleDiscountType(idx)}
            disabled={!allowDiscountTypeSwitch}
            title={allowDiscountTypeSwitch ? 'Switch between percentage and flat amount' : undefined}
            className={`h-6 w-9 shrink-0 -ml-px rounded-r-md border border-gray-250 dark:border-gray-600 bg-gray-50 dark:bg-gray-750 text-[11px] font-semibold text-gray-600 dark:text-gray-300 ${
              allowDiscountTypeSwitch ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'opacity-60 cursor-not-allowed'
            }`}
          >
            {item.discountType === 'PERCENTAGE' ? '%' : 'Flat'}
          </button>
        </div>
      </td>

      <td className={`${td} text-right`}>
        {item.taxRate > 0 ? (
          <span className="tabular-nums text-gray-700 dark:text-gray-300">
            {lc.taxAmt.toFixed(2)}
            {item.taxMethod === 'INCLUSIVE' && <span className="ml-1 text-[10px] text-gray-400">incl.</span>}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        )}
      </td>

      <td className={td}>
        {hasRetail || hasWholesale ? (
          <select
            value={item.priceType}
            onChange={e => changePriceType(idx, e.target.value as PriceType)}
            disabled={!allowPriceChange}
            aria-label="Price list"
            className={`${posTable.select} ${!allowPriceChange ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="MRP">MRP</option>
            {hasRetail && <option value="Retail">Retail</option>}
            {hasWholesale && <option value="Wholesale">Wholesale</option>}
          </select>
        ) : (
          <span className="text-xs text-gray-400">MRP</span>
        )}
      </td>

      <td className={`${td} text-right`}>
        <span className={`tabular-nums font-semibold ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
          {fmt(lc.lineTotal)}
        </span>
      </td>

      <td className={`${td} text-center`}>
        <button type="button" aria-label={`Remove ${item.product.name}`} onClick={() => removeItem(idx)} className={posTable.removeBtn}>
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
