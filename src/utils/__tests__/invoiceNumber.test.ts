import { describe, it, expect } from 'vitest';
import { formatInvoiceNumber, invoiceNumberSlug } from '../invoices/invoiceNumber';

describe('formatInvoiceNumber', () => {
    it('formats from a sale object with id and createdAt', () => {
        const sale = {
            id: 42,
            createdAt: '2026-08-15T10:30:00.000Z',
        };
        const num = formatInvoiceNumber(sale);
        expect(num).toMatch(/^INV-\d{8}-0042$/);
        expect(num).not.toContain('NaN');
    });

    it('formats when id is passed directly as a number', () => {
        const num = formatInvoiceNumber(15);
        expect(num).toMatch(/^INV-\d{8}-0015$/);
        expect(num).not.toContain('NaN');
    });

    it('formats when id is passed as a numeric string', () => {
        const num = formatInvoiceNumber('7');
        expect(num).toMatch(/^INV-\d{8}-0007$/);
        expect(num).not.toContain('NaN');
    });

    it('preserves an explicit valid invoiceNumber', () => {
        const sale = {
            id: 1,
            invoiceNumber: 'INV-CUSTOM-999',
        };
        expect(formatInvoiceNumber(sale)).toBe('INV-CUSTOM-999');
    });

    it('ignores corrupted invoiceNumber that ends with NaN and formats safely', () => {
        const sale = {
            id: 25,
            invoiceNumber: 'INV-20260918-0NaN',
        };
        const result = formatInvoiceNumber(sale);
        expect(result).not.toContain('NaN');
        expect(result).toMatch(/^INV-\d{8}-0025$/);
    });

    it('handles undefined or null source safely without NaN', () => {
        expect(formatInvoiceNumber(null as any)).not.toContain('NaN');
        expect(formatInvoiceNumber(undefined as any)).not.toContain('NaN');
        expect(formatInvoiceNumber({} as any)).not.toContain('NaN');
    });

    it('generates a clean slug with invoiceNumberSlug', () => {
        const sale = { id: 5, createdAt: '2026-01-02' };
        const slug = invoiceNumberSlug(sale);
        expect(slug).toMatch(/^INV-\d{8}-0005$/);
        expect(slug).not.toContain('NaN');
    });
});
