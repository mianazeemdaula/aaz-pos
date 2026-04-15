// POS System Types  aligned with DB schema

export interface TaxSchedule {
    id: number;
    name: string;
    hscode?: string | null;
    rate: number;
    createdAt?: string;
}

export interface User {
    id: number;
    username: string;
    name: string;
    role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'DELIVERY_BOY' | 'WORKER';
    phone?: string | null;
    address?: string | null;
    status?: boolean;
    createdAt?: string;
    lastLogin?: string | null;
}

export interface Account {
    id: number;
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    active: boolean;
    balance: number;
    createdAt?: string;
}

export interface Customer {
    id: number;
    name: string;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    city?: string | null;
    ntn?: string | null;
    cnic?: string | null;
    creditLimit?: number | null;
    balance: number;
    active: boolean;
    createdAt?: string;
}

export interface Supplier {
    id: number;
    name: string;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    city?: string | null;
    ntn?: string | null;
    cnic?: string | null;
    bankDetails?: string | null;
    paymentTerms?: string | null;
    taxId?: string | null;
    balance: number;
    active: boolean;
    createdAt?: string;
}

export interface Category {
    id: number;
    name: string;
    description?: string | null;
    parentId?: number | null;
    hsnCode?: string | null;
    taxRate?: number | null;
    subcategories?: Category[];
    parent?: Category | null;
    _count?: { products?: number };
    createdAt?: string;
}

export interface Brand {
    id: number;
    name: string;
    description?: string | null;
    active: boolean;
    createdAt?: string;
}

export interface ProductVariant {
    id: number;
    productId: number;
    name: string;
    barcode: string;
    price: number;
    retail?: number | null;
    wholesale?: number | null;
    factor: number;
    isDefault: boolean;
    createdAt?: string;
    product?: Product;
}

export interface Product {
    id: number;
    name: string;
    description?: string | null;
    categoryId: number;
    brandId?: number | null;
    totalStock: number;
    avgCostPrice: number;
    reorderLevel: number;
    allowNegative: boolean;
    imageUrl?: string | null;
    hsCode?: string | null;
    taxSchduleId?: number | null;
    taxMethod?: 'EXCLUSIVE' | 'INCLUSIVE';
    taxRate?: number | null;
    active: boolean;
    isService?: boolean;
    showBarcodePrice?: boolean;
    isFavorite?: boolean;
    saleBelowCost?: boolean;
    createdAt?: string;
    brand?: Brand | null;
    category?: Category;
    variants?: ProductVariant[];
    taxSchdule?: TaxSchedule | null;
}

export interface SaleItem {
    id?: number;
    variantId: number;
    variant?: ProductVariant;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalPrice?: number;
    avgCostPrice?: number;
}

export interface SalePayment {
    id?: number;
    accountId: number;
    account?: Account;
    amount: number;
    changeAmount?: number;
    method?: string;
    note?: string;
}

export interface Sale {
    id: number;
    customerId?: number | null;
    customer?: Customer | null;
    userId?: number | null;
    user?: User | null;
    totalAmount: number;
    paidAmount: number;
    changeAmount: number;
    discount: number;
    taxAmount: number;
    taxInvoiceId?: string | null;
    invoiceNumber?: string | null;
    grandTotal?: number;
    createdAt: string;
    items?: SaleItem[];
    payments?: SalePayment[];
}

export interface PurchaseItem {
    id?: number;
    productId: number;
    product?: Product;
    quantity: number;
    unitCost: number;
    discount: number;
    taxAmount: number;
    totalCost?: number;
}

export interface PurchasePayment {
    id?: number;
    accountId: number;
    account?: Account;
    amount: number;
    note?: string;
}

export interface Purchase {
    id: number;
    invoiceNo?: string | null;
    refNumber?: string | null;
    supplierId?: number | null;
    supplier?: Supplier | null;
    userId?: number | null;
    user?: User | null;
    accountId?: number | null;
    account?: Account;
    totalAmount: number;
    paidAmount: number;
    discount: number;
    taxAmount: number;
    expenses: number;
    grandTotal?: number;
    date: string;
    createdAt: string;
    items?: PurchaseItem[];
    payments?: PurchasePayment[];
}


export interface Employee {
    id: number;
    userId?: number | null;
    user?: User;
    name: string;
    phone?: string | null;
    cnic?: string | null;
    designation?: string | null;
    baseSalary: number;
    advanceLimit: number;
    balance: number;
    joiningDate: string;
    active: boolean;
    createdAt?: string;
}

export interface EmployeeAdvance {
    id: number;
    employeeId: number;
    amount: number;
    accountId: number;
    account?: Account;
    reason?: string | null;
    month: number;
    year: number;
    status: 'PENDING' | 'DEDUCTED' | 'REPAID' | 'WAIVED';
    deductedIn?: number | null;
    date: string;
    createdAt?: string;
}

export interface SalarySlip {
    id: number;
    employeeId: number;
    employee?: Employee;
    year: number;
    month: number;
    baseSalary: number;
    bonus: number;
    totalAdvances: number;
    otherDeductions: number;
    netPayable: number;
    status: 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';
    accountId?: number | null;
    account?: Account | null;
    note?: string | null;
    paidDate?: string | null;
    advances?: EmployeeAdvance[];
    createdAt?: string;
}

export interface Expense {
    id: number;
    description: string;
    amount: number;
    category?: string | null;
    note?: string | null;
    accountId?: number | null;
    account?: Account;
    userId?: number | null;
    user?: User | null;
    date: string;
    createdAt?: string;
}

