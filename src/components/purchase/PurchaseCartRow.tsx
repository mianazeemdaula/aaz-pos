import { useState } from 'react';
import { Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import type { CartItem } from './types';
import { getDiscountAmount, fmt } from './types';
import { posTable, rowTone } from '../pos/PosKit';

interface PurchaseCartRowProps {
  item: CartItem;
  idx: number;
  /** 1-based row number shown in the first column. */
  lineNo: number;
  isFirst: boolean;
  /** Marks the most recently scanned line. */
  highlight?: boolean;
  lastQtyRef: React.RefObject<HTMLInputElement | null>;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
  allowPriceChange: boolean;
  allowDiscountTypeSwitch: boolean;
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

export function PurchaseCartRow({
  item,
  idx,
  lineNo,
  isFirst,
  highlight = false,
  lastQtyRef,
  barcodeRef,
  allowPriceChange,
  allowDiscountTypeSwitch,
  updateField,
  updatePermanentSellingRate,
  removeItem,
  changeVariant,
  onToggleDiscountType,
}: PurchaseCartRowProps) {
  const discAmt = getDiscountAmount(item);
  const netTotal = item.totalCost - discAmt;
  const netUnitCost = item.qty > 0 ? netTotal / item.qty : 0;
  const profitPerUnit = item.unitRate - netUnitCost;
  const profitTotal = profitPerUnit * item.qty;
  const variants = item.product.variants ?? [];
  const td = posTable.td;

  const [isEditingRate, setIsEditingRate] = useState(false);
  const [editingRateVal, setEditingRateVal] = useState('');
  const [isSavingRate, setIsSavingRate] = useState(false);

  const handleSaveRate = async () => {
    const val = parseFloat(editingRateVal);
    if (isNaN(val) || val < 0) return;
    setIsSavingRate(true);
    try {
      await updatePermanentSellingRate(idx, val);
      setIsEditingRate(false);
    } finally {
      setIsSavingRate(false);
    }
  };

  return (
    <tr className={`transition-colors ${rowTone({ latest: highlight })}`}>
      <td className={`${td} text-center relative`}>
        {highlight && <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary-500" />}
        <span className="text-xs text-gray-400 tabular-nums">{lineNo}</span>
      </td>

      <td className={td}>
        <div className="flex items-baseline gap-2 min-w-0" title={`${item.product.name}${item.variant.barcode ? ` · ${item.variant.barcode}` : ''}`}>
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.product.name}</span>
          {item.variant.barcode && <span className="shrink-0 text-[11px] text-gray-400 font-mono">{item.variant.barcode}</span>}
          {item.variant.factor > 1 && <span className="shrink-0 text-[11px] text-primary-600 dark:text-primary-400">×{item.variant.factor}</span>}
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
            ref={isFirst ? lastQtyRef : undefined}
            type="number"
            aria-label="Quantity"
            value={item.qty === 0 ? '' : item.qty}
            min={1}
            step="any"
            onChange={e => updateField(idx, 'qty', e.target.value === '' ? 0 : Number(e.target.value))}
            onBlur={() => {
              if (!item.qty || item.qty < 1) {
                updateField(idx, 'qty', 1);
              }
            }}
            onKeyDown={
              isFirst
                ? e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      barcodeRef.current?.focus();
                    }
                  }
                : undefined
            }
            className={`${posTable.input} text-center font-semibold`}
          />
      </td>

      <td className={`${td} text-right`}>
        <input
          type="number"
          aria-label="Unit cost"
          value={item.unitCost}
          min={0}
          step="0.01"
          onChange={e => updateField(idx, 'unitCost', Number(e.target.value))}
          className={`${posTable.input} text-right`}
        />
      </td>

      <td className={`${td} text-right tabular-nums text-gray-700 dark:text-gray-300`}>{fmt(item.totalCost)}</td>

      <td className={`${td} text-right`}>
        <div className="flex items-center justify-end">
          <input
            type="number"
            aria-label="Discount"
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
            className={`${posTable.input} !w-16 text-right !rounded-r-none`}
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
        {isEditingRate ? (
          <div className="flex items-center justify-end gap-0.5">
            <input
              type="number"
              autoFocus
              aria-label="New sale rate"
              value={editingRateVal}
              min={0}
              step="0.01"
              onChange={e => setEditingRateVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveRate();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsEditingRate(false);
                }
              }}
              className={`${posTable.input} !w-[4.5rem] text-right font-semibold !border-primary-500`}
            />
            <button
              type="button"
              onClick={handleSaveRate}
              title="Save selling price permanently to DB for product & variants"
              aria-label="Save sale rate"
              disabled={isSavingRate}
              className="w-6 h-6 grid place-items-center rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 shrink-0"
            >
              {isSavingRate ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingRate(false)}
              title="Cancel"
              aria-label="Cancel"
              className="w-6 h-6 grid place-items-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1 group">
            <span className="tabular-nums font-medium text-gray-900 dark:text-gray-100">{item.unitRate.toFixed(2)}</span>
            {allowPriceChange && (
              <button
                type="button"
                onClick={() => {
                  setEditingRateVal(item.unitRate.toString());
                  setIsEditingRate(true);
                }}
                title="Edit sale rate & update permanently in DB for all variants"
                aria-label="Edit sale rate"
                className="w-6 h-6 grid place-items-center rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 dark:hover:text-primary-400 transition-colors"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        )}
      </td>

      <td
        className={`${td} text-right tabular-nums font-medium ${
          profitTotal > 0 ? 'text-green-600 dark:text-green-400' : profitTotal < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'
        }`}
      >
        {profitTotal !== 0 ? fmt(profitTotal) : '—'}
      </td>

      <td className={`${td} text-right`}>
        <span className="tabular-nums font-semibold text-gray-900 dark:text-gray-100">{fmt(netTotal)}</span>
      </td>

      <td className={`${td} text-center`}>
        <button type="button" aria-label={`Remove ${item.product.name}`} onClick={() => removeItem(idx)} className={posTable.removeBtn}>
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
