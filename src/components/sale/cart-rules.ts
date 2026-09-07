import type { CartItem } from './types';

/**
 * Cart-side mirror of the backend sales rules (see
 * aaz-pos-backend/src/services/sales). Kept in one place so the POS screen and
 * the API agree on what is allowed instead of drifting apart.
 *
 * The single idea behind this file: a negative quantity is a RETURN. Returned
 * goods are refunded at the price the customer originally paid, so they are
 * never checked against today's cost price and never counted against the
 * discount allowance.
 */

/** A negative quantity means the customer is giving the goods back. */
export const isReturnLine = (item: CartItem): boolean => item.qty < 0;

/** The half of the cart that is actually being sold. */
export const sellingLines = (cart: CartItem[]): CartItem[] => cart.filter(i => !isReturnLine(i));

/** The half of the cart that is coming back. */
export const returnLines = (cart: CartItem[]): CartItem[] => cart.filter(isReturnLine);

/**
 * True when anything is being handed back. Note this is not the same as the
 * cart netting negative: a cart can hold a return and still be owed money.
 */
export const hasAnyReturnLine = (cart: CartItem[]): boolean => cart.some(isReturnLine);

/**
 * The original invoice to cite for the returned lines, as the API expects it.
 *
 * Optional by design: the API only insists on a reference for a standalone
 * refund. A counter exchange goes through without one, so a blank or malformed
 * box must send nothing rather than block the sale.
 */
export function resolveParentSaleId(cart: CartItem[], originalInvoiceId: string): number | undefined {
  if (!hasAnyReturnLine(cart)) return undefined;
  const id = parseInt(String(originalInvoiceId).trim(), 10);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

/** Per-unit discount in currency, whichever way the user entered it. */
export const unitDiscountAmount = (item: CartItem): number =>
  item.discountType === 'FIXED' ? item.discount : (item.price * item.discount) / 100;

export const netUnitPrice = (item: CartItem): number => item.price - unitDiscountAmount(item);

export const unitCost = (item: CartItem): number =>
  (item.variant.product?.avgCostPrice ?? item.product?.avgCostPrice ?? 0) * (item.variant.factor || 1);

const displayName = (item: CartItem): string =>
  item.variant.product?.name ?? item.product?.name ?? item.variant.name;

/** Every line must carry a usable quantity. Zero is neither a sale nor a return. */
export function validateQuantities(cart: CartItem[]): string | null {
  for (const item of cart) {
    if (!item.qty || item.qty === 0) {
      return `Please enter a valid quantity for ${displayName(item)}.`;
    }
  }
  return null;
}

/**
 * Cost-price policy — SELLING LINES ONLY.
 * Returned lines are filtered out before anything is compared to cost.
 */
export function validateLineCostPrices(cart: CartItem[]): string | null {
  for (const item of sellingLines(cart)) {
    const net = netUnitPrice(item);
    if (net < 0) {
      return `Discount cannot exceed selling price for ${displayName(item)}.`;
    }

    const cost = unitCost(item);
    if (item.variant.product && !item.variant.product.saleBelowCost && net < cost) {
      return (
        `Discount cannot make selling price below cost price for ${displayName(item)} ` +
        `(Cost: Rs ${cost.toFixed(2)}, Net Price: Rs ${net.toFixed(2)}).`
      );
    }
  }
  return null;
}

/**
 * Largest invoice-level discount the cart can absorb, or null when no limit
 * applies (pure return cart, or every product allows selling below cost).
 * Only selling lines contribute — a returned line would otherwise subtract its
 * cost from the allowance and wrongly shrink it.
 */
export function maxInvoiceDiscount(cart: CartItem[]): number | null {
  let totalCost = 0;
  let totalNet = 0;
  let applicable = false;

  for (const item of sellingLines(cart)) {
    if (!item.variant.product || item.variant.product.saleBelowCost) continue;
    totalCost += unitCost(item) * item.qty;
    totalNet += netUnitPrice(item) * item.qty;
    applicable = true;
  }

  return applicable ? totalNet - totalCost : null;
}

export function validateInvoiceDiscount(cart: CartItem[], invoiceDiscount: number): string | null {
  const limit = maxInvoiceDiscount(cart);
  if (limit === null) return null;

  if (invoiceDiscount > limit) {
    return (
      `Overall invoice discount cannot exceed Rs ${limit.toFixed(2)} ` +
      `(the margin above cost price for non-sale-below-cost items).`
    );
  }
  return null;
}

/**
 * Full pre-submit check. Returns the first error message, or null when the cart
 * may be sent to the API. A cart made entirely of returns passes straight
 * through: no cost price check, no discount check.
 */
export function validateCart(
  cart: CartItem[],
  invoiceDiscount: number,
  limits?: TillLimits
): string | null {
  return (
    validateQuantities(cart) ??
    validateLineCostPrices(cart) ??
    validateInvoiceDiscount(cart, invoiceDiscount) ??
    (limits ? validateTillLimits(cart, invoiceDiscount, limits) : null)
  );
}

// ─── Till limits ────────────────────────────────────────────────────────────

/**
 * What this cashier may change at the till. Mirrors the server's
 * CashierPolicy (aaz-pos-backend/src/services/sales/cashier-policy.ts) so the
 * cart refuses the same things the API does, before the sale is posted.
 */
export interface TillLimits {
  /** The cashier may type any unit price. */
  allowPriceChange: boolean;
  /** Largest discount as a percentage of the line price. `null` = no limit. */
  maxDiscountPercent: number | null;
  /** Administrators bypass both. */
  exemptFromLimits: boolean;
}

/**
 * Read the stored "Max Cashier Discount Limit (%)" value.
 *
 * A limit of 100% or more is no restriction at all, and an unset or unusable
 * value must not silently become a restriction — the API reads it the same way.
 */
export function parseDiscountLimit(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n >= 100) return null;
  return n;
}

