/**
 * FBR (Federal Board of Revenue) Tax Integration Types
 * For fiscal invoice generation and compliance
 */

/**
 * Payment modes supported by FBR
 */
export enum FBRPaymentMode {
    CASH = 1,
    CARD = 2
}

/**
 * Invoice types for FBR
 */
export enum FBRInvoiceType {
    NEW = 1,
    DEBIT_NOTE = 2  // For returns
}

/**
 * Single item in FBR invoice
 */
export interface FBRInvoiceItem {
    ItemCode: string;           // Your internal item code
    ItemName: string;           // Item display name
    Quantity: number;           // Item quantity
    PCTCode: string;            // Pakistan Custom Tariff code (use "00000000" if not applicable)
    TaxRate: number;            // Tax rate percentage (e.g., 17 for 17%)
    TaxCharged: number;         // Total tax amount
    TotalAmount: number;        // Total including tax
    SaleValue: number;          // Base amount without tax
    InvoiceType: FBRInvoiceType; // 1 for new, 2 for return
    Discount: number;           // Discount amount if any
}

/**
 * Request payload for FBR invoice generation
 */
export interface FBRInvoiceRequest {
    InvoiceNumber: string;      // Keep empty, FBR will return this
    POSID: number;              // Your registered POS ID with FBR
    USIN: string;               // Your internal unique invoice number
    DateTime: string;           // Format: "YYYY-MM-DD HH:mm:ss"
    SaleValue: number;          // Total sale value before tax
    BuyerNTN?: string;          // Buyer's National Tax Number (optional)
    BuyerCNIC?: string;         // Buyer's CNIC (optional but recommended)
    BuyerName?: string;         // Buyer's name
    TotalSaleValue: number;     // Total sales value
    TotalQuantity: number;      // Total items quantity
    TotalTaxCharged: number;    // Total tax amount
    Discount: number;           // Total discount
    FurtherTax: number;         // Additional tax if any
    TotalBillAmount: number;    // Grand total (sale + tax - discount)
    PaymentMode: FBRPaymentMode; // 1 for Cash, 2 for Card
    InvoiceType: FBRInvoiceType; // 1 for New, 2 for Return
    Items: FBRInvoiceItem[];    // Array of invoice items
}

/**
 * Response from FBR invoice generation
 */
export interface FBRInvoiceResponse {
    InvoiceNumber: string;      // FBR generated invoice number
    Code: string;               // Response code (100 = success)
    Response: string;           // Response message
    Errors: string[] | null;    // Error messages if any
}

/**
 * FBR service health check response
 */
export interface FBRHealthResponse {
    isAvailable: boolean;       // Whether service is responding
    message: string;            // Service status message
}

/**
 * Configuration for FBR integration
 */
export interface FBRConfig {
    baseUrl: string;            // Base URL for FBR fiscal service
    posId: number;              // Your registered POS ID
    enabled: boolean;           // Whether FBR integration is enabled
    timeout: number;            // Request timeout in milliseconds
}
