import type { Product, ProductVariant, Supplier } from '../../types/pos';
import { round2 } from '../../utils/calculations';

export { round2 };

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface CartItem {
  product: Product & { barcode?: string };
  variant: ProductVariant;
  qty: number;
  unitCost: number; // cost price per unit, user-entered
  totalCost: number; // auto-calculated: qty × unitCost
  discount: number; // discount value (Rs if FIXED, % if PERCENTAGE)
  discountType: DiscountType;
  unitRate: number; // intended selling price per unit (for profit display)
}

export function getDiscountAmount(item: CartItem): number {
  if (item.discountType === 'FIXED') return round2(item.discount * item.qty);
  return round2((item.totalCost * item.discount) / 100);
}

export const fmt = (n: number) =>
  `Rs ${round2(n).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function parseError(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  const ae = e as { error?: { message?: string }; message?: string };
  if (ae?.error?.message) return ae.error.message;
  if (typeof ae?.message === 'string') return ae.message;
  return fallback;
}

// LocalStorage Draft
export const LS_KEY = 'purchase_draft';

export interface Draft {
  cart: CartItem[];
  supplier: Supplier | null;
  note: string;
  refNo: string;
  accountAmounts: Record<number, string>;
  invoiceDiscount: number;
  invoiceTax: number;
  invoiceExpenses: number;
}

export function saveDraft(draft: Draft) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(draft));
  } catch {
    /* quota */
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
