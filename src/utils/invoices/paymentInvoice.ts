/**
 * Payment Invoice Generator for Thermal Printer
 * Handles both Customer payments (receipt) and Supplier payments (voucher)
 * via the direct Tauri / Rust Skia + HarfBuzz + Urdu + 203 DPI engine.
 */
import type { Customer, Supplier, CustomerPayment, SupplierPayment } from '../../types/pos';
import {
    loadThermalConfig,
    printThermalInvoice,
    type ThermalInvoiceData,
} from '../thermalPrinter';
import { fetchLogoBase64 } from './saleInvoice';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

export interface CustomerPaymentInvoiceData {
    payment: CustomerPayment;
    customer: Customer;
}

export interface SupplierPaymentInvoiceData {
    payment: SupplierPayment;
    supplier: Supplier;
}

function resolveBalances(
    payment: { amount: number; previousBalance?: number; newBalance?: number },
    currentBalance: number,
): { previousBalance: number; newBalance: number } {
    const newBalance = payment.newBalance ?? currentBalance;
    const previousBalance = payment.previousBalance ?? newBalance + payment.amount;
    return { previousBalance, newBalance };
}

export async function printCustomerPayment(data: CustomerPaymentInvoiceData): Promise<boolean> {
    const config = loadThermalConfig();
    let dbCompany: Record<string, any> = {};
    try {
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch (e) {
        console.warn('[PaymentSlip] Failed to fetch company settings', e);
    }

    const balances = resolveBalances(data.payment, data.customer.balance ?? 0);
    const dateStr = (data.payment as any).paymentDate || (data.payment as any).createdAt
        ? new Date((data.payment as any).paymentDate || (data.payment as any).createdAt).toLocaleString('en-PK', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        })
        : new Date().toLocaleString('en-PK');

    const invoice: ThermalInvoiceData = {
        business_name: dbCompany.businessName || config.businessName || 'Aazify POS',
        business_address: dbCompany.address || config.businessAddress || undefined,
        business_phone: dbCompany.phone || config.businessPhone || undefined,
        business_ntn: dbCompany.ntn || config.businessNTN || undefined,
        business_strn: dbCompany.strn || undefined,
        title: 'CUSTOMER PAYMENT RECEIPT',
        invoice_no: (data.payment as any).paymentNo || `REC-${data.payment.id}`,
        date_time: dateStr,
        cashier: undefined,
        customer_name: data.customer.name,
        customer_phone: data.customer.phone || undefined,
        customer_previous_balance: balances.previousBalance,
        customer_new_balance: balances.newBalance,
        items: [
            {
                name: (data.payment as any).notes || 'Payment Received (وصولی رقم)',
                qty: 1,
                price: data.payment.amount,
                discount: 0,
                total: data.payment.amount,
            }
        ],
        subtotal: data.payment.amount,
        grand_total: data.payment.amount,
        paid_amount: data.payment.amount,
        change_amount: 0,
        notes: (data.payment as any).notes || undefined,
        logo_base64: await fetchLogoBase64(),
    };

    return printThermalInvoice(invoice);
}

export async function printSupplierPayment(data: SupplierPaymentInvoiceData): Promise<boolean> {
    const config = loadThermalConfig();
    let dbCompany: Record<string, any> = {};
    try {
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch (e) {
        console.warn('[PaymentSlip] Failed to fetch company settings', e);
    }

    const balances = resolveBalances(data.payment, data.supplier.balance ?? 0);
    const dateStr = (data.payment as any).paymentDate || (data.payment as any).createdAt
        ? new Date((data.payment as any).paymentDate || (data.payment as any).createdAt).toLocaleString('en-PK', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
        })
        : new Date().toLocaleString('en-PK');

    const invoice: ThermalInvoiceData = {
        business_name: dbCompany.businessName || config.businessName || 'Aazify POS',
        business_address: dbCompany.address || config.businessAddress || undefined,
        business_phone: dbCompany.phone || config.businessPhone || undefined,
        business_ntn: dbCompany.ntn || config.businessNTN || undefined,
        business_strn: dbCompany.strn || undefined,
        title: 'SUPPLIER PAYMENT VOUCHER',
        invoice_no: (data.payment as any).paymentNo || `VOU-${data.payment.id}`,
        date_time: dateStr,
        cashier: undefined,
        customer_name: `Supplier: ${data.supplier.name}`,
        customer_phone: data.supplier.phone || undefined,
        customer_previous_balance: balances.previousBalance,
        customer_new_balance: balances.newBalance,
        items: [
            {
                name: (data.payment as any).notes || 'Payment Made (ادائیگی رقم)',
                qty: 1,
                price: data.payment.amount,
                discount: 0,
                total: data.payment.amount,
            }
        ],
        subtotal: data.payment.amount,
        grand_total: data.payment.amount,
        paid_amount: data.payment.amount,
        change_amount: 0,
        notes: (data.payment as any).notes || undefined,
        logo_base64: await fetchLogoBase64(),
    };

    return printThermalInvoice(invoice);
}
