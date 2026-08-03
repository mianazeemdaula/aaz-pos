import type { ElementType } from 'react';
import {
    BarChart2, ShoppingCart, Package, Users, DollarSign, TrendingDown,
    BookOpen, Wallet, AlertTriangle, Sun, Briefcase, Scale,
} from 'lucide-react';

/**
 * The report catalogue.
 *
 * Shared by the Reports page and the top navigation so a report is defined once
 * and appears in both — adding one here puts it in the menu automatically.
 */

export type ReportId =
    | 'overall-business' | 'payables-receivables' | 'daily'
    | 'sales' | 'detailed-sales' | 'cashier-sales'
    | 'purchases' | 'detailed-purchases' | 'purchase-recommendation'
    | 'inventory' | 'cost-above-sale-price' | 'stock-alert' | 'stock-negative' | 'stock-low'
    | 'customers' | 'suppliers' | 'customer-ledger' | 'supplier-ledger'
    | 'expenses' | 'account-statement';

export type ReportParam =
    | 'dates' | 'customer' | 'supplier' | 'account' | 'date'
    | 'stockFilter' | 'user' | 'category' | 'brand';

export interface ReportDef {
    id: ReportId;
    label: string;
    /** Shorter label for the navigation menu, where the group already gives context. */
    navLabel?: string;
    description: string;
    icon: ElementType;
    color: string;
    params: ReportParam[];
    endpoint: string | ((id: number) => string);
    extraParams?: Record<string, string>;
}

export interface ReportGroup {
    heading: string;
    reports: ReportDef[];
}

/** Tint used on the report cards and the detail header. */
const tint = {
    accent: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-100 dark:border-primary-800',
    positive: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800',
    caution: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800',
    critical: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800',
    neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

export const REPORT_GROUPS: ReportGroup[] = [
    {
        heading: 'Business',
        reports: [
            { id: 'overall-business', label: 'Overall Business Summary', navLabel: 'Business Summary', description: 'Executive summary: P&L, receivables, payables, cash/bank & net assets', icon: Briefcase, color: tint.accent, params: ['dates'], endpoint: '/reports/overall-business' },
            { id: 'daily', label: 'Daily Report', description: 'Comprehensive daily P&L: sales, purchases, expenses, salaries, payments', icon: Sun, color: tint.caution, params: ['date'], endpoint: '/reports/daily' },
            { id: 'payables-receivables', label: 'Payables & Receivables', description: 'Combined overview of all customer receivables & supplier payables', icon: Scale, color: tint.positive, params: [], endpoint: '/reports/payables-receivables' },
        ],
    },
    {
        heading: 'Sales',
        reports: [
            { id: 'sales', label: 'Sales Report', description: 'Revenue, COGS, gross profit & all invoices', icon: ShoppingCart, color: tint.accent, params: ['dates', 'user'], endpoint: '/reports/sales' },
            { id: 'detailed-sales', label: 'Customer Sales Report', navLabel: 'Customer Sales', description: 'Detailed sales transactions showing item details', icon: ShoppingCart, color: tint.positive, params: ['dates', 'customer'], endpoint: '/reports/detailed-sales' },
            { id: 'cashier-sales', label: 'Cashier Sales Summary', navLabel: 'Cashier Sales', description: 'Sales totals, payment accounts breakdown & credit sales details per cashier', icon: Users, color: tint.accent, params: ['dates', 'user'], endpoint: '/reports/cashier-sales' },
        ],
    },
    {
        heading: 'Purchases',
        reports: [
            { id: 'purchases', label: 'Purchases Report', description: 'Purchase orders, total costs & due amounts', icon: Package, color: tint.neutral, params: ['dates'], endpoint: '/reports/purchases' },
            { id: 'detailed-purchases', label: 'Supplier Purchases Report', navLabel: 'Supplier Purchases', description: 'Detailed purchase orders showing item details', icon: Package, color: tint.accent, params: ['dates', 'supplier'], endpoint: '/reports/detailed-purchases' },
            { id: 'purchase-recommendation', label: 'PO Recommendation', description: 'Recommended quantities and suppliers based on sales velocity & low stock', icon: Package, color: tint.caution, params: ['dates', 'category', 'brand'], endpoint: '/reports/purchase-order-recommendation' },
        ],
    },
    {
        heading: 'Inventory',
        reports: [
            { id: 'inventory', label: 'Inventory Report', description: 'Stock levels, inventory value & reorder alerts', icon: BarChart2, color: tint.positive, params: ['category', 'brand'], endpoint: '/reports/inventory' },
            { id: 'cost-above-sale-price', label: 'Cost Above Sale Price', navLabel: 'Cost > Sale Price', description: 'Products & variants where cost price exceeds selling price (loss-making items)', icon: AlertTriangle, color: tint.critical, params: ['category', 'brand'], endpoint: '/reports/cost-above-sale-price' },
            { id: 'stock-alert', label: 'Stock Alert Report', navLabel: 'Stock Alerts', description: 'All products with negative or low stock levels', icon: AlertTriangle, color: tint.critical, params: ['stockFilter', 'category', 'brand'], endpoint: '/reports/stock', extraParams: { filter: 'alert' } },
            { id: 'stock-low', label: 'Low Stock Report', navLabel: 'Low Stock', description: 'Products at or below their reorder level', icon: AlertTriangle, color: tint.caution, params: ['stockFilter', 'category', 'brand'], endpoint: '/reports/stock', extraParams: { filter: 'low' } },
            { id: 'stock-negative', label: 'Negative Stock', description: 'Products with stock below zero (data integrity issue)', icon: AlertTriangle, color: tint.critical, params: ['stockFilter', 'category', 'brand'], endpoint: '/reports/stock', extraParams: { filter: 'negative' } },
        ],
    },
    {
        heading: 'Parties',
        reports: [
            { id: 'customers', label: 'Customer Balances', description: 'Outstanding receivables per customer', icon: Users, color: tint.accent, params: [], endpoint: '/reports/customer-balances' },
            { id: 'suppliers', label: 'Supplier Balances', description: 'Outstanding payables per supplier', icon: TrendingDown, color: tint.caution, params: [], endpoint: '/reports/supplier-balances' },
            { id: 'customer-ledger', label: 'Customer Ledger', description: 'Full transaction ledger for a customer', icon: BookOpen, color: tint.accent, params: ['customer', 'dates'], endpoint: (id: number) => `/reports/customer-ledger/${id}` },
            { id: 'supplier-ledger', label: 'Supplier Ledger', description: 'Full transaction ledger for a supplier', icon: BookOpen, color: tint.neutral, params: ['supplier', 'dates'], endpoint: (id: number) => `/reports/supplier-ledger/${id}` },
        ],
    },
    {
        heading: 'Finance',
        reports: [
            { id: 'expenses', label: 'Expenses Report', description: 'All expenses by category & account', icon: DollarSign, color: tint.critical, params: ['dates'], endpoint: '/reports/expenses' },
            { id: 'account-statement', label: 'Account Statement', description: 'Transaction statement for an account', icon: Wallet, color: tint.caution, params: ['account', 'dates'], endpoint: (id: number) => `/reports/account-statement/${id}` },
        ],
    },
];

/** Flat catalogue, in menu order. */
export const REPORTS: ReportDef[] = REPORT_GROUPS.flatMap(group => group.reports);

export const findReport = (id: string | undefined): ReportDef | null =>
    REPORTS.find(report => report.id === id) ?? null;

export const reportPath = (id: ReportId) => `/reports/${id}`;
