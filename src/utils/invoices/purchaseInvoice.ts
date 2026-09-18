/**
 * Purchase Invoice Generator for Thermal Printer
 * via the direct Tauri / Rust Skia + HarfBuzz + Urdu + 203 DPI engine.
 */
import type { Purchase, Supplier } from '../../types/pos';
import {
    loadThermalConfig,
    printThermalInvoice,
    type ThermalInvoiceData,
} from '../thermalPrinter';
import { fetchLogoBase64 } from './saleInvoice';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

export interface PurchaseInvoiceData {
    purchase: Purchase;
    items: { name: string; qty: number; unitCost: number; discount: number; total: number }[];
    supplier?: Supplier | null;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    expenses: number;
    grandTotal: number;
    paidAmount: number;
}

export async function printPurchaseInvoice(data: PurchaseInvoiceData): Promise<boolean> {
    const config = loadThermalConfig();
    let dbCompany: Record<string, any> = {};
    try {
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch (e) {
        console.warn('[PurchaseInvoice] Failed to fetch company settings', e);
    }

    const dateStr = data.purchase.date || data.purchase.createdAt
        ? new Date(data.purchase.date || data.purchase.createdAt).toLocaleString('en-PK', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        })
        : new Date().toLocaleString('en-PK');

    const invoice: ThermalInvoiceData = {
        business_name: dbCompany.businessName || config.businessName || 'Aazify POS',
        business_address: dbCompany.address || config.businessAddress || undefined,
        business_phone: dbCompany.phone || config.businessPhone || undefined,
        business_ntn: dbCompany.ntn || config.businessNTN || undefined,
        business_strn: dbCompany.strn || undefined,
        title: 'PURCHASE INVOICE',
        invoice_no: data.purchase.invoiceNo ?? `#${data.purchase.id}`,
        date_time: dateStr,
        cashier: undefined,
        customer_name: data.supplier ? `Supplier: ${data.supplier.name}` : undefined,
        customer_phone: data.supplier?.phone || undefined,
        items: data.items.map(i => ({
            name: i.name,
            qty: i.qty,
            price: i.unitCost,
            discount: i.discount,
            total: i.total,
        })),
        payments: (data.purchase.payments && data.purchase.payments.length > 0)
            ? data.purchase.payments.filter(p => p.amount > 0).map(p => ({
                name: p.account?.name || (p as any).method || 'Cash',
                amount: p.amount,
            }))
            : undefined,
        subtotal: data.subtotal,
        discount_amount: data.discountAmount,
        tax_amount: data.taxAmount,
        grand_total: data.grandTotal,
        paid_amount: data.paidAmount,
        change_amount: 0,
        notes: data.purchase.note || undefined,
        logo_base64: await fetchLogoBase64(),
    };

    return printThermalInvoice(invoice);
}
