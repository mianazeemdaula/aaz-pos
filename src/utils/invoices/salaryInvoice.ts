/**
 * Salary Slip Invoice Generator for Thermal Printer
 */
import type { SalarySlip, Employee } from '../../types/pos';
import {
    title, textLeft, textCenter, line, feed, table, cell,
    buildPrintJob, printDocument,
    type PrintSection, type PrintJobRequest,
} from '../thermalPrinter';
import { loadThermalConfig } from '../thermalPrinter';

const fmt = (n: number) => `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export interface SalaryInvoiceData {
    slip: SalarySlip;
    employee?: Employee | null;
}

export function buildSalaryInvoiceSections(data: SalaryInvoiceData): PrintSection[] {
    const config = loadThermalConfig();
    const { slip } = data;
    const empName = data.employee?.user?.name ?? data.employee?.name ?? `Employee #${slip.employeeId}`;
    const sections: PrintSection[] = [];

    // Header
    sections.push(title(config.businessName));
    if (config.businessAddress) sections.push(textCenter(config.businessAddress));
    sections.push(line('='));

    // Title
    sections.push(textCenter('SALARY SLIP', true));
    sections.push(textLeft(`Employee: ${empName}`));
    if (data.employee?.designation) sections.push(textLeft(`Designation: ${data.employee.designation}`));
    sections.push(textLeft(`Period: ${MONTHS[slip.month]} ${slip.year}`));
    sections.push(textLeft(`Status: ${slip.status}`));
    if (slip.paidDate) sections.push(textLeft(`Paid Date: ${new Date(slip.paidDate).toLocaleDateString('en-PK')}`));
    sections.push(line('='));

    // Earnings & Deductions
    const is80mm = config.paperSize === 'Mm80';
    const colWidths = is80mm ? [32, 16] : [20, 12];

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
    sections.push(line('='));
    sections.push(textCenter(`NET PAYABLE: ${fmt(slip.netPayable)}`, true));
    sections.push(line('='));

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

export function buildSalaryInvoiceJob(data: SalaryInvoiceData): PrintJobRequest {
    return buildPrintJob(buildSalaryInvoiceSections(data));
}

export async function printSalaryInvoice(data: SalaryInvoiceData): Promise<boolean> {
    const job = buildSalaryInvoiceJob(data);
    return printDocument(job);
}
