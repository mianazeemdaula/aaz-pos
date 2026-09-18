/**
 * Sale Invoice Generator for Thermal Printer
 *
 * Direct Tauri / Rust Pipeline:
 * Tauri / Rust -> Skia -> HarfBuzz text shaping -> Urdu font -> 203 DPI raster -> 1-bit conversion -> ESC/POS
 */
import type { Sale, Customer } from '../../types/pos';
import {
    loadThermalConfig,
    printThermalInvoice,
    previewThermalInvoice,
    type ThermalInvoiceData,
} from '../thermalPrinter';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { formatInvoiceNumber } from './invoiceNumber';
import { FBR_LOGO_BASE64 } from './fbrLogo';

export interface SaleInvoiceData {
    sale: Sale;
    items: { name: string; qty: number; price: number; discount: number; total: number }[];
    customer?: Customer | null;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    paidAmount: number;
    changeAmount: number;
    payments?: { name: string; amount: number }[];
    cashier?: string;
    isDuplicate?: boolean;
    fbrInvoiceId?: string | null;
    fbrQrUrl?: string | null;
}

// Cache logo base64 in memory
let _cachedLogoBase64: string | null | undefined = undefined;

export async function fetchLogoBase64(): Promise<string | undefined> {
    if (_cachedLogoBase64 !== undefined) return _cachedLogoBase64 ?? undefined;
    try {
        const res = await apiClient.get<{ base64: string }>(API_ENDPOINTS.settings.logo);
        _cachedLogoBase64 = res.base64 ?? null;
    } catch {
        _cachedLogoBase64 = null;
    }
    return _cachedLogoBase64 ?? undefined;
}

export function invalidateLogoCache(): void {
    _cachedLogoBase64 = undefined;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

async function resolveCustomerBalances(data: SaleInvoiceData): Promise<SaleInvoiceData> {
    const c = data.customer;
    if (!c) return data;
    if (c.previousBalance !== undefined && c.newBalance !== undefined) return data;

    const dueOnThisBill = round2(data.grandTotal - data.paidAmount);

    let newBalance = c.newBalance;
    if (newBalance === undefined) {
        try {
            const fresh = await apiClient.get<Customer>(API_ENDPOINTS.customers.detail(c.id));
            newBalance = fresh.balance;
        } catch (e) {
            console.warn('[SaleInvoice] Could not fetch customer balance, using snapshot', e);
            newBalance = round2((c.balance ?? 0) + dueOnThisBill);
        }
    }

    const previousBalance = c.previousBalance ?? round2(newBalance - dueOnThisBill);

    return { ...data, customer: { ...c, previousBalance, newBalance } };
}

/**
 * Builds the unified ThermalInvoiceData structure for the Rust engine
 */
export async function buildSaleThermalInvoice(input: SaleInvoiceData): Promise<ThermalInvoiceData> {
    const data = await resolveCustomerBalances(input);
    const config = loadThermalConfig();

    let dbCompany: Record<string, any> = {};
    try {
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch (e) {
        console.warn('[SaleInvoice] Failed to fetch company settings from DB', e);
    }

    const logoBase64 = await fetchLogoBase64();
    const fbrId = data.fbrInvoiceId || data.sale.taxInvoiceId;
    const dateStr = data.sale.createdAt
        ? new Date(data.sale.createdAt).toLocaleString('en-PK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })
        : new Date().toLocaleString('en-PK');

    return {
        business_name: dbCompany.businessName || config.businessName || 'Aazify POS',
        business_address: dbCompany.address || config.businessAddress || undefined,
        business_phone: dbCompany.phone || config.businessPhone || undefined,
        business_ntn: dbCompany.ntn || config.businessNTN || undefined,
        business_strn: dbCompany.strn || undefined,
        title: data.sale.totalAmount < 0 ? 'SALE RETURN' : 'SALE INVOICE',
        invoice_no: formatInvoiceNumber(data.sale),
        date_time: dateStr,
        cashier: data.cashier || (data.sale as any).cashierName || (data.sale as any).user?.name || undefined,
        customer_name: data.customer?.name || undefined,
        customer_phone: data.customer?.phone || undefined,
        customer_previous_balance: data.customer?.previousBalance,
        customer_new_balance: data.customer?.newBalance,
        is_duplicate: !!data.isDuplicate,
        items: data.items.map(item => ({
            name: item.name,
            qty: item.qty,
            price: item.price,
            discount: item.discount,
            total: item.total,
        })),
        payments: (() => {
            if (data.payments && data.payments.length > 0) {
                return data.payments.filter(p => p.amount > 0);
            }
            if (data.sale.payments && data.sale.payments.length > 0) {
                return data.sale.payments
                    .filter(p => p.amount > 0)
                    .map(p => ({
                        name: p.account?.name || p.method || 'Cash',
                        amount: p.amount,
                    }));
            }
            return undefined;
        })(),
        subtotal: data.subtotal,
        discount_amount: data.discountAmount,
        tax_amount: data.taxAmount,
        grand_total: data.grandTotal,
        paid_amount: data.paidAmount,
        change_amount: data.changeAmount,
        fbr_invoice_id: fbrId ? fbrId.toString() : undefined,
        qr_data: fbrId ? fbrId.toString() : (data.fbrQrUrl || undefined),
        fbr_logo_base64: fbrId ? FBR_LOGO_BASE64 : undefined,
        notes: dbCompany.invoiceNote || undefined,
        logo_base64: logoBase64,
    };
}

/**
 * Print sale invoice via the Tauri / Rust 203 DPI Skia + HarfBuzz engine
 */
export async function printSaleInvoice(input: SaleInvoiceData): Promise<boolean> {
    const thermalInvoice = await buildSaleThermalInvoice(input);
    return printThermalInvoice(thermalInvoice);
}

/**
 * Renders the invoice to PNG base64 via the Rust Skia engine
 */
export async function renderSaleInvoicePng(input: SaleInvoiceData): Promise<{ base64: string; widthPx: number }> {
    const thermalInvoice = await buildSaleThermalInvoice(input);
    const config = loadThermalConfig();
    const widthPx = config.paperSize === 'Mm58' ? 384 : 576;
    const base64 = await previewThermalInvoice(thermalInvoice, config);
    return { base64, widthPx };
}
