/**
 * FBR (Federal Board of Revenue) Fiscal Service
 * Handles FBR invoice generation and service health checks
 */

import { FBR_CONFIG } from '../config/api';
import type { FBRHealthResponse, FBRInvoiceRequest, FBRInvoiceResponse } from '../types/fbr';

const LS_FBR_KEY = 'pos_fbr_settings';

function getLocalFbrSettings(): { url: string; enabled: boolean } | null {
    try {
        const raw = localStorage.getItem(LS_FBR_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
}

function getEffectiveBaseURL(): string {
    const local = getLocalFbrSettings();
    return local?.url || FBR_CONFIG.baseURL;
}

function getEffectiveEnabled(): boolean {
    const local = getLocalFbrSettings();
    if (local !== null) return local.enabled;
    return FBR_CONFIG.enabled;
}

export const fbrService = {
    /**
     * Check FBR service availability (Ping)
     */
    async checkHealth(): Promise<FBRHealthResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FBR_CONFIG.timeout);

        try {
            const response = await fetch(`${getEffectiveBaseURL()}/get`, {
                signal: controller.signal,
                headers: { 'Accept': 'application/xml, text/xml, */*' },
            });

            clearTimeout(timeoutId);

            const text = await response.text();
            const isAvailable = text.includes('Service is responding');
            return {
                isAvailable,
                message: isAvailable ? 'Service is responding' : 'Service not responding'
            };
        } catch (error: any) {
            clearTimeout(timeoutId);
            return {
                isAvailable: false,
                message: error?.name === 'AbortError' ? 'FBR request timeout' : (error?.message || 'Service not available')
            };
        }
    },

    /**
     * Generate FBR fiscal invoice
     * @param request - FBR invoice request payload
     */
    async generateInvoice(request: FBRInvoiceRequest): Promise<FBRInvoiceResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FBR_CONFIG.timeout);

        try {
            const response = await fetch(`${getEffectiveBaseURL()}/GetInvoiceNumberByModel`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(request),
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`FBR API error: ${response.status} ${response.statusText}`);
            }

            const data: FBRInvoiceResponse = await response.json();

            if (data.Code !== '100') {
                const errorDetails = Array.isArray(data.Errors)
                    ? data.Errors.join(', ')
                    : (typeof data.Errors === 'string' ? data.Errors : JSON.stringify(data.Errors ?? data.Response));
                throw new Error(`FBR invoice generation failed: ${errorDetails}`);
            }

            return data;
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error?.name === 'AbortError') {
                throw new Error('FBR request timeout');
            }
            throw error;
        }
    },

    /**
     * Check if FBR integration is enabled
     */
    isEnabled(): boolean {
        return getEffectiveEnabled();
    },

    /**
     * Get FBR configuration values
     */
    getConfig() {
        return {
            posId: FBR_CONFIG.posId,
            baseURL: getEffectiveBaseURL(),
            enabled: getEffectiveEnabled(),
        };
    },

    /**
     * Calculate tax amount for a given base amount and tax rate
     * @param amount - Base amount (excluding tax)
     * @param taxRate - Tax rate as a percentage (e.g. 17 for 17%)
     */
    calculateTax(amount: number, taxRate: number): number {
        return parseFloat(((amount * taxRate) / 100).toFixed(2));
    },

    /**
     * Calculate total amount including tax
     * @param amount - Base amount (excluding tax)
     * @param taxRate - Tax rate as a percentage
     */
    calculateTotalWithTax(amount: number, taxRate: number): number {
        return parseFloat((amount + this.calculateTax(amount, taxRate)).toFixed(2));
    },

    /**
     * Format a Date object into FBR-expected "YYYY-MM-DD HH:mm:ss" string
     * @param date - Date to format
     */
    formatDateTime(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },
};
