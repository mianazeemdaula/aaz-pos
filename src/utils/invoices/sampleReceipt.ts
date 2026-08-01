/**
 * sampleReceipt.ts
 *
 * Renders a representative sale invoice and payment receipt from canned data so
 * printer settings (paper width, image width, business header) can be checked
 * on screen without recording a real sale.
 *
 * Unlike the live print path, these take the thermal config explicitly, so the
 * Settings screen can preview values the user has not saved yet.
 */

import type { ThermalPrinterConfig } from '../thermalPrinter';
import type { SaleInvoiceData } from './saleInvoice';
import { buildInvoiceHtml, type HtmlInvoiceConfig } from './invoiceHtmlBuilder';
import { buildPaymentSlipHtml, type PaymentSlipData } from './paymentSlipHtmlBuilder';
import { renderHtmlToBase64Png } from './htmlInvoiceRenderer';
import { showReceiptPreview } from './receiptExport';
import { fetchLogoBase64 } from './saleInvoice';

const PAPER_WIDTH_PX: Record<string, number> = {
    Mm80: 576,
    Mm58: 384,
};

function widthFor(config: ThermalPrinterConfig): number {
    return config.imageWidth || PAPER_WIDTH_PX[config.paperSize] || 576;
}

async function headerFrom(
    config: ThermalPrinterConfig,
    company?: Record<string, any>,
): Promise<Pick<HtmlInvoiceConfig, 'businessName' | 'businessAddress' | 'businessPhone' | 'businessNTN' | 'logoBase64'>> {
    return {
        businessName: company?.businessName || config.businessName,
        businessAddress: company?.address || config.businessAddress,
        businessPhone: company?.phone || config.businessPhone,
        businessNTN: company?.ntn || config.businessNTN,
        logoBase64: await fetchLogoBase64(),
    };
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleAccount = (id: number, name: string, code: string) => ({
    id, name, code, type: 'ASSET' as const, active: true, balance: 0,
});

function sampleSaleData(): SaleInvoiceData {
    const now = new Date().toISOString();
    return {
        sale: {
            id: 1042,
            invoiceNumber: 'SAMPLE-1042',
            createdAt: now,
            totalAmount: 18450,
            paidAmount: 10000,
            changeAmount: 0,
            discount: 350,
            taxAmount: 1200,
            user: { id: 1, username: 'demo', name: 'Demo Cashier', role: 'CASHIER' },
            payments: [
                { id: 1, amount: 8000, accountId: 1, account: sampleAccount(1, 'Cash', 'CASH') },
                { id: 2, amount: 2000, accountId: 2, account: sampleAccount(2, 'Bank Transfer', 'BANK') },
            ],
        } as SaleInvoiceData['sale'],
        items: [
            { name: 'Fresh Milk Pack 1 Litre', qty: 3, price: 320, discount: 0, total: 960 },
            { name: 'Basmati Rice Super Kernel 5kg', qty: 2, price: 4250, discount: 250, total: 8250 },
            { name: 'Sunflower Cooking Oil 5L Tin', qty: 1, price: 3990, discount: 100, total: 3890 },
            { name: 'Eggs Farm Fresh - Dozen', qty: 4, price: 340, discount: 0, total: 1360 },
            { name: 'Tea Leaves Danedar 950g', qty: 1, price: 1990, discount: 0, total: 1990 },
        ],
        customer: {
            id: 7,
            name: 'Sample Customer',
            phone: '0300-1234567',
            balance: 26900,
            previousBalance: 18450,
            newBalance: 26900,
            creditLimit: 50000,
            active: true,
        },
        subtotal: 18500,
        discountAmount: 350,
        taxAmount: 1200,
        grandTotal: 18450,
        paidAmount: 10000,
        changeAmount: 0,
    };
}

function samplePaymentSlip(): PaymentSlipData {
    return {
        docTitle: 'PAYMENT RECEIPT',
        docNoLabel: 'Receipt #',
        docNo: '318',
        date: new Date().toISOString(),
        partyLabel: 'Customer',
        partyName: 'Sample Customer',
        partyPhone: '0300-1234567',
        amountLabel: 'Amount Received',
        amount: 12500,
        accountName: 'Cash',
        paymentType: 'RECEIVED',
        note: 'Sample receipt — no payment was recorded.',
        previousBalance: 26900,
        newBalance: 14400,
        signLeft: 'Received By',
        signRight: 'Customer Signature',
        footerLine: 'Thank you for your payment!',
    };
}

// ─── Previews ─────────────────────────────────────────────────────────────────

export async function previewSampleSaleInvoice(
    config: ThermalPrinterConfig,
    company?: Record<string, any>,
): Promise<void> {
    const widthPx = widthFor(config);
    const html = buildInvoiceHtml(sampleSaleData(), {
        ...(await headerFrom(config, company)),
        printWidthPx: widthPx,
        invoiceNote: company?.invoiceNote,
    });
    const base64 = await renderHtmlToBase64Png(html, { widthPx });
    await showReceiptPreview(base64, {
        title: `Sample Sale Invoice — ${config.paperSize === 'Mm58' ? '58mm' : '80mm'}`,
        fileLabel: 'sample-sale-invoice',
        widthPx,
    });
}

export async function previewSamplePaymentSlip(
    config: ThermalPrinterConfig,
    company?: Record<string, any>,
): Promise<void> {
    const widthPx = widthFor(config);
    const html = buildPaymentSlipHtml(samplePaymentSlip(), {
        ...(await headerFrom(config, company)),
        printWidthPx: widthPx,
    });
    const base64 = await renderHtmlToBase64Png(html, { widthPx });
    await showReceiptPreview(base64, {
        title: `Sample Payment Receipt — ${config.paperSize === 'Mm58' ? '58mm' : '80mm'}`,
        fileLabel: 'sample-payment-receipt',
        widthPx,
    });
}
