import type { CartItem } from './types';
import { fmt } from './types';

interface SaleCartSummaryProps {
    cart: CartItem[];
    subtotal: number;
    itemDiscountTotal: number;
    invoiceDiscount: number;
    taxTotal: number;
    grandTotal: number;
    isReturnCart: boolean;
}

/** Trim trailing zeros so whole quantities read as "12", not "12.00". */
const qtyLabel = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''));

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'negative' }) {
    return (
        <span className="flex items-baseline gap-1">
            <span className="text-[10px] uppercase tracking-wide text-gray-400">{label}</span>
            <span className={`tabular-nums font-semibold ${tone === 'negative'
                ? 'text-red-600 dark:text-red-500'
                : 'text-gray-700 dark:text-gray-200'}`}>
                {value}
            </span>
        </span>
    );
}

/**
 * A single-line tally pinned under the cart.
 *
 * The right-hand panel already carries the full breakdown; this is the
 * at-a-glance version for the wide pane, so it stays on one line and adds no
 * vertical space beyond its own row. Hidden entirely on an empty cart.
 */
export function SaleCartSummary({
    cart,
    subtotal,
    itemDiscountTotal,
    invoiceDiscount,
    taxTotal,
    grandTotal,
    isReturnCart,
}: SaleCartSummaryProps) {
    if (cart.length === 0) return null;

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const discountTotal = itemDiscountTotal + invoiceDiscount;

    return (
        <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-0.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 px-3 py-1.5 text-[11px] leading-snug">
            <Stat label="Items" value={String(cart.length)} />
            <Stat label="Qty" value={qtyLabel(totalQty)} />
            <Stat label="Subtotal" value={fmt(subtotal)} />
            {discountTotal > 0 && <Stat label="Discount" value={`−${fmt(discountTotal)}`} tone="negative" />}
            {taxTotal > 0 && <Stat label="Tax" value={fmt(taxTotal)} />}

            <span className="ml-auto flex items-baseline gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-gray-400">
                    {isReturnCart ? 'Refund' : 'Total'}
                </span>
                <span className={`text-sm font-bold tabular-nums tracking-tight ${isReturnCart
                    ? 'text-red-600 dark:text-red-500'
                    : 'text-gray-900 dark:text-gray-100'}`}>
                    {fmt(grandTotal)}
                </span>
            </span>
        </div>
    );
}
