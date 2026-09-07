import { describe, it, expect } from 'vitest';

import {
  hasAnyReturnLine,
  isReturnLine,
  resolveParentSaleId,
  maxInvoiceDiscount,
  netUnitPrice,
  returnLines,
  sellingLines,
  unitCost,
  validateCart,
  validateInvoiceDiscount,
  validateLineCostPrices,
  validateQuantities,
  allowedPrices,
  discountPercentOf,
  sellingGross,
  validatePriceChanges,
  validateDiscountLimit,
  validateTillLimits,
  parseDiscountLimit,
  type TillLimits,
} from '../cart-rules';
import type { CartItem, DiscountType } from '../types';
import type { Product, ProductVariant } from '../../../types/pos';

let nextId = 1;

function makeItem(o: {
  name?: string;
  qty: number;
  price?: number;
  discount?: number;
  discountType?: DiscountType;
  avgCostPrice?: number;
  saleBelowCost?: boolean;
  factor?: number;
}): CartItem {
  const id = nextId++;
  const product = {
    id,
    name: o.name ?? `Product ${id}`,
    categoryId: 1,
    totalStock: 100,
    avgCostPrice: o.avgCostPrice ?? 60,
    reorderLevel: 0,
    allowNegative: false,
    active: true,
    saleBelowCost: o.saleBelowCost ?? false,
    taxRate: 0,
    taxMethod: 'EXCLUSIVE' as const,
    hsCode: '',
  } as unknown as Product;

  const variant = {
    id: id * 10,
    productId: id,
    name: 'Unit',
    barcode: `BC${id}`,
    price: o.price ?? 100,
    retail: null,
    wholesale: null,
    factor: o.factor ?? 1,
    isDefault: true,
    product,
  } as unknown as ProductVariant;

  return {
    product,
    variant,
    qty: o.qty,
    priceType: 'MRP',
    price: o.price ?? 100,
    discount: o.discount ?? 0,
    discountType: o.discountType ?? 'FIXED',
    taxRate: 0,
    taxMethod: 'EXCLUSIVE',
    hsCode: '',
  };
}

describe('cart-rules: a negative quantity is a return', () => {
  it('flags negative quantities and splits the cart', () => {
    const sold = makeItem({ qty: 2 });
    const returned = makeItem({ qty: -1 });

    expect(isReturnLine(sold)).toBe(false);
    expect(isReturnLine(returned)).toBe(true);
    expect(sellingLines([sold, returned])).toEqual([sold]);
    expect(returnLines([sold, returned])).toEqual([returned]);
  });

  it('resolves percentage and fixed discounts to a net unit price', () => {
    expect(netUnitPrice(makeItem({ qty: 1, price: 200, discount: 25, discountType: 'FIXED' }))).toBe(175);
    expect(netUnitPrice(makeItem({ qty: 1, price: 200, discount: 25, discountType: 'PERCENTAGE' }))).toBe(150);
  });

  it('scales the unit cost by the variant pack factor', () => {
    expect(unitCost(makeItem({ qty: 1, avgCostPrice: 8, factor: 12 }))).toBe(96);
  });
});

describe('cart-rules: linking returns to the original invoice', () => {
  const sold = makeItem({ qty: 1, price: 500 });
  const returned = makeItem({ qty: -1, price: 200 });

  it('detects a returned line even when the cart still nets positive', () => {
    expect(hasAnyReturnLine([sold, returned])).toBe(true);
    expect(hasAnyReturnLine([sold])).toBe(false);
  });

  it('sends nothing when the cart has no returned line', () => {
    expect(resolveParentSaleId([sold], '42')).toBeUndefined();
  });

  it('sends the invoice number the cashier typed', () => {
    expect(resolveParentSaleId([sold, returned], '42')).toBe(42);
    expect(resolveParentSaleId([sold, returned], ' 42 ')).toBe(42);
  });

  it('sends nothing rather than blocking when the box is blank or unusable', () => {
    expect(resolveParentSaleId([sold, returned], '')).toBeUndefined();
    expect(resolveParentSaleId([sold, returned], '   ')).toBeUndefined();
    expect(resolveParentSaleId([sold, returned], 'abc')).toBeUndefined();
    expect(resolveParentSaleId([sold, returned], '0')).toBeUndefined();
    expect(resolveParentSaleId([sold, returned], '-3')).toBeUndefined();
  });
});

