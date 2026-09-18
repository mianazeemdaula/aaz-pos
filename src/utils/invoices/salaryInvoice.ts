/**
 * Salary Slip Invoice Generator for Thermal Printer
 * via the direct Tauri / Rust Skia + HarfBuzz + Urdu + 203 DPI engine.
 */
import type { SalarySlip, Employee } from '../../types/pos';
import {
    loadThermalConfig,
    printThermalInvoice,
    type ThermalInvoiceData,
} from '../thermalPrinter';
import { fetchLogoBase64 } from './saleInvoice';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export interface SalaryInvoiceData {
    slip: SalarySlip;
    employee?: Employee | null;
}

export async function printSalaryInvoice(data: SalaryInvoiceData): Promise<boolean> {
    const config = loadThermalConfig();
    const { slip } = data;
    const empName = data.employee?.user?.name ?? data.employee?.name ?? `Employee #${slip.employeeId}`;

    let dbCompany: Record<string, any> = {};
    try {
        dbCompany = await apiClient.get<Record<string, any>>(API_ENDPOINTS.settings.get);
    } catch (e) {
        console.warn('[SalaryInvoice] Failed to fetch company settings', e);
    }

    const periodStr = `${MONTHS[slip.month] || ''} ${slip.year}`;
    const dateStr = slip.paidDate
        ? new Date(slip.paidDate).toLocaleDateString('en-PK')
        : new Date().toLocaleDateString('en-PK');

    const items = [
        {
            name: `Base Salary (${periodStr})`,
            qty: 1,
            price: slip.baseSalary,
            discount: 0,
            total: slip.baseSalary,
        },
    ];

    if (slip.bonus > 0) {
        items.push({
            name: 'Bonus',
            qty: 1,
            price: slip.bonus,
            discount: 0,
            total: slip.bonus,
        });
    }

    const totalDeductions = (slip.totalAdvances || 0) + (slip.otherDeductions || 0);

    const invoice: ThermalInvoiceData = {
        business_name: dbCompany.businessName || config.businessName || 'Aazify POS',
        business_address: dbCompany.address || config.businessAddress || undefined,
        business_phone: dbCompany.phone || config.businessPhone || undefined,
        business_ntn: dbCompany.ntn || config.businessNTN || undefined,
        business_strn: dbCompany.strn || undefined,
        title: 'SALARY SLIP (تنخواہ رسید)',
        invoice_no: `SAL-${slip.id}`,
        date_time: dateStr,
        customer_name: `Employee: ${empName}`,
        items,
        subtotal: slip.baseSalary + (slip.bonus || 0),
        discount_amount: totalDeductions,
        grand_total: slip.netPayable,
        paid_amount: slip.netPayable,
        change_amount: 0,
        notes: [
            data.employee?.designation ? `Designation: ${data.employee.designation}` : '',
            `Status: ${slip.status}`,
            slip.note ? `Note: ${slip.note}` : '',
        ].filter(Boolean).join(' | '),
        logo_base64: await fetchLogoBase64(),
    };

    return printThermalInvoice(invoice);
}
