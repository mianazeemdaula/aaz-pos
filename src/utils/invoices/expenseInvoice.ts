/**
 * Expense Invoice Generator for Thermal Printer
 * via the direct Tauri / Rust Skia + HarfBuzz + Urdu + 203 DPI engine.
 */
import type { Expense } from '../../types/pos';
import {
    loadThermalConfig,
    printThermalInvoice,
    type ThermalInvoiceData,
} from '../thermalPrinter';
import { fetchLogoBase64 } from './saleInvoice';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

export interface ExpenseInvoiceData {
    expense: Expense;
}

export async function printExpenseInvoice(data: ExpenseInvoiceData): Promise<boolean> {
    const config = loadThermalConfig();
    const { expense } = data;

    let dbCompany: Record<string, any> = {};
    try {
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch (e) {
        console.warn('[ExpenseInvoice] Failed to fetch company settings', e);
    }

    const dateStr = expense.date
        ? new Date(expense.date).toLocaleDateString('en-PK')
        : new Date().toLocaleDateString('en-PK');

    const desc = [
        expense.description,
        expense.category ? `Category: ${expense.category}` : '',
        expense.user ? `By: ${expense.user.name}` : '',
    ].filter(Boolean).join(' | ');

    const invoice: ThermalInvoiceData = {
        business_name: dbCompany.businessName || config.businessName || 'Aazify POS',
        business_address: dbCompany.address || config.businessAddress || undefined,
        business_phone: dbCompany.phone || config.businessPhone || undefined,
        business_ntn: dbCompany.ntn || config.businessNTN || undefined,
        business_strn: dbCompany.strn || undefined,
        title: 'EXPENSE VOUCHER',
        invoice_no: `EXP-${expense.id}`,
        date_time: dateStr,
        cashier: expense.user?.name || undefined,
        items: [
            {
                name: desc || 'Expense (اخراجات)',
                qty: 1,
                price: expense.amount,
                discount: 0,
                total: expense.amount,
            }
        ],
        subtotal: expense.amount,
        grand_total: expense.amount,
        paid_amount: expense.amount,
        change_amount: 0,
        notes: expense.note || undefined,
        logo_base64: await fetchLogoBase64(),
    };

    return printThermalInvoice(invoice);
}