describe('cart-rules: quantities', () => {
  it('rejects a zero quantity', () => {
    expect(validateQuantities([makeItem({ name: 'Rice', qty: 0 })])).toMatch(/valid quantity for Rice/);
  });

  it('accepts positive and negative quantities', () => {
    expect(validateQuantities([makeItem({ qty: 3 }), makeItem({ qty: -3 })])).toBeNull();
  });
});

describe('cart-rules: cost price is NOT checked on returned lines', () => {
  it('accepts a return refunded below the current cost', () => {
    const returned = makeItem({ name: 'Oil', qty: -2, price: 100, avgCostPrice: 150 });
    expect(validateLineCostPrices([returned])).toBeNull();
  });

  it('accepts a return whose pack factor puts the cost far above the refund', () => {
    const returned = makeItem({ name: 'Pen dozen', qty: -1, price: 120, avgCostPrice: 40, factor: 12 });
    expect(validateLineCostPrices([returned])).toBeNull();
  });

  it('accepts a return line discounted past its own price', () => {
    const returned = makeItem({ name: 'Biscuit', qty: -1, price: 50, discount: 60, avgCostPrice: 30 });
    expect(validateLineCostPrices([returned])).toBeNull();
  });

  it('still blocks a selling line below cost', () => {
    const sold = makeItem({ name: 'Shirt', qty: 1, price: 200, discount: 100, avgCostPrice: 120 });
    expect(validateLineCostPrices([sold])).toMatch(/below cost price for Shirt/);
  });

  it('still blocks a selling line discounted past its price', () => {
    const sold = makeItem({ name: 'Cap', qty: 1, price: 50, discount: 80, avgCostPrice: 10, saleBelowCost: true });
    expect(validateLineCostPrices([sold])).toMatch(/Discount cannot exceed selling price for Cap/);
  });

  it('allows a below-cost sale when the product opts in', () => {
    const sold = makeItem({ qty: 1, price: 100, discount: 60, avgCostPrice: 80, saleBelowCost: true });
    expect(validateLineCostPrices([sold])).toBeNull();
  });

  it('ignores the returned line in a mixed cart while judging the selling one', () => {
    const sold = makeItem({ name: 'New Shirt', qty: 1, price: 200, avgCostPrice: 120 });
    const returned = makeItem({ name: 'Old Shirt', qty: -1, price: 100, avgCostPrice: 150 });
    expect(validateLineCostPrices([sold, returned])).toBeNull();

    const cheapSale = makeItem({ name: 'New Shirt', qty: 1, price: 200, discount: 100, avgCostPrice: 120 });
    expect(validateLineCostPrices([cheapSale, returned])).toMatch(/below cost price for New Shirt/);
  });
});

describe('cart-rules: discount is NOT checked on returned lines', () => {
  it('applies no invoice discount limit to a pure return cart', () => {
    const cart = [makeItem({ qty: -3, price: 100, avgCostPrice: 90 })];
    expect(maxInvoiceDiscount(cart)).toBeNull();
    expect(validateInvoiceDiscount(cart, 5000)).toBeNull();
  });

  it('computes the allowance from selling lines alone in a mixed cart', () => {
    const sold = makeItem({ name: 'Jacket', qty: 1, price: 300, avgCostPrice: 200 }); // margin 100
    const returned = makeItem({ name: 'Scarf', qty: -1, price: 100, avgCostPrice: 90 });

    // Counting the returned line would give 100 + (-100 + 90) = 90.
    expect(maxInvoiceDiscount([sold, returned])).toBe(100);
    expect(validateInvoiceDiscount([sold, returned], 100)).toBeNull();
    expect(validateInvoiceDiscount([sold, returned], 101)).toMatch(/cannot exceed Rs 100\.00/);
  });

  it('enforces the allowance on a plain sale cart', () => {
    const cart = [makeItem({ qty: 2, price: 100, avgCostPrice: 60 })]; // margin 80
    expect(maxInvoiceDiscount(cart)).toBe(80);
    expect(validateInvoiceDiscount(cart, 80)).toBeNull();
    expect(validateInvoiceDiscount(cart, 80.01)).toMatch(/cannot exceed Rs 80\.00/);
  });

  it('has no limit when every product may be sold below cost', () => {
    const cart = [makeItem({ qty: 2, price: 100, avgCostPrice: 60, saleBelowCost: true })];
    expect(maxInvoiceDiscount(cart)).toBeNull();
    expect(validateInvoiceDiscount(cart, 9999)).toBeNull();
  });
});

