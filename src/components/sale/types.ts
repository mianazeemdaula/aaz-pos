import type { Product, ProductVariant } from '../../types/pos';

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
  if (pt === 'Retail' && variant.retail != null) return variant.retail;
  if (pt === 'Wholesale' && variant.wholesale != null) return variant.wholesale;
  return variant.price;
}

export function computeLine(item: CartItem) {
  const gross = item.qty * item.price;
  const discAmt = item.discountType === 'FIXED' ? item.discount * item.qty : (gross * item.discount) / 100;
  const afterDisc = gross - discAmt;
  let taxAmt: number;
  let lineTotal: number;
  if (item.taxMethod === 'INCLUSIVE' && item.taxRate > 0) {
    lineTotal = afterDisc;
    taxAmt = (afterDisc * item.taxRate) / (100 + item.taxRate);
  } else {
    taxAmt = (afterDisc * item.taxRate) / 100;
    lineTotal = afterDisc + taxAmt;
  }
  return { gross, discAmt, afterDisc, taxAmt, lineTotal };
}

export function computeCartProfit(cart: CartItem[], invoiceDiscount: number = 0) {
  let totalRevenue = 0;
  let totalCost = 0;
  const items: CartItemProfitDetail[] = [];

  for (const item of cart) {
    const lc = computeLine(item);
    const netRevenue = item.taxMethod === 'INCLUSIVE' ? lc.afterDisc - lc.taxAmt : lc.afterDisc;
    const unitCost = (item.variant.product?.avgCostPrice ?? item.product?.avgCostPrice ?? 0) * (item.variant.factor || 1);
    const itemTotalCost = unitCost * item.qty;
    const itemProfit = netRevenue - itemTotalCost;
    const itemMargin = netRevenue !== 0 ? (itemProfit / Math.abs(netRevenue)) * 100 : 0;

    totalRevenue += netRevenue;
    totalCost += itemTotalCost;

    items.push({
      item,
      unitCost,
      totalCost: itemTotalCost,
      unitPrice: item.price,
      netRevenue,
      profit: itemProfit,
      margin: itemMargin,
    });
  }

  const profit = totalRevenue - totalCost - invoiceDiscount;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  return { totalRevenue, totalCost, profit, margin, items };
}

export const fmt = (n: number) =>
  `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function parseError(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  const ae = e as any;
  if (ae?.error?.message) return ae.error.message;
  if (typeof ae?.message === 'string') return ae.message;
  return fallback;
}
