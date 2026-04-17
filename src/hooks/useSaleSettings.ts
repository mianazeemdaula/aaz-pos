import { useState, useEffect } from 'react';
import { useAuth } from '../contexts';
import { settingsService } from '../services/pos.service';

export function useSaleSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({ allowPriceChange: true, allowDiscountTypeSwitch: true });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        Promise.all([settingsService.getApp(), settingsService.getUserSettings(user.id)])
            .then(([app, usr]) => {
                const resolve = (key: string) => {
                    // Admin: always allowed unless global setting explicitly disabled AND no user override
                    if (user.role === 'ADMIN') {
                        const userVal = usr[key];
                        if (userVal !== undefined) return !!userVal;
                        // Admin defaults to true even when global is off, unless global explicitly set to false
                        return app[key] !== false;
                    }
                    return usr[key] !== undefined ? !!usr[key] : app[key] !== false;
                };
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
