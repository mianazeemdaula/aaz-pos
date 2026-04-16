import { useState, useEffect } from 'react';
import { useAuth } from '../contexts';
import { settingsService } from '../services/pos.service';

export function useSaleSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({ allowPriceChange: true, allowDiscountTypeSwitch: true });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // Admin always has full access
        if (user.role === 'ADMIN') {
            setSettings({ allowPriceChange: true, allowDiscountTypeSwitch: true });
            setLoading(false);
            return;
        }

        Promise.all([settingsService.getApp(), settingsService.getUserSettings(user.id)])
            .then(([app, usr]) => {
                const resolve = (key: string) => usr[key] !== undefined ? !!usr[key] : app[key] !== false;
                setSettings({
                    allowPriceChange: resolve('sale.allowPriceChange'),
                    allowDiscountTypeSwitch: resolve('sale.allowDiscountTypeSwitch'),
                });
            })
            .catch(() => { /* keep defaults (permissive) */ })
            .finally(() => setLoading(false));
    }, [user]);

    return { ...settings, loading };
}