/** Prices a variant may legitimately be sold at. */
export function allowedPrices(item: CartItem): number[] {
  const v = item.variant;
  return [v.price, v.retail, v.wholesale].filter(
    (p): p is number => p !== null && p !== undefined && Number.isFinite(p)
  );
}

/** A line's discount as a percentage of its unit price. */
export function discountPercentOf(item: CartItem): number {
  if (item.discountType === 'PERCENTAGE') return item.discount;
  if (item.price <= 0) return item.discount > 0 ? 100 : 0;
  return (item.discount / item.price) * 100;
}

/** Gross value of the selling lines, before any discount. */
export function sellingGross(cart: CartItem[]): number {
  return sellingLines(cart).reduce((sum, i) => sum + i.price * i.qty, 0);
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * With price editing off, a line must carry one of the variant's own prices.
 * Picking MRP / retail / wholesale is choosing a price list, not overriding it.
 */
export function validatePriceChanges(cart: CartItem[], limits: TillLimits): string | null {
  if (limits.exemptFromLimits || limits.allowPriceChange) return null;

  for (const item of sellingLines(cart)) {
    const permitted = allowedPrices(item);
    if (permitted.length > 0 && !permitted.map(round2).includes(round2(item.price))) {
      return `You are not allowed to change the unit price of ${displayName(item)}.`;
    }
  }
  return null;
}

/** No line, and no invoice discount, may exceed the configured percentage. */
export function validateDiscountLimit(
  cart: CartItem[],
  invoiceDiscount: number,
  limits: TillLimits
): string | null {
  const limit = limits.maxDiscountPercent;
  if (limits.exemptFromLimits || limit === null) return null;

  for (const item of sellingLines(cart)) {
    const percent = round2(discountPercentOf(item));
    if (percent > limit) {
      return `Discount on ${displayName(item)} is ${percent.toFixed(2)}%, above your ${limit}% limit.`;
    }
  }

  const discount = round2(invoiceDiscount);
  if (discount > 0) {
    const gross = sellingGross(cart);
    if (gross <= 0) return 'An invoice discount needs at least one item to discount.';

    const percent = round2((discount / gross) * 100);
    if (percent > limit) {
      const max = round2((gross * limit) / 100);
      return (
        `Invoice discount is ${percent.toFixed(2)}% of the bill, above your ${limit}% limit ` +
        `(maximum Rs ${max.toFixed(2)}).`
      );
    }
  }

  return null;
}

/** The till limits for a cart. No-op for an administrator or a pure return. */
export function validateTillLimits(
  cart: CartItem[],
  invoiceDiscount: number,
  limits: TillLimits
): string | null {
  if (limits.exemptFromLimits) return null;
  if (sellingLines(cart).length === 0) return null; // pure return — nothing sold

  return validatePriceChanges(cart, limits) ?? validateDiscountLimit(cart, invoiceDiscount, limits);
}