export interface RecurringExpense {
    id: number;
    name: string;
    description?: string | null;
    category: string;
    amount: number;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    startDate: string;
    endDate?: string | null;
    active: boolean;
    accountId?: number | null;
    account?: Account | null;
    createdAt?: string;
}

export interface Package {
    id: number;
    name: string;
    code: string;
    description?: string | null;
    price: number;
    discount: number;
    active: boolean;
    createdAt?: string;
    packageItems?: PackageItem[];
}

export interface PackageItem {
    id: number;
    packageId: number;
    variantId: number;
    quantity: number;
    variant?: ProductVariant;
}

export interface Promotion {
    id: number;
    name: string;
    description?: string | null;
    startDate: string;
    endDate: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    conditionType: 'ALL_CUSTOMERS' | 'MINIMUM_PURCHASE' | 'REPEAT_CUSTOMERS' | 'PRODUCT_SPECIFIC';
    minPurchaseAmount?: number | null;
    active: boolean;
    createdAt?: string;
    promotionItems?: PromotionItem[];
}

export interface PromotionItem {
    id: number;
    promotionId: number;
    variantId: number;
    variant?: ProductVariant;
}

export interface AdvanceBooking {
    id: number;
    customerId?: number | null;
    customer?: Customer | null;
    totalAmount: number;
    advancePayment: number;
    instructions?: string | null;
    deliveryDate: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FULFILLED';
    createdAt?: string;
    advanceBookingItems?: AdvanceBookingItem[];
}

export interface AdvanceBookingItem {
    id: number;
    bookingId: number;
    variantId: number;
    quantity: number;
    unitPrice: number;
    variant?: ProductVariant;
}

export interface StockMovement {
    id: number;
    productId: number;
    product?: { id: number; name: string };
    type: 'PURCHASE' | 'SALE' | 'SALE_RETURN' | 'PURCHASE_RETURN' | 'ADJUSTMENT' | 'OPENING';
    quantity: number;
    note?: string | null;
    reference?: string | null;
    referenceId?: number | null;
    accountId?: number | null;
    createdAt: string;
}

export interface CustomerLedgerEntry {
    id: number;
    customerId: number;
    type: 'SALE' | 'PAYMENT' | 'SALE_RETURN' | 'REFUND' | 'ADJUSTMENT_DR' | 'ADJUSTMENT_CR' | 'OPENING_BALANCE';
    amount: number;
    balance: number;
    debit?: number;
    credit?: number;
    description?: string | null;
    date?: string | null;
    note?: string | null;
    reference?: string | null;
    referenceId?: number | null;
    createdAt: string;
}

export interface SupplierLedgerEntry {
    id: number;
    supplierId: number;
    type: 'PURCHASE' | 'PAYMENT' | 'PURCHASE_RETURN' | 'ADJUSTMENT_DR' | 'ADJUSTMENT_CR' | 'OPENING_BALANCE';
    amount: number;
    balance: number;
    debit?: number;
    credit?: number;
    description?: string | null;
    date?: string | null;
    note?: string | null;
    reference?: string | null;
    referenceId?: number | null;
    createdAt: string;
}

export interface CustomerPayment {
    id: number;
    customerId: number;
    amount: number;
    accountId: number;
    account?: { id: number; name: string; code: string };
    note?: string | null;
    date: string;
    createdAt: string;
}

export interface SupplierPayment {
    id: number;
    supplierId: number;
    amount: number;
    accountId: number;
    account?: { id: number; name: string; code: string };
    note?: string | null;
    date: string;
    createdAt: string;
}

export interface HeldSale {
    id: number;
    userId: number;
    saleData: object;
    note?: string | null;
    status: 'HELD' | 'RESUMED' | 'CANCELLED';
    createdAt: string;
}

export interface HeldPurchase {
    id: number;
    userId: number;
    purchaseData: object;
    note?: string | null;
    status: 'HELD' | 'RESUMED' | 'CANCELLED';
    createdAt: string;
}

export interface DashboardStats {
    today?: {
        salesTotal: number;
        salesCount: number;
        paidAmount: number;
        grossProfit: number;
        vsYesterday?: { salesTotal: number; salesCount: number; salesGrowth: number };
    };
    thisMonth?: {
        salesTotal: number;
        salesCount: number;
        paidAmount: number;
        discount: number;
        taxAmount: number;
        purchasesTotal: number;
        purchasesCount: number;
        purchasesPaid: number;
        expensesTotal: number;
        expensesCount: number;
        cogs: number;
        grossProfit: number;
        netProfit: number;
    };
    lastMonth?: {
        salesTotal: number;
        salesCount: number;
        purchasesTotal: number;
        purchasesCount: number;
        expensesTotal: number;
        expensesCount: number;
    };
    changes?: { salesGrowth: number; purchasesChange: number; expensesChange: number };
    inventory?: {
        totalProducts: number;
        lowStockCount: number;
        outOfStockCount: number;
        totalInventoryValue: number;
    };
    customers?: { total: number; newThisMonth: number };
    suppliers?: { total: number };
    pendingReturns?: number;
    charts?: {
        daily: { date: string; sales: number; salesCount: number; purchases: number; expenses: number }[];
        monthly: { month: string; sales: number; salesCount: number; purchases: number; expenses: number }[];
    };
    topProducts?: { variantId: number; productName: string; variantName: string; totalQty: number; totalRevenue: number }[];
    topCustomers?: { customerId: number; customerName: string; totalOrders: number; totalRevenue: number }[];
    recentSales?: { id: number; date: string; customer: string; total: number; paid: number; due: number }[];
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMeta;
    meta?: PaginationMeta;
}

// Re-export old User for compatibility
export type { User as AuthUser };

// Common UI types
export type Size = 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost';
export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default';
