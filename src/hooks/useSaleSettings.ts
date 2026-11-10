import { useState, useEffect } from 'react';
import { useAuth } from '../contexts';
import { settingsService } from '../services/pos.service';
import { parseDiscountLimit, parseDiscountType } from '../components/sale/cart-rules';

/**
 * Till rules for the signed-in user.
 *
 * A per-user value overrides the global one; the API resolves the same keys the
 * same way (aaz-pos-backend/src/services/sales/cashier-policy.ts), so a control
 * the screen greys out is also a request the server refuses.
 */
export interface SaleSettings {
    allowPriceChange: boolean;
    allowDiscountTypeSwitch: boolean;
    allowCartProfitView: boolean;
    /** Largest discount a cashier may apply, as a percentage. `null` = no limit. */
    maxDiscountPercent: number | null;
    /** Administrators are not bound by the till limits. */
    exemptFromLimits: boolean;
    /** Discount type a new line starts with on the New Sale screen. */
    saleDefaultDiscountType: 'PERCENTAGE' | 'FIXED';
    /** Discount type a new line starts with on the Purchase screen. */
    purchaseDefaultDiscountType: 'PERCENTAGE' | 'FIXED';
}

const DEFAULTS: SaleSettings = {
    allowPriceChange: true,
    allowDiscountTypeSwitch: true,
    allowCartProfitView: true,
    maxDiscountPercent: null,
    exemptFromLimits: true,
    // The behaviour before these settings existed: sales in %, purchases flat.
    saleDefaultDiscountType: 'PERCENTAGE',
    purchaseDefaultDiscountType: 'FIXED',
};

export function useSaleSettings(): SaleSettings & { loading: boolean } {
    const { user } = useAuth();
    const [settings, setSettings] = useState<SaleSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        Promise.all([settingsService.getApp(), settingsService.getUserSettings(user.id)])
            .then(([app, usr]) => {
                // Per-user value first, then the global one, then the default.
                const pick = (key: string): unknown => (usr[key] !== undefined ? usr[key] : app[key]);
                const flag = (key: string, defaultVal: boolean) => {
                    const v = pick(key);
                    return v !== undefined ? !!v : defaultVal;
                };

                setSettings({
                    allowPriceChange: flag('sale.allowPriceChange', true),
                    allowDiscountTypeSwitch: flag('sale.allowDiscountTypeSwitch', true),
                    allowCartProfitView: user.role === 'ADMIN' || flag('sale.allowCartProfitView', user.role === 'MANAGER'),
                    maxDiscountPercent: parseDiscountLimit(pick('maxCashierDiscount')),
                    exemptFromLimits: user.role === 'ADMIN',
                    saleDefaultDiscountType: parseDiscountType(pick('sale.defaultDiscountType'), DEFAULTS.saleDefaultDiscountType),
                    purchaseDefaultDiscountType: parseDiscountType(
                        pick('purchase.defaultDiscountType'),
                        DEFAULTS.purchaseDefaultDiscountType
                    ),
                });
            })
            .catch(() => { /* keep the permissive defaults — the API is authoritative */ })
            .finally(() => setLoading(false));
    }, [user]);

    return { ...settings, loading };
}
