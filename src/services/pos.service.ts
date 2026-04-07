/**
 * POS Services  thin wrappers around apiClient
 */
import { apiClient } from './api';
import { API_ENDPOINTS } from '../config/api';
import type {
  PaginatedResponse, Account, Customer, Supplier, Category, Brand,
  Product, ProductVariant, Sale, Purchase,
  Employee, EmployeeAdvance, SalarySlip, Expense, RecurringExpense,
  Package, Promotion, AdvanceBooking, StockMovement, HeldSale, HeldPurchase,
  DashboardStats, User, CustomerLedgerEntry, SupplierLedgerEntry,
  CustomerPayment, SupplierPayment,
} from '../types/pos';

// ---- Accounts ----
export const accountService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Account>>(API_ENDPOINTS.accounts.list, { params }),
  create: (data: Partial<Account>) => apiClient.post<Account>(API_ENDPOINTS.accounts.create, data),
  update: (id: number, data: Partial<Account>) => apiClient.put<Account>(API_ENDPOINTS.accounts.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.accounts.delete(id)),
};

// ---- Customers ----
export const customerService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Customer>>(API_ENDPOINTS.customers.list, { params }),
  get: (id: number) => apiClient.get<Customer>(API_ENDPOINTS.customers.detail(id)),
  create: (data: Partial<Customer>) => apiClient.post<Customer>(API_ENDPOINTS.customers.create, data),
  update: (id: number, data: Partial<Customer>) => apiClient.put<Customer>(API_ENDPOINTS.customers.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.customers.delete(id)),
  getLedger: (id: number, params?: object) => apiClient.get<PaginatedResponse<CustomerLedgerEntry>>(API_ENDPOINTS.customers.ledger(id), { params }),
  createLedgerEntry: (id: number, data: object) => apiClient.post<CustomerLedgerEntry>(API_ENDPOINTS.customers.ledger(id), data),
  getPayments: (id: number, params?: object) => apiClient.get<PaginatedResponse<CustomerPayment>>(API_ENDPOINTS.customers.payments(id), { params }),
  createPayment: (id: number, data: object) => apiClient.post<CustomerPayment>(API_ENDPOINTS.customers.payments(id), data),
};

// ---- Suppliers ----
export const supplierService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Supplier>>(API_ENDPOINTS.suppliers.list, { params }),
  get: (id: number) => apiClient.get<Supplier>(API_ENDPOINTS.suppliers.detail(id)),
  create: (data: Partial<Supplier>) => apiClient.post<Supplier>(API_ENDPOINTS.suppliers.create, data),
  update: (id: number, data: Partial<Supplier>) => apiClient.put<Supplier>(API_ENDPOINTS.suppliers.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.suppliers.delete(id)),
  getLedger: (id: number, params?: object) => apiClient.get<PaginatedResponse<SupplierLedgerEntry>>(API_ENDPOINTS.suppliers.ledger(id), { params }),
  createLedgerEntry: (id: number, data: object) => apiClient.post<SupplierLedgerEntry>(API_ENDPOINTS.suppliers.ledger(id), data),
  getPayments: (id: number, params?: object) => apiClient.get<PaginatedResponse<SupplierPayment>>(API_ENDPOINTS.suppliers.payments(id), { params }),
  createPayment: (id: number, data: object) => apiClient.post<SupplierPayment>(API_ENDPOINTS.suppliers.payments(id), data),
};

// ---- Categories ----
export const categoryService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Category>>(API_ENDPOINTS.categories.list, { params }),
  create: (data: Partial<Category>) => apiClient.post<Category>(API_ENDPOINTS.categories.create, data),
  update: (id: number, data: Partial<Category>) => apiClient.put<Category>(API_ENDPOINTS.categories.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.categories.delete(id)),
};

// ---- Brands ----
export const brandService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Brand>>(API_ENDPOINTS.brands.list, { params }),
  create: (data: Partial<Brand>) => apiClient.post<Brand>(API_ENDPOINTS.brands.create, data),
  update: (id: number, data: Partial<Brand>) => apiClient.put<Brand>(API_ENDPOINTS.brands.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.brands.delete(id)),
};

// ---- Products ----
export const productService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Product>>(API_ENDPOINTS.products.list, { params }),
  get: (id: number) => apiClient.get<Product>(API_ENDPOINTS.products.detail(id)),
  create: (data: object) => apiClient.post<Product>(API_ENDPOINTS.products.create, data),
  update: (id: number, data: object) => apiClient.put<Product>(API_ENDPOINTS.products.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.products.delete(id)),
  getVariants: (id: number) => apiClient.get<ProductVariant[]>(API_ENDPOINTS.products.variants(id)),
  createVariant: (id: number, data: object) => apiClient.post<ProductVariant>(API_ENDPOINTS.products.createVariant(id), data),
  updateVariant: (id: number, variantId: number, data: object) => apiClient.put<ProductVariant>(API_ENDPOINTS.products.updateVariant(id, variantId), data),
  deleteVariant: (id: number, variantId: number) => apiClient.delete(API_ENDPOINTS.products.deleteVariant(id, variantId)),
  getVariantByBarcode: (barcode: string) => apiClient.get<ProductVariant>(API_ENDPOINTS.products.variantByBarcode(barcode)),
  uploadImage: (file: File) => apiClient.uploadFile<{ imageUrl: string }>(API_ENDPOINTS.products.uploadImage, file, 'image'),
};

