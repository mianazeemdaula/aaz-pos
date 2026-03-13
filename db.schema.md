generator client {
  provider = "prisma-client"
  output   = "../generated/client"
}

datasource db {
  provider = "postgres"
}

// ==== USER MANAGEMENT ====
model User {
  id        Int       @id @default(autoincrement())
  name      String
  username  String    @unique
  password  String
  role      UserRole
  phone     String?
  address   String?
  status    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  lastLogin DateTime?

  // Relations
  sales                Sale[]
  purchases            Purchase[]
  saleReturnsRequested SaleReturn[]   @relation("SaleReturnUser")
  saleReturnsApproved  SaleReturn[]   @relation("SaleReturnAdmin")
  heldSales            HeldSale[]
  heldPurchases        HeldPurchase[]
  expenses             Expense[]
  employee             Employee? // One-to-one: a User may also be an Employee

  @@map("users")
}

enum UserRole {
  ADMIN
  MANAGER
  CASHIER
  DELIVERY_BOY
  WORKER
}

// ==== CHART OF ACCOUNTS ====
model Account {
  id     Int         @id @default(autoincrement())
  code   String      @unique // e.g., "1001", "2001"
  name   String // e.g., "Cash", "Bank - HBL", "Accounts Receivable"
  type   AccountType // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
  active Boolean     @default(true)

  // Relations
  purchases         Purchase[]
  purchaseReturns   PurchaseReturn[]
  saleReturns       SaleReturn[]
  expenses          Expense[]
  recurringExpenses RecurringExpense[]
  stockMovements    StockMovement[]
  customerPayments  CustomerPayment[]
  supplierPayments  SupplierPayment[]
  salarySlips       SalarySlip[]
  employeeAdvances  EmployeeAdvance[]
  salePayments      SalePayment[]

  @@map("accounts")
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

// ============================================================
// ==== CUSTOMER ====
// ============================================================
model Customer {
  id          Int     @id @default(autoincrement())
  name        String
  phone       String?
  address     String?
  email       String?
  balance     Float   @default(0) // Denormalized running balance. Positive = customer owes us
  creditLimit Float? // Max credit allowed (null = no limit)
  active      Boolean @default(true)

  sales           Sale[]
  advanceBookings AdvanceBooking[]
  ledger          CustomerLedger[]
  payments        CustomerPayment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("customers")
}

// Every financial event that affects a customer's balance
model CustomerLedger {
  id          Int                @id @default(autoincrement())
  customerId  Int
  type        CustomerLedgerType
  amount      Float // Always positive; direction determined by type
  balance     Float // Running balance snapshot AFTER this entry
  referenceId Int? // FK to Sale / SaleReturn / CustomerPayment id
  reference   String? // Human-readable e.g. "INV-0042", "PMT-0010"
  note        String?
  createdAt   DateTime           @default(now())

  customer Customer @relation(fields: [customerId], references: [id])

  @@index([customerId, createdAt])
  @@map("customer_ledger")
}

enum CustomerLedgerType {
  SALE // Invoice raised → balance increases (customer owes more)
  PAYMENT // Payment received → balance decreases
  SALE_RETURN // Return approved → balance decreases
  REFUND // Cash refunded to customer
  ADJUSTMENT_DR // Manual debit correction
  ADJUSTMENT_CR // Manual credit correction
  OPENING_BALANCE // Initial balance entry on system setup
}

// Standalone payment received from a customer (not tied to a single invoice)
model CustomerPayment {
  id         Int      @id @default(autoincrement())
  customerId Int
  amount     Float
  accountId  Int // Account that received the money (Cash, Bank, etc.)
  note       String?
  date       DateTime @default(now())

  customer Customer @relation(fields: [customerId], references: [id])
  account  Account  @relation(fields: [accountId], references: [id])

  createdAt DateTime @default(now())

  @@map("customer_payments")
}

// ============================================================
// ==== SUPPLIER ====
// ============================================================
model Supplier {
  id           Int     @id @default(autoincrement())
  name         String
  phone        String?
  address      String?
  email        String?
  balance      Float   @default(0) // Denormalized running balance. Positive = we owe them
  bankDetails  String? // Bank account / IBAN for outgoing payments
  paymentTerms String? // e.g., "Net 30", "COD"
  taxId        String? // NTN / CNIC / VAT registration number
  active       Boolean @default(true)

  purchases Purchase[]
  ledger    SupplierLedger[]
  payments  SupplierPayment[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("suppliers")
}

// Every financial event that affects a supplier's balance
model SupplierLedger {
  id          Int                @id @default(autoincrement())
  supplierId  Int
  type        SupplierLedgerType
  amount      Float // Always positive; direction determined by type
  balance     Float // Running balance snapshot AFTER this entry
  referenceId Int? // FK to Purchase / PurchaseReturn / SupplierPayment id
  reference   String? // Human-readable e.g. "PO-0011", "PMT-0007"
  note        String?
  createdAt   DateTime           @default(now())

  supplier Supplier @relation(fields: [supplierId], references: [id])

  @@index([supplierId, createdAt])
  @@map("supplier_ledger")
}

enum SupplierLedgerType {
  PURCHASE // Bill received → balance increases (we owe more)
  PAYMENT // Payment made to supplier → balance decreases
  PURCHASE_RETURN // Return sent to supplier → balance decreases
  ADJUSTMENT_DR // Manual debit correction
  ADJUSTMENT_CR // Manual credit correction
  OPENING_BALANCE // Initial balance entry on system setup
}

// Standalone payment made to a supplier (not tied to a single PO)
model SupplierPayment {
  id         Int      @id @default(autoincrement())
  supplierId Int
  amount     Float
  accountId  Int // Account that the money was paid from
  note       String?
  date       DateTime @default(now())

  supplier Supplier @relation(fields: [supplierId], references: [id])
  account  Account  @relation(fields: [accountId], references: [id])

  createdAt DateTime @default(now())

  @@map("supplier_payments")
}

// ==== PRODUCTS & INVENTORY ====
model Category {
  id       Int     @id @default(autoincrement())
  name     String
  parentId Int? // null = top-level category
  hsnCode  String? // Optional HSN code for tax classification
  taxRate  Float? // Optional tax rate for products in this category

  parent        Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  subcategories Category[] @relation("CategoryHierarchy")
  products      Product[]

  @@unique([name, parentId])
  @@map("categories")
}

model Brand {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  active   Boolean   @default(true)
  products Product[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("brands")
}

model Product {
  id            Int     @id @default(autoincrement())
  name          String
  description   String?
  brandId       Int?
  categoryId    Int
  reorderLevel  Int     @default(10)
  totalStock    Int     @default(0) // Denormalized — updated via StockMovement
  avgCostPrice  Float   @default(0) // Weighted average cost — updated on each purchase
  allowNegative Boolean @default(false)
  imageUrl      String?
  hsCode        String? // Harmonized System code for tax
  taxRate       Float? // Product-level tax rate (overrides category if set)
  active        Boolean @default(true)

  brand          Brand?           @relation(fields: [brandId], references: [id])
  category       Category         @relation(fields: [categoryId], references: [id])
  variants       ProductVariant[]
  stockMovements StockMovement[]

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  purchaseItems PurchaseItem[]

  @@map("products")
}

model ProductVariant {
  id             Int     @id @default(autoincrement())
  productId      Int
  name           String // e.g., "Unit", "Dozen", "Pack of 6"
  barcode        String  @unique
  price          Float // Selling price
  wholesalePrice Float? // Optional wholesale price
  purchasePrice  Float // Last purchase price (for profit calculation)
  factor         Int     @default(1) // Conversion factor (1=unit, 12=dozen)
  isDefault      Boolean @default(false)

  product             Product               @relation(fields: [productId], references: [id])
  saleItems           SaleItem[]
  returnItems         ReturnItem[]
  advanceBookingItems AdvanceBookingItems[]
  packageItems        PackageItem[]
  promotionItems      PromotionItems[]
  purchaseReturnItems PurchaseReturnItem[]

  @@map("product_variants")
}

// ==== STOCK MOVEMENTS (Audit Trail) ====
model StockMovement {
  id          Int               @id @default(autoincrement())
  productId   Int
  type        StockMovementType
  quantity    Int // Positive = stock in, Negative = stock out
  reference   String? // e.g., "INV-0042", "PO-0011"
  referenceId Int? // FK to Sale / Purchase / Return id
  note        String?
  accountId   Int?
  createdAt   DateTime          @default(now())

  product Product  @relation(fields: [productId], references: [id])
  account Account? @relation(fields: [accountId], references: [id])

  @@index([productId, createdAt])
  @@map("stock_movements")
}

enum StockMovementType {
  PURCHASE // Stock received from supplier
  SALE // Stock sold to customer
  SALE_RETURN // Stock returned from customer
  PURCHASE_RETURN // Stock returned to supplier
  ADJUSTMENT // Manual stock correction
  OPENING // Opening stock entry
}

// ==== SALES ====
model Sale {
  id           Int     @id @default(autoincrement())
  customerId   Int?
  totalAmount  Float
  paidAmount   Float   @default(0) // Sum of all SalePayment.amount entries
  taxAmount    Float   @default(0)
  discount     Float   @default(0)
  changeAmount Float   @default(0) // Change given to customer
  userId       Int?
  taxInvoiceId String? @unique // Tax authority invoice number

  customer Customer?     @relation(fields: [customerId], references: [id])
  user     User?         @relation(fields: [userId], references: [id])
  items    SaleItem[]
  returns  SaleReturn[]
  payments SalePayment[] // Split payments across multiple accounts

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("sales")
}

// Represents one payment leg of a sale.
// A cash-only sale has one row; a split-payment sale has multiple rows.
// The sum of all SalePayment.amount for a sale = Sale.paidAmount.
// changeAmount is stored on the SalePayment row where cash was tendered,
// since change is only ever given back for a physical cash payment.
model SalePayment {
  id           Int     @id @default(autoincrement())
  saleId       Int
  accountId    Int // Account that received this portion (Cash, JazzCash, Bank, etc.)
  amount       Float // Amount paid via this account
  changeAmount Float   @default(0) // Change given back on this payment leg (cash only)
  note         String?

  sale    Sale    @relation(fields: [saleId], references: [id], onDelete: Cascade)
  account Account @relation(fields: [accountId], references: [id])

  createdAt DateTime @default(now())

  @@map("sale_payments")
}

model SaleItem {
  id           Int   @id @default(autoincrement())
  saleId       Int
  variantId    Int
  quantity     Int
  unitPrice    Float
  discount     Float @default(0)
  totalPrice   Float // (unitPrice - discount) * quantity
  avgCostPrice Float @default(0) // Snapshot for profit calculation

  sale    Sale           @relation(fields: [saleId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id])

  @@map("sale_items")
}

// ==== PURCHASES ====
model Purchase {
  id          Int      @id @default(autoincrement())
  invoiceNo   String? // Supplier's invoice number
  supplierId  Int?
  totalAmount Float
  paidAmount  Float    @default(0)
  accountId   Int // Account to debit
  userId      Int?
  date        DateTime @default(now())
  discount    Float    @default(0)
  taxAmount   Float    @default(0)
  expenses    Float    @default(0) // Freight / misc landing costs

  supplier Supplier?        @relation(fields: [supplierId], references: [id])
  account  Account          @relation(fields: [accountId], references: [id])
  user     User?            @relation(fields: [userId], references: [id])
  items    PurchaseItem[]
  returns  PurchaseReturn[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("purchases")
}

model PurchaseItem {
  id         Int   @id @default(autoincrement())
  purchaseId Int
  productId  Int
  quantity   Int
  discount   Float @default(0)
  taxAmount  Float @default(0)
  unitCost   Float
  totalCost  Float // (unitCost - discount) * quantity + taxAmount

  purchase Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  product  Product  @relation(fields: [productId], references: [id])

  @@map("purchase_items")
}

// ==== RETURNS ====
enum SaleReturnStatus {
  PENDING // Waiting for admin approval
  APPROVED // Approved by admin, ready to process
  REJECTED // Rejected by admin
  PROCESSED // Return completed and money refunded
  CANCELLED // Cancelled by user or admin
}

model SaleReturn {
  id                Int              @id @default(autoincrement())
  saleId            Int
  reason            String?
  totalRefund       Float
  accountId         Int?
  userId            Int?
  adminId           Int?
  status            SaleReturnStatus @default(PENDING)
  requestedAt       DateTime         @default(now())
  approvedAt        DateTime?
  rejectedAt        DateTime?
  processedAt       DateTime?
  adminNotes        String?
  requiresApproval  Boolean          @default(true)
  originalSaleTotal Float?
  maxReturnDays     Int              @default(30)

  sale    Sale         @relation(fields: [saleId], references: [id])
  items   ReturnItem[]
  user    User?        @relation("SaleReturnUser", fields: [userId], references: [id])
  admin   User?        @relation("SaleReturnAdmin", fields: [adminId], references: [id])
  account Account?     @relation(fields: [accountId], references: [id])

  @@map("sale_returns")
}

model ReturnItem {
  id        Int   @id @default(autoincrement())
  returnId  Int
  variantId Int
  quantity  Int
  discount  Float @default(0)
  unitPrice Float

  return  SaleReturn     @relation(fields: [returnId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id])

  @@map("return_items")
}

model PurchaseReturn {
  id          Int      @id @default(autoincrement())
  purchaseId  Int
  reason      String?
  totalRefund Float
  accountId   Int?
  date        DateTime @default(now())

  purchase Purchase             @relation(fields: [purchaseId], references: [id])
  account  Account?             @relation(fields: [accountId], references: [id])
  items    PurchaseReturnItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("purchase_returns")
}

model PurchaseReturnItem {
  id        Int   @id @default(autoincrement())
  returnId  Int
  variantId Int
  quantity  Int
  discount  Float @default(0)
  unitCost  Float
  totalCost Float

  return  PurchaseReturn @relation(fields: [returnId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id])

  @@map("purchase_return_items")
}

// ==== PACKAGES (Bundles) ====
model Package {
  id           Int           @id @default(autoincrement())
  name         String
  code         String        @unique
  description  String?
  price        Float
  discount     Float         @default(0)
  active       Boolean       @default(true)
  packageItems PackageItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("packages")
}

model PackageItem {
  id        Int @id @default(autoincrement())
  packageId Int
  variantId Int
  quantity  Int

  package Package        @relation(fields: [packageId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id])

  @@map("package_items")
}

// ============================================================
// ==== EMPLOYEE & PAYROLL ====
//
// Design principles:
//   • User  = system access (login, role, permissions)
//   • Employee = HR identity (contract, salary, financial account)
//   • They are linked 1-to-1 via userId, but kept separate so a
//     User account can exist without HR data and vice-versa.
//
// Money flow:
//   Advance taken         →  EmployeeAdvance  →  EmployeeLedger (ADVANCE)
//   Credit purchase       →  manual entry     →  EmployeeLedger (CREDIT_PURCHASE)
//   Salary slip created   →  SalarySlip       →  EmployeeLedger (SALARY)
//     └─ auto-deducts all PENDING advances from the same month
//        and any manual CREDIT_PURCHASE entries you flag for deduction
//   Salary paid           →  SalarySlip.status=PAID  →  EmployeeLedger (SALARY_PAID)
// ============================================================

model Employee {
  id           Int      @id @default(autoincrement())
  userId       Int      @unique // Linked system user
  joiningDate  DateTime
  designation  String? // e.g., "Cashier", "Store Manager"
  baseSalary   Float // Agreed monthly salary
  advanceLimit Float    @default(0) // Max total advance allowed at once (0 = no limit)
  balance      Float    @default(0) // Denormalized. Positive = company owes employee, Negative = employee owes company
  active       Boolean  @default(true)

  user        User              @relation(fields: [userId], references: [id])
  ledger      EmployeeLedger[]
  salarySlips SalarySlip[]
  advances    EmployeeAdvance[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("employees")
}

// ------------------------------------------------------------------
// Every financial event that affects an employee's balance.
// This is the single source of truth — never update Employee.balance
// directly; always write a ledger entry and update balance atomically
// inside a Prisma $transaction.
// ------------------------------------------------------------------
model EmployeeLedger {
  id          Int                @id @default(autoincrement())
  employeeId  Int
  type        EmployeeLedgerType
  amount      Float // Always positive; direction determined by type
  balance     Float // Running balance snapshot AFTER this entry
  referenceId Int? // FK to SalarySlip / EmployeeAdvance / Sale id
  reference   String? // Human-readable e.g. "SAL-2024-03", "ADV-0012", "INV-0055"
  note        String?
  createdAt   DateTime           @default(now())

  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([employeeId, createdAt])
  @@map("employee_ledger")
}

enum EmployeeLedgerType {
  SALARY // Salary earned this month → balance increases (company owes employee more)
  SALARY_PAID // Net salary disbursed → balance decreases
  ADVANCE // Advance taken → balance decreases (employee owes company)
  ADVANCE_REPAID // Advance repaid separately (not via salary deduction)
  CREDIT_PURCHASE // Employee bought on credit — recorded via manual ledger entry
  BONUS // One-off bonus → balance increases
  DEDUCTION // Manual penalty / fine → balance decreases
  ADJUSTMENT_DR // Manual debit correction
  ADJUSTMENT_CR // Manual credit correction
  OPENING_BALANCE // Initial balance on system setup
}

// ------------------------------------------------------------------
// Advance payment given to an employee before salary day.
// Multiple advances per month are allowed.
// All unpaid advances for a month are auto-deducted when the
// SalarySlip is generated (status moves to DEDUCTED).
// ------------------------------------------------------------------
model EmployeeAdvance {
  id         Int           @id @default(autoincrement())
  employeeId Int
  amount     Float
  accountId  Int // Account the cash was paid from
  reason     String?
  status     AdvanceStatus @default(PENDING)
  month      Int // Intended deduction month (1–12)
  year       Int // Intended deduction year
  deductedIn Int? // SalarySlip id this was deducted in (set when DEDUCTED)
  date       DateTime      @default(now())

  employee   Employee    @relation(fields: [employeeId], references: [id])
  account    Account     @relation(fields: [accountId], references: [id])
  salarySlip SalarySlip? @relation(fields: [deductedIn], references: [id])

  createdAt DateTime @default(now())

  @@map("employee_advances")
}

enum AdvanceStatus {
  PENDING // Given but not yet deducted from salary
  DEDUCTED // Deducted in a SalarySlip
  REPAID // Repaid directly by employee (cash)
  WAIVED // Waived off by management
}

// ------------------------------------------------------------------
// ------------------------------------------------------------------
// Monthly salary slip — generated once per employee per month.
// Acts as the settlement document: pulls all PENDING advances for
// the month, computes netPayable, then marks them as DEDUCTED.
// Credit purchases are tracked manually via EmployeeLedger entries;
// their total is entered into otherDeductions when generating the slip.
//
//   netPayable = baseSalary + bonus - totalAdvances - otherDeductions
// ------------------------------------------------------------------
model SalarySlip {
  id              Int          @id @default(autoincrement())
  employeeId      Int
  accountId       Int? // Account salary is paid from
  year            Int
  month           Int // 1–12
  baseSalary      Float // Snapshot of Employee.baseSalary at time of generation
  bonus           Float        @default(0)
  totalAdvances   Float        @default(0) // Sum of all PENDING advances deducted this month
  otherDeductions Float        @default(0) // Credit purchases, fines, penalties — entered manually
  netPayable      Float // baseSalary + bonus - totalAdvances - otherDeductions
  status          SalaryStatus @default(DRAFT)
  paidDate        DateTime?
  note            String?

  employee Employee          @relation(fields: [employeeId], references: [id])
  account  Account?          @relation(fields: [accountId], references: [id])
  advances EmployeeAdvance[] // Advances deducted in this slip

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([employeeId, year, month]) // One slip per employee per month
  @@map("salary_slips")
}

enum SalaryStatus {
  DRAFT // Generated but not yet reviewed
  APPROVED // Reviewed and approved, ready to pay
  PAID // Net salary has been disbursed
  CANCELLED // Voided (e.g., employee left mid-month)
}

// ==== EXPENSES ====
model Expense {
  id          Int      @id @default(autoincrement())
  description String
  amount      Float
  category    String // Rent, Utilities, Marketing, etc.
  accountId   Int
  userId      Int? // Who recorded it
  date        DateTime @default(now())

  account Account @relation(fields: [accountId], references: [id])
  user    User?   @relation(fields: [userId], references: [id])

  @@map("expenses")
}

// ==== RECURRING EXPENSES ====
model RecurringExpense {
  id          Int              @id @default(autoincrement())
  name        String
  description String?
  category    String
  amount      Float
  frequency   ExpenseFrequency @default(MONTHLY)
  startDate   DateTime
  endDate     DateTime?
  active      Boolean          @default(true)
  accountId   Int?

  account Account? @relation(fields: [accountId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("recurring_expenses")
}

enum ExpenseFrequency {
  DAILY
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}

// ==== ADVANCE BOOKINGS ====
model AdvanceBooking {
  id             Int           @id @default(autoincrement())
  customerId     Int?
  advancePayment Float
  instructions   String?
  deliveryDate   DateTime
  status         BookingStatus @default(PENDING)
  totalAmount    Float

  customer            Customer?             @relation(fields: [customerId], references: [id])
  advanceBookingItems AdvanceBookingItems[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("advance_bookings")
}

model AdvanceBookingItems {
  id        Int   @id @default(autoincrement())
  bookingId Int
  variantId Int
  quantity  Int
  unitPrice Float

  booking AdvanceBooking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id])

  @@map("advance_booking_items")
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  FULFILLED
}

// ==== PROMOTIONS ====
model Promotion {
  id                Int                @id @default(autoincrement())
  name              String
  description       String?
  startDate         DateTime
  endDate           DateTime
  discountType      DiscountType
  discountValue     Float
  conditionType     PromotionCondition
  minPurchaseAmount Float?
  active            Boolean            @default(true)

  promotionItems PromotionItems[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("promotions")
}

model PromotionItems {
  id          Int @id @default(autoincrement())
  promotionId Int
  variantId   Int

  promotion Promotion      @relation(fields: [promotionId], references: [id], onDelete: Cascade)
  variant   ProductVariant @relation(fields: [variantId], references: [id])

  @@unique([promotionId, variantId])
  @@map("promotion_items")
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

enum PromotionCondition {
  ALL_CUSTOMERS
  MINIMUM_PURCHASE
  REPEAT_CUSTOMERS
  PRODUCT_SPECIFIC
}

// ==== HELD TRANSACTIONS (Cart Suspend/Resume) ====
model HeldSale {
  id       Int        @id @default(autoincrement())
  saleData Json
  userId   Int
  status   HeldStatus @default(HELD)
  note     String?

  user User @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("held_sales")
}

model HeldPurchase {
  id           Int        @id @default(autoincrement())
  purchaseData Json
  userId       Int
  status       HeldStatus @default(HELD)
  note         String?

  user User @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("held_purchases")
}

enum HeldStatus {
  HELD
  RESUMED
  CANCELLED
}
