/**
 * Salary Slip Invoice Generator for Thermal Printer
 */
import type { SalarySlip, Employee } from '../../types/pos';
import {
    textLeft, textCenter, line, feed, table, cell,
    bigCenter, nativeWidth,
    buildPrintJob, printDocument,
    type PrintSection, type PrintJobRequest, nativeDefaultWidth,
} from '../thermalPrinter';
import { loadThermalConfig } from '../thermalPrinter';
import { loadReceiptBusiness, businessHeaderSections } from './businessProfile';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export interface SalaryInvoiceData {
    slip: SalarySlip;
    employee?: Employee | null;
}

export async function buildSalaryInvoiceSections(data: SalaryInvoiceData): Promise<PrintSection[]> {
    const config = loadThermalConfig();
    const { slip } = data;
    const empName = data.employee?.user?.name ?? data.employee?.name ?? `Employee #${slip.employeeId}`;
    const sections: PrintSection[] = [];

    // Header — identity comes from the Business Profile in Settings.
    const biz = await loadReceiptBusiness(config);
    sections.push(...businessHeaderSections(biz, nativeWidth(config)));
    sections.push(line('-'));

    // Title
    sections.push(textCenter('SALARY SLIP', true));
    sections.push(textLeft(`Employee: ${empName}`));
    if (data.employee?.designation) sections.push(textLeft(`Designation: ${data.employee.designation}`));
    sections.push(textLeft(`Period: ${MONTHS[slip.month]} ${slip.year}`));
    sections.push(textLeft(`Status: ${slip.status}`));
    if (slip.paidDate) sections.push(textLeft(`Paid Date: ${new Date(slip.paidDate).toLocaleDateString('en-PK')}`));
    sections.push(line('-'));

    // Earnings & Deductions
    const is80mm = config.paperSize === 'Mm80';
    const defaultWidth = nativeDefaultWidth(config);
    const width = config.nativeColumns || defaultWidth;
    const ratio = width / defaultWidth;

    let colWidths = is80mm ? [32, 16] : [20, 12];
    if (config.nativeColumns) {
        colWidths = colWidths.map(w => Math.max(1, Math.floor(w * ratio)));
        const sum = colWidths.reduce((a, b) => a + b, 0);
        const diff = width - sum;
        if (diff !== 0) {
            colWidths[0] += diff; // Adjust label column
        }
    }

    const earningsBody = [
        [cell('Base Salary:'), cell(fmt(slip.baseSalary), 'right')],
    ];
    if (slip.bonus > 0) {
        earningsBody.push([cell('Bonus:'), cell(fmt(slip.bonus), 'right')]);
    }
    sections.push(textLeft('EARNINGS', true));
    sections.push(table(2, earningsBody, colWidths));
    sections.push(line('-'));

    const deductionsBody: { text: string; styles?: any }[][] = [];
    if (slip.totalAdvances > 0) {
        deductionsBody.push([cell('Advances:'), cell(fmt(slip.totalAdvances), 'right')]);
    }
    if (slip.otherDeductions > 0) {
        deductionsBody.push([cell('Other Deductions:'), cell(fmt(slip.otherDeductions), 'right')]);
    }
    if (deductionsBody.length > 0) {
        sections.push(textLeft('DEDUCTIONS', true));
        sections.push(table(2, deductionsBody, colWidths));
        sections.push(line('-'));
    }

    // Net Payable
    sections.push(line('-'));
    sections.push(bigCenter(`NET PAYABLE: ${fmt(slip.netPayable)}`, nativeWidth(config)));
    sections.push(line('-'));

    if (slip.note) {
        sections.push(textLeft(`Note: ${slip.note}`));
    }
    if (slip.account) {
        sections.push(textLeft(`Account: ${slip.account.name}`));
    }

    // Footer
    sections.push(line('-'));
    sections.push(textCenter('Salary Slip'));
    sections.push(feed(3));

    return sections;
}

export async function buildSalaryInvoiceJob(data: SalaryInvoiceData): Promise<PrintJobRequest> {
    return buildPrintJob(await buildSalaryInvoiceSections(data));
}

export async function printSalaryInvoice(data: SalaryInvoiceData): Promise<boolean> {
    const job = await buildSalaryInvoiceJob(data);
    return printDocument(job);
}