// ---- Stock Movements ----
export const stockMovementService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<StockMovement>>(API_ENDPOINTS.stockMovements.list, { params }),
  adjust: (data: { productId: number; quantity: number; note?: string; accountId?: number }) =>
    apiClient.post<StockMovement>(API_ENDPOINTS.stockMovements.adjustment, data),
};

// ---- Sales ----
export const saleService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Sale>>(API_ENDPOINTS.sales.list, { params }),
  get: (id: number) => apiClient.get<Sale>(API_ENDPOINTS.sales.detail(id)),
  create: (data: object) => apiClient.post<Sale>(API_ENDPOINTS.sales.create, data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.sales.delete(id)),
};

// ---- Purchases ----
export const purchaseService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Purchase>>(API_ENDPOINTS.purchases.list, { params }),
  get: (id: number) => apiClient.get<Purchase>(API_ENDPOINTS.purchases.detail(id)),
  create: (data: object) => apiClient.post<Purchase>(API_ENDPOINTS.purchases.create, data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.purchases.delete(id)),
};

// ---- Packages ----
export const packageService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Package>>(API_ENDPOINTS.packages.list, { params }),
  get: (id: number) => apiClient.get<Package>(API_ENDPOINTS.packages.detail(id)),
  create: (data: object) => apiClient.post<Package>(API_ENDPOINTS.packages.create, data),
  update: (id: number, data: object) => apiClient.put<Package>(API_ENDPOINTS.packages.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.packages.delete(id)),
  addItem: (id: number, data: object) => apiClient.post<any>(API_ENDPOINTS.packages.addItem(id), data),
  removeItem: (id: number, itemId: number) => apiClient.delete(API_ENDPOINTS.packages.removeItem(id, itemId)),
};

// ---- Employees ----
export const employeeService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Employee>>(API_ENDPOINTS.employees.list, { params }),
  get: (id: number) => apiClient.get<Employee>(API_ENDPOINTS.employees.detail(id)),
  create: (data: object) => apiClient.post<Employee>(API_ENDPOINTS.employees.create, data),
  update: (id: number, data: object) => apiClient.put<Employee>(API_ENDPOINTS.employees.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.employees.delete(id)),
  getLedger: (id: number, params?: object) => apiClient.get<PaginatedResponse<any>>(API_ENDPOINTS.employees.ledger(id), { params }),
  getAdvances: (id: number, params?: object) => apiClient.get<PaginatedResponse<EmployeeAdvance>>(API_ENDPOINTS.employees.advances(id), { params }),
  createAdvance: (id: number, data: object) => apiClient.post<EmployeeAdvance>(API_ENDPOINTS.employees.createAdvance(id), data),
};

// ---- Salary Slips ----
export const salarySlipService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<SalarySlip>>(API_ENDPOINTS.salarySlips.list, { params }),
  get: (id: number) => apiClient.get<SalarySlip>(API_ENDPOINTS.salarySlips.detail(id)),
  create: (data: object) => apiClient.post<SalarySlip>(API_ENDPOINTS.salarySlips.create, data),
  approve: (id: number) => apiClient.patch<SalarySlip>(API_ENDPOINTS.salarySlips.approve(id)),
  pay: (id: number, data?: object) => apiClient.patch<SalarySlip>(API_ENDPOINTS.salarySlips.pay(id), data),
  cancel: (id: number) => apiClient.patch<SalarySlip>(API_ENDPOINTS.salarySlips.cancel(id)),
};

// ---- Expenses ----
export const expenseService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Expense>>(API_ENDPOINTS.expenses.list, { params }),
  get: (id: number) => apiClient.get<Expense>(API_ENDPOINTS.expenses.detail(id)),
  create: (data: Partial<Expense>) => apiClient.post<Expense>(API_ENDPOINTS.expenses.create, data),
  update: (id: number, data: Partial<Expense>) => apiClient.put<Expense>(API_ENDPOINTS.expenses.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.expenses.delete(id)),
};

