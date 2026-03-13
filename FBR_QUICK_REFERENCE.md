# FBR Tax Integration - Quick Reference

## Environment Setup

```env
VITE_FBR_BASE_URL=http://localhost:8524/api/IMSFiscal
VITE_FBR_POS_ID=123456
VITE_FBR_ENABLED=true
```

## Key Functions

### Check Service Health
```typescript
const health = await fbrService.checkHealth();
// { isAvailable: true, message: "Service is responding" }
```

### Generate Invoice
```typescript
const response = await fbrService.generateInvoice(invoiceData);
// { InvoiceNumber: "819038FBKP2194812*test*", Code: "100", ... }
```

### Calculate Tax
```typescript
const taxAmount = fbrService.calculateTax(1000, 17); // 170
const total = fbrService.calculateTotalWithTax(1000, 17); // 1170
```

### Format Date/Time
```typescript
const dateTime = fbrService.formatDateTime(new Date());
// "2026-02-17 11:19:39"
```

## Payment Modes

```typescript
FBRPaymentMode.CASH = 1
FBRPaymentMode.CARD = 2
```

## Invoice Types

```typescript
FBRInvoiceType.NEW = 1         // New invoice
FBRInvoiceType.DEBIT_NOTE = 2  // Return/credit note
```

## Response Codes

| Code | Meaning |
|------|---------|
| 100  | Success |
| 400  | Bad Request |
| 401  | Unauthorized |
| 500  | Server Error |

## Contract Creation Flow

1. User fills contract form
2. User enters buyer info (CNIC/NTN)
3. Contract saved to database
4. FBR service health check
5. Invoice generated automatically
6. Invoice number stored with contract
7. Success message shown to user

## UI Fields Added

- **Buyer CNIC**: 13-digit National ID
- **Buyer NTN**: National Tax Number
- **Buyer Name**: Customer name (optional)

## Error Handling

- ✅ Service unavailable → Contract still created
- ✅ Timeout → Contract saved, warning shown
- ✅ Invalid data → Error logged, contract saved
- ✅ Network error → Graceful fallback

## Test Endpoints

### Ping
```bash
curl http://localhost:8524/api/IMSFiscal/get
```

### Generate Invoice
```bash
curl -X POST http://localhost:8524/api/IMSFiscal/GetInvoiceNumberByModel \
  -H "Content-Type: application/json" \
  -d @test-invoice.json
```

## Database Fields Added

```sql
contracts.fbr_invoice_number VARCHAR(100)
contracts.buyer_cnic VARCHAR(15)
contracts.buyer_ntn VARCHAR(15)
contracts.buyer_name VARCHAR(255)
```

## Files Modified

1. `src/types/fbr.ts` - FBR type definitions
2. `src/types/contract.ts` - Added FBR fields
3. `src/services/fbr.service.ts` - FBR API integration
4. `src/services/contract.service.ts` - Contract with FBR
5. `src/config/api.ts` - FBR configuration
6. `src/pages/CreateEditContract.tsx` - UI for buyer info

## Files Created

1. `FBR_INTEGRATION.md` - Full documentation
2. `FBR_QUICK_REFERENCE.md` - This file

---

**Need help? See FBR_INTEGRATION.md for full documentation**