describe('cart-rules: validateCart end to end', () => {
  it('lets a pure return cart through untouched', () => {
    const cart = [
      makeItem({ name: 'Oil', qty: -2, price: 100, discount: 90, avgCostPrice: 150 }),
      makeItem({ name: 'Tea', qty: -1, price: 80, avgCostPrice: 200 }),
    ];
    expect(validateCart(cart, 500)).toBeNull();
  });

  it('reports the quantity problem before the pricing one', () => {
    const cart = [makeItem({ name: 'Rice', qty: 0, price: 100, discount: 99, avgCostPrice: 90 })];
    expect(validateCart(cart, 0)).toMatch(/valid quantity for Rice/);
  });

  it('blocks a normal sale that breaks the cost floor', () => {
    const cart = [makeItem({ name: 'Sugar', qty: 1, price: 100, discount: 50, avgCostPrice: 80 })];
    expect(validateCart(cart, 0)).toMatch(/below cost price for Sugar/);
  });

  it('passes a normal sale within its margin', () => {
    const cart = [makeItem({ qty: 2, price: 100, discount: 10, avgCostPrice: 60 })];
    expect(validateCart(cart, 60)).toBeNull();
  });
});

/**
 * The two Sales & Inventory rules the till must honour before posting:
 * "Allow Cashiers to Edit Unit Prices" and "Max Cashier Discount Limit (%)".
 * The API enforces the same rules — these keep the cart in step with it.
 */
describe('till limits: Allow Cashiers to Edit Unit Prices', () => {
  const priced = (over: Parameters<typeof makeItem>[0] & { retail?: number; wholesale?: number }) => {
    const item = makeItem(over);
    (item.variant as { retail: number | null }).retail = over.retail ?? null;
    (item.variant as { wholesale: number | null }).wholesale = over.wholesale ?? null;
    return item;
  };

  const locked: TillLimits = { allowPriceChange: false, maxDiscountPercent: null, exemptFromLimits: false };
  const open: TillLimits = { allowPriceChange: true, maxDiscountPercent: null, exemptFromLimits: false };

  it('lists the variant price lists as the permitted prices', () => {
    const item = priced({ name: 'Rice', qty: 1, price: 100, retail: 110, wholesale: 90 });
    expect(allowedPrices(item)).toEqual([100, 110, 90]);
  });

  it('accepts any of the price lists', () => {
    for (const price of [100, 110, 90]) {
      const item = priced({ name: 'Rice', qty: 1, price: 100, retail: 110, wholesale: 90 });
      item.price = price;
      expect(validatePriceChanges([item], locked), `price ${price}`).toBeNull();
    }
  });

  it('rejects a hand-typed price', () => {
    const item = priced({ name: 'Rice', qty: 1, price: 100, retail: 110, wholesale: 90 });
    item.price = 85;
    expect(validatePriceChanges([item], locked)).toMatch(/not allowed to change the unit price of Rice/);
  });

  it('allows anything once the setting is on', () => {
    const item = priced({ name: 'Rice', qty: 1, price: 100 });
    item.price = 85;
    expect(validatePriceChanges([item], open)).toBeNull();
  });

  it('never applies to an administrator or to a returned line', () => {
    const item = priced({ name: 'Rice', qty: 1, price: 100 });
    item.price = 85;
    expect(validatePriceChanges([item], { ...locked, exemptFromLimits: true })).toBeNull();

    const returned = priced({ name: 'Rice', qty: -1, price: 100 });
    returned.price = 85;
    expect(validatePriceChanges([returned], locked)).toBeNull();
  });
});