// ---- Recurring Expenses ----
export const recurringExpenseService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<RecurringExpense>>(API_ENDPOINTS.recurringExpenses.list, { params }),
  get: (id: number) => apiClient.get<RecurringExpense>(API_ENDPOINTS.recurringExpenses.detail(id)),
  create: (data: Partial<RecurringExpense>) => apiClient.post<RecurringExpense>(API_ENDPOINTS.recurringExpenses.create, data),
  update: (id: number, data: Partial<RecurringExpense>) => apiClient.put<RecurringExpense>(API_ENDPOINTS.recurringExpenses.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.recurringExpenses.delete(id)),
};

// ---- Advance Bookings ----
export const advanceBookingService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<AdvanceBooking>>(API_ENDPOINTS.advanceBookings.list, { params }),
  get: (id: number) => apiClient.get<AdvanceBooking>(API_ENDPOINTS.advanceBookings.detail(id)),
  create: (data: object) => apiClient.post<AdvanceBooking>(API_ENDPOINTS.advanceBookings.create, data),
  updateStatus: (id: number, status: string) => apiClient.patch<AdvanceBooking>(API_ENDPOINTS.advanceBookings.updateStatus(id), { status }),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.advanceBookings.delete(id)),
};

// ---- Promotions ----
export const promotionService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<Promotion>>(API_ENDPOINTS.promotions.list, { params }),
  getActive: () => apiClient.get<Promotion[]>(API_ENDPOINTS.promotions.active),
  get: (id: number) => apiClient.get<Promotion>(API_ENDPOINTS.promotions.detail(id)),
  create: (data: object) => apiClient.post<Promotion>(API_ENDPOINTS.promotions.create, data),
  update: (id: number, data: object) => apiClient.put<Promotion>(API_ENDPOINTS.promotions.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.promotions.delete(id)),
};

// ---- Held Transactions ----
export const heldService = {
  listSales: (params?: object) => apiClient.get<PaginatedResponse<HeldSale>>(API_ENDPOINTS.held.salesList, { params }),
  createSale: (data: object) => apiClient.post<HeldSale>(API_ENDPOINTS.held.salesCreate, data),
  getSale: (id: number) => apiClient.get<HeldSale>(API_ENDPOINTS.held.saleDetail(id)),
  resumeSale: (id: number) => apiClient.patch<HeldSale>(API_ENDPOINTS.held.saleResume(id)),
  cancelSale: (id: number) => apiClient.patch<HeldSale>(API_ENDPOINTS.held.saleCancel(id)),
  listPurchases: (params?: object) => apiClient.get<PaginatedResponse<HeldPurchase>>(API_ENDPOINTS.held.purchasesList, { params }),
  createPurchase: (data: object) => apiClient.post<HeldPurchase>(API_ENDPOINTS.held.purchasesCreate, data),
  getPurchase: (id: number) => apiClient.get<HeldPurchase>(API_ENDPOINTS.held.purchaseDetail(id)),
  resumePurchase: (id: number) => apiClient.patch<HeldPurchase>(API_ENDPOINTS.held.purchaseResume(id)),
  cancelPurchase: (id: number) => apiClient.patch<HeldPurchase>(API_ENDPOINTS.held.purchaseCancel(id)),
};

// ---- Reports ----
export const reportService = {
  dashboard: () => apiClient.get<DashboardStats>(API_ENDPOINTS.reports.dashboard),
  downloadPdf: async (type: string, params?: object) => {
    const pdfEndpoints: Record<string, string> = {
      sales: API_ENDPOINTS.reports.salesPdf,
      purchases: API_ENDPOINTS.reports.purchasesPdf,
      inventory: API_ENDPOINTS.reports.inventoryPdf,
      expenses: API_ENDPOINTS.reports.expensesPdf,
      customers: API_ENDPOINTS.reports.customerBalancesPdf,
      suppliers: API_ENDPOINTS.reports.supplierBalancesPdf,
    };
    const endpoint = pdfEndpoints[type];
    if (!endpoint) return;
    const blob = await apiClient.getBlob(endpoint, { params });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ---- Users ----
export const userService = {
  list: (params?: object) => apiClient.get<PaginatedResponse<User>>(API_ENDPOINTS.users.list, { params }),
  get: (id: number) => apiClient.get<User>(API_ENDPOINTS.users.detail(id)),
  create: (data: object) => apiClient.post<User>(API_ENDPOINTS.users.create, data),
  update: (id: number, data: object) => apiClient.put<User>(API_ENDPOINTS.users.update(id), data),
  delete: (id: number) => apiClient.delete(API_ENDPOINTS.users.delete(id)),
  resetPassword: (id: number, newPassword: string) => apiClient.post(API_ENDPOINTS.users.resetPassword(id), { newPassword }),
};

// ---- Settings ----
export const settingsService = {
  get: () => apiClient.get<Record<string, unknown>>(API_ENDPOINTS.settings.get),
  update: (data: object) => apiClient.put<Record<string, unknown>>(API_ENDPOINTS.settings.update, data),
};
