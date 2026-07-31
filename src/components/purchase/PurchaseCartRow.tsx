import { useState } from 'react';
import { Plus, Minus, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import type { CartItem } from './types';
import { getDiscountAmount, fmt } from './types';

interface PurchaseCartRowProps {
  item: CartItem;
  idx: number;
  isFirst: boolean;
  lastQtyRef: React.RefObject<HTMLInputElement | null>;
  barcodeRef: React.RefObject<HTMLInputElement | null>;
  allowPriceChange: boolean;
  allowDiscountTypeSwitch: boolean;
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

export function PurchaseCartRow({
  item,
  idx,
  isFirst,
  lastQtyRef,
  barcodeRef,
  allowPriceChange,
  allowDiscountTypeSwitch,
  updateQty,
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
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-3 py-1.5 align-middle">
        <p className="font-medium text-gray-900 dark:text-gray-100 break-words">{item.product.name}</p>
        <p
          className="text-gray-400 text-[11px] truncate"
          title={item.variant.barcode ? `${item.variant.barcode}` : undefined}
        >
          {item.variant.barcode && <span className="mr-1">{item.variant.barcode}</span>}
          {item.variant.factor > 1 && <span className="text-primary-500">×{item.variant.factor}</span>}
        </p>
      </td>
      <td className="px-2 py-1.5 align-middle">
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
          <span className="text-xs text-gray-500">{item.variant.name}</span>
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
            ref={isFirst ? lastQtyRef : undefined}
            type="number"
            value={item.qty}
            min={1}
            onChange={e => updateField(idx, 'qty', Number(e.target.value))}
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
      <td className="px-2 py-1.5 align-middle">
        <input
          type="number"
          value={item.unitCost}
          min={0}
          step="0.01"
          onChange={e => updateField(idx, 'unitCost', Number(e.target.value))}
          className="w-full text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 px-1 text-xs"
        />
      </td>
      <td className="px-2 py-1.5 align-middle text-right text-xs font-medium text-gray-700 dark:text-gray-300">
        {fmt(item.totalCost)}
      </td>
      <td className="px-2 py-1.5 align-middle">
        <div className="flex items-center justify-end gap-0.5">
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
      </td>
      <td className="px-2 py-1.5 align-middle text-right">
        {isEditingRate ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              autoFocus
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
              className="w-16 text-right border border-primary-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-0.5 px-1 text-xs font-semibold focus:ring-1 focus:ring-primary-500 outline-none"
            />
            <button
              onClick={handleSaveRate}
              title="Save selling price permanently to DB for product & variants"
              disabled={isSavingRate}
              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded shrink-0"
            >
              {isSavingRate ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              onClick={() => setIsEditingRate(false)}
              title="Cancel"
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1 group">
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
              {item.unitRate.toFixed(2)}
            </span>
            {allowPriceChange && (
              <button
                onClick={() => {
                  setEditingRateVal(item.unitRate.toString());
                  setIsEditingRate(true);
                }}
                title="Edit sale rate & update permanently in DB for all variants"
                className="opacity-70 group-hover:opacity-100 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-opacity p-0.5 rounded"
              >
                <Pencil size={11} />
              </button>
            )}
          </div>
        )}
      </td>
      <td
        className={`px-2 py-1.5 align-middle text-right text-xs font-medium ${
          profitTotal >= 0 ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {profitTotal !== 0 ? fmt(profitTotal) : '—'}
      </td>
      <td className="px-2 py-1.5 align-middle text-right font-medium text-gray-900 dark:text-gray-100">
        {fmt(netTotal)}
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