describe('till limits: Max Cashier Discount Limit (%)', () => {
  const capped: TillLimits = { allowPriceChange: true, maxDiscountPercent: 10, exemptFromLimits: false };
  const uncapped: TillLimits = { allowPriceChange: true, maxDiscountPercent: null, exemptFromLimits: false };

  it('reads a percentage discount directly', () => {
    expect(discountPercentOf(makeItem({ qty: 1, price: 200, discount: 15, discountType: 'PERCENTAGE' }))).toBe(15);
  });

  it('converts a fixed discount to a percentage of the price', () => {
    expect(discountPercentOf(makeItem({ qty: 1, price: 200, discount: 20, discountType: 'FIXED' }))).toBe(10);
  });

  it('accepts a discount exactly on the limit', () => {
    const cart = [makeItem({ qty: 2, price: 200, discount: 20, discountType: 'FIXED' })];
    expect(validateDiscountLimit(cart, 0, capped)).toBeNull();
  });

  it('rejects a line past the limit', () => {
    const cart = [makeItem({ name: 'Sugar', qty: 1, price: 200, discount: 40, discountType: 'FIXED' })];
    expect(validateDiscountLimit(cart, 0, capped)).toMatch(/Discount on Sugar is 20\.00%, above your 10% limit/);
  });

  it('caps the invoice discount by the same percentage of the bill', () => {
    const cart = [makeItem({ qty: 5, price: 200 })]; // gross 1000
    expect(sellingGross(cart)).toBe(1000);
    expect(validateDiscountLimit(cart, 100, capped)).toBeNull();
    expect(validateDiscountLimit(cart, 101, capped)).toMatch(/above your 10% limit \(maximum Rs 100\.00\)/);
  });

  it('sizes the bill from the selling lines only', () => {
    const cart = [makeItem({ qty: 5, price: 200 }), makeItem({ qty: -1, price: 500 })];
    expect(sellingGross(cart)).toBe(1000);
  });

  it('does not apply to a pure return cart', () => {
    const cart = [makeItem({ qty: -2, price: 200, discount: 190, discountType: 'FIXED' })];
    expect(validateTillLimits(cart, 400, capped)).toBeNull();
  });

  it('does not apply to an administrator', () => {
    const cart = [makeItem({ qty: 1, price: 200, discount: 150, discountType: 'FIXED' })];
    expect(validateTillLimits(cart, 5000, { ...capped, exemptFromLimits: true })).toBeNull();
  });

  it('does nothing when no limit is configured', () => {
    const cart = [makeItem({ qty: 1, price: 200, discount: 199, discountType: 'FIXED' })];
    expect(validateDiscountLimit(cart, 5000, uncapped)).toBeNull();
  });
});

describe('till limits: validateCart applies them last', () => {
  const capped: TillLimits = { allowPriceChange: true, maxDiscountPercent: 10, exemptFromLimits: false };

  it('reports the cost-price problem before the discount limit', () => {
    // Below cost AND over the limit — the cost rule is the more fundamental.
    const cart = [makeItem({ name: 'Tea', qty: 1, price: 100, discount: 50, discountType: 'FIXED', avgCostPrice: 80 })];
    expect(validateCart(cart, 0, capped)).toMatch(/below cost price for Tea/);
  });

  it('reports the discount limit once the cost rule passes', () => {
    const cart = [makeItem({ name: 'Tea', qty: 1, price: 100, discount: 50, discountType: 'FIXED', avgCostPrice: 10 })];
    expect(validateCart(cart, 0, capped)).toMatch(/above your 10% limit/);
  });

  it('skips the limits entirely when none are passed', () => {
    const cart = [makeItem({ qty: 1, price: 100, discount: 50, discountType: 'FIXED', avgCostPrice: 10 })];
    expect(validateCart(cart, 0)).toBeNull();
  });
});

describe('Max Cashier Discount Limit: reading the stored value', () => {
  it('reads a configured percentage', () => {
    expect(parseDiscountLimit(10)).toBe(10);
    expect(parseDiscountLimit('7.5')).toBe(7.5);
    expect(parseDiscountLimit(0)).toBe(0);
  });

  it('treats 100% or more as no limit at all', () => {
    expect(parseDiscountLimit(100)).toBeNull();
    expect(parseDiscountLimit(150)).toBeNull();
  });

  it('treats an unset or unusable value as no limit', () => {
    for (const v of [undefined, null, '', 'abc', -5, NaN]) {
      expect(parseDiscountLimit(v), String(v)).toBeNull();
    }
  });
});
