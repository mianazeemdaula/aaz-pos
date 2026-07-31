import { useState, useEffect } from 'react';
import { useAuth } from '../contexts';
import { settingsService } from '../services/pos.service';

export function useSaleSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({
        allowPriceChange: true,
        allowDiscountTypeSwitch: true,
        allowCartProfitView: true,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        Promise.all([settingsService.getApp(), settingsService.getUserSettings(user.id)])
            .then(([app, usr]) => {
                const resolve = (key: string, defaultVal: boolean) => {
                    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
                        const userVal = usr[key];
                        if (userVal !== undefined) return !!userVal;
                        return app[key] !== undefined ? !!app[key] : defaultVal;
                    }
                    return usr[key] !== undefined ? !!usr[key] : (app[key] !== undefined ? !!app[key] : defaultVal);
                };
                setSettings({
                    allowPriceChange: resolve('sale.allowPriceChange', true),
                    allowDiscountTypeSwitch: resolve('sale.allowDiscountTypeSwitch', true),
                    allowCartProfitView: resolve('sale.allowCartProfitView', user.role === 'ADMIN' || user.role === 'MANAGER'),
                });
            })
            .catch(() => { /* keep defaults (permissive for admin/manager) */ })
            .finally(() => setLoading(false));
    }, [user]);

    return { ...settings, loading };
}
