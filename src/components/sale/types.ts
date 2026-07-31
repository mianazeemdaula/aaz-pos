import type { Product, ProductVariant } from '../../types/pos';
import { round2 } from '../../utils/calculations';

export { round2 };

export type PriceType = 'MRP' | 'Retail' | 'Wholesale';
export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  qty: number;
  priceType: PriceType;
  price: number;
  discount: number;
  discountType: DiscountType;
  taxRate: number;
  taxMethod: 'EXCLUSIVE' | 'INCLUSIVE';
  hsCode: string;
}

export interface CartItemProfitDetail {
  item: CartItem;
  unitCost: number;
  totalCost: number;
  unitPrice: number;
  netRevenue: number;
  profit: number;
  margin: number;
}

export function getVariantPrice(variant: ProductVariant, pt: PriceType): number {
  if (pt === 'Retail' && variant.retail != null) return round2(variant.retail);
  if (pt === 'Wholesale' && variant.wholesale != null) return round2(variant.wholesale);
  return round2(variant.price);
}

export function computeLine(item: CartItem) {
  const gross = round2(item.qty * item.price);
  const discAmt = round2(item.discountType === 'FIXED' ? item.discount * item.qty : (gross * item.discount) / 100);
  const afterDisc = round2(gross - discAmt);
  let taxAmt: number;
  let lineTotal: number;
  if (item.taxMethod === 'INCLUSIVE' && item.taxRate > 0) {
    lineTotal = afterDisc;
    taxAmt = round2((afterDisc * item.taxRate) / (100 + item.taxRate));
  } else {
    taxAmt = round2((afterDisc * item.taxRate) / 100);
    lineTotal = round2(afterDisc + taxAmt);
  }
  return { gross, discAmt, afterDisc, taxAmt, lineTotal };
}

export function computeCartProfit(cart: CartItem[], invoiceDiscount: number = 0) {
  let totalRevenue = 0;
  let totalCost = 0;
  const items: CartItemProfitDetail[] = [];

  for (const item of cart) {
    const lc = computeLine(item);
    const netRevenue = round2(item.taxMethod === 'INCLUSIVE' ? lc.afterDisc - lc.taxAmt : lc.afterDisc);
    const unitCost = round2((item.variant.product?.avgCostPrice ?? item.product?.avgCostPrice ?? 0) * (item.variant.factor || 1));
    const itemTotalCost = round2(unitCost * item.qty);
    const itemProfit = round2(netRevenue - itemTotalCost);
    const itemMargin = netRevenue !== 0 ? round2((itemProfit / Math.abs(netRevenue)) * 100) : 0;

    totalRevenue = round2(totalRevenue + netRevenue);
    totalCost = round2(totalCost + itemTotalCost);

    items.push({
      item,
      unitCost,
      totalCost: itemTotalCost,
      unitPrice: round2(item.price),
      netRevenue,
      profit: itemProfit,
      margin: itemMargin,
    });
  }

  const profit = round2(totalRevenue - totalCost - invoiceDiscount);
  const margin = totalRevenue > 0 ? round2((profit / totalRevenue) * 100) : 0;

  return { totalRevenue: round2(totalRevenue), totalCost: round2(totalCost), profit, margin, items };
}

export const fmt = (n: number) =>
  `Rs ${round2(n).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function parseError(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  const ae = e as any;
  if (ae?.error?.message) return ae.error.message;
  if (typeof ae?.message === 'string') return ae.message;
  return fallback;
}
