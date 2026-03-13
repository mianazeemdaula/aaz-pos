# FBR Tax Integration Guide

## Overview

This application now includes **FBR (Federal Board of Revenue)** tax integration for automatic fiscal invoice generation when creating storage contracts. This ensures compliance with Pakistan's tax regulations.

---

## Features

### ✅ Automatic Invoice Generation
- FBR fiscal invoice is generated automatically when creating a new contract
- Invoice number is stored with the contract for future reference
- Graceful fallback if FBR service is unavailable

### ✅ Service Health Monitoring
- Check FBR service availability before generating invoices
- Automatic retry logic and error handling
- Contract creation continues even if FBR service fails

### ✅ Buyer Information Management
- Collect buyer CNIC (National ID)
- Collect buyer NTN (National Tax Number)
- Optional buyer name field

---

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# FBR Configuration
VITE_FBR_BASE_URL=http://localhost:8524/api/IMSFiscal
VITE_FBR_POS_ID=123456
VITE_FBR_ENABLED=true
```

### Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_FBR_BASE_URL` | Base URL for FBR fiscal service | `http://localhost:8524/api/IMSFiscal` | Yes |
| `VITE_FBR_POS_ID` | Your registered POS ID with FBR | `123456` | Yes |
| `VITE_FBR_ENABLED` | Enable/disable FBR integration | `true` | No |

---

## How It Works

### 1. Contract Creation Flow

```
User Creates Contract
    ↓
Contract Saved to Backend
    ↓
Check FBR Service Health
    ↓
Generate Invoice Details
    ↓
Submit to FBR API
    ↓
Receive FBR Invoice Number
    ↓
Update Contract with Invoice Number
```

### 2. Invoice Data Mapping

The system automatically maps contract data to FBR format:

| Contract Field | FBR Field | Notes |
|---------------|-----------|-------|
| Contract Code | USIN | Unique invoice identifier |
| Total Amount | TotalBillAmount | Including tax |
| Tax Rate | TaxRate | Applied to all items |
| Buyer CNIC | BuyerCNIC | 13-digit CNIC |
| Buyer NTN | BuyerNTN | Format: 1234567-8 |
| Contract Items | Items[] | Each item with tax calculation |

### 3. Tax Calculation

For each contract item:

```typescript
// Base amount without tax
const saleValue = quantity * unitRate;

// Calculate tax
const taxCharged = saleValue * (taxRate / 100);

// Total amount
const totalAmount = saleValue + taxCharged;
```

---

## API Endpoints

### Health Check (Ping)

**Endpoint:** `GET /api/IMSFiscal/get`

**Response:**
```xml
<ArrayOfstring xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
  <string>Service is responding</string>
</ArrayOfstring>
```

### Generate Invoice

**Endpoint:** `POST /api/IMSFiscal/GetInvoiceNumberByModel`

**Request Body:**
```json
{
  "InvoiceNumber": "",
  "POSID": 123456,
  "USIN": "CONTRACT-123",
  "DateTime": "2026-02-17 11:19:39",
  "SaleValue": 1000.0,
  "BuyerNTN": "1234567-8",
  "BuyerCNIC": "4210100000000",
  "BuyerName": "Customer Name",
  "TotalSaleValue": 1000.0,
  "TotalQuantity": 10,
  "TotalTaxCharged": 170.0,
  "Discount": 0.0,
  "FurtherTax": 0.0,
  "TotalBillAmount": 1170.0,
  "PaymentMode": 1,
  "InvoiceType": 1,
  "Items": [
    {
      "ItemCode": "ITEM-001",
      "ItemName": "Potato Storage",
      "Quantity": 10,
      "PCTCode": "00000000",
      "TaxRate": 17,
      "TaxCharged": 170,
      "TotalAmount": 1170,
      "SaleValue": 1000,
      "InvoiceType": 1,
      "Discount": 0
    }
  ]
}
```

**Success Response:**
```json
{
  "InvoiceNumber": "819038FBKP2194812*test*",
  "Code": "100",
  "Response": "Fiscal Invoice Number generated successfully.",
  "Errors": null
}
```

**Error Response:**
```json
{
  "InvoiceNumber": null,
  "Code": "400",
  "Response": "Error message",
  "Errors": ["Detailed error 1", "Detailed error 2"]
}
```

---

## User Interface

### Contract Form - FBR Fields

When creating or editing a contract, users can now fill in:

#### FBR Tax Information Section

1. **Buyer CNIC** *(Optional)*
   - 13-digit National ID Card number
   - Format: 4210100000000
   - Used for FBR reporting

2. **Buyer NTN** *(Optional)*
   - National Tax Number
   - Format: 1234567-8
   - For registered taxpayers

3. **Buyer Name** *(Optional)*
   - Customer/buyer full name
   - Defaults to farmer name if empty
   - Appears on fiscal invoice

### Contract Display

After successful creation, the contract will show:
- **FBR Invoice Number**: If successfully generated
- **Status Badge**: Visual indicator of tax compliance

---

## Code Examples

### Check FBR Service Health

```typescript
import { fbrService } from '../services';

async function checkFBRStatus() {
  const health = await fbrService.checkHealth();
  console.log(health.isAvailable); // true or false
  console.log(health.message);     // Status message
}
```

### Manual Invoice Generation

```typescript
import { fbrService, FBRPaymentMode, FBRInvoiceType } from '../services';

async function generateInvoice() {
  const invoiceData = {
    InvoiceNumber: '',
    POSID: 123456,
    USIN: 'UNIQUE-ID-001',
    DateTime: fbrService.formatDateTime(new Date()),
    SaleValue: 1000,
    BuyerCNIC: '4210100000000',
    BuyerName: 'Customer Name',
    TotalSaleValue: 1000,
    TotalQuantity: 2,
    TotalTaxCharged: 170,
    Discount: 0,
    FurtherTax: 0,
    TotalBillAmount: 1170,
    PaymentMode: FBRPaymentMode.CASH,
    InvoiceType: FBRInvoiceType.NEW,
    Items: [
      {
        ItemCode: 'PROD-001',
        ItemName: 'Product',
        Quantity: 2,
        PCTCode: '00000000',
        TaxRate: 17,
        TaxCharged: 170,
        TotalAmount: 1170,
        SaleValue: 1000,
        InvoiceType: FBRInvoiceType.NEW,
        Discount: 0
      }
    ]
  };

  try {
    const response = await fbrService.generateInvoice(invoiceData);
    console.log('Invoice Number:', response.InvoiceNumber);
  } catch (error) {
    console.error('Failed to generate invoice:', error);
  }
}
```

### Tax Calculation Helper

```typescript
import { fbrService } from '../services';

// Calculate tax amount
const taxAmount = fbrService.calculateTax(1000, 17); // 170

// Calculate total with tax
const total = fbrService.calculateTotalWithTax(1000, 17); // 1170

// Format date for FBR
const fbrDateTime = fbrService.formatDateTime(new Date());
// "2026-02-17 11:19:39"
```

---

## Error Handling

### Graceful Degradation

The system is designed to handle FBR failures gracefully:

1. **Service Unavailable**: Contract is created without FBR invoice number
2. **Timeout**: Request times out after 15 seconds, contract still saved
3. **Invalid Data**: Validation errors are logged, contract creation continues
4. **Network Error**: Contract is saved, FBR can be retried later

### Error Scenarios

| Error Type | Behavior | User Impact |
|------------|----------|-------------|
| FBR Service Down | Contract created without invoice | ⚠️ Warning shown |
| Invalid POS ID | Error logged, contract saved | ⚠️ Warning shown |
| Network Timeout | Contract saved locally | ⚠️ Warning shown |
| Invalid Tax Data | FBR generation skipped | ⚠️ Warning shown |

### Logging

All FBR operations are logged to the console:

```typescript
console.log('FBR Invoice Request:', requestData);
console.log('FBR Invoice Response:', response);
console.error('FBR invoice generation failed:', error);
console.warn('Contract created without FBR invoice number');
```

---

## Database Schema Updates

### Contract Table

Add these columns to support FBR integration:

```sql
ALTER TABLE contracts ADD COLUMN fbr_invoice_number VARCHAR(100);
ALTER TABLE contracts ADD COLUMN buyer_cnic VARCHAR(15);
ALTER TABLE contracts ADD COLUMN buyer_ntn VARCHAR(15);
ALTER TABLE contracts ADD COLUMN buyer_name VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX idx_contracts_fbr_invoice ON contracts(fbr_invoice_number);
```

---

## Testing

### Test FBR Service Availability

```bash
curl http://localhost:8524/api/IMSFiscal/get
```

Expected response:
```xml
<ArrayOfstring>
  <string>Service is responding</string>
</ArrayOfstring>
```

### Test Invoice Generation

```bash
curl -X POST http://localhost:8524/api/IMSFiscal/GetInvoiceNumberByModel \
  -H "Content-Type: application/json" \
  -d '{
    "InvoiceNumber": "",
    "POSID": 123456,
    "USIN": "TEST-001",
    "DateTime": "2026-02-17 11:19:39",
    "SaleValue": 1000.0,
    "BuyerCNIC": "4210100000000",
    "BuyerName": "Test Customer",
    "TotalSaleValue": 1000.0,
    "TotalQuantity": 1,
    "TotalTaxCharged": 170.0,
    "Discount": 0.0,
    "FurtherTax": 0.0,
    "TotalBillAmount": 1170.0,
    "PaymentMode": 1,
    "InvoiceType": 1,
    "Items": [{
      "ItemCode": "TEST-001",
      "ItemName": "Test Item",
      "Quantity": 1,
      "PCTCode": "00000000",
      "TaxRate": 17,
      "TaxCharged": 170,
      "TotalAmount": 1170,
      "SaleValue": 1000,
      "InvoiceType": 1,
      "Discount": 0
    }]
  }'
```

---

## Troubleshooting

### FBR Service Not Responding

**Symptom:** Contracts created without invoice numbers

**Solutions:**
1. Check if FBR service is running
2. Verify `VITE_FBR_BASE_URL` is correct
3. Test connectivity: `curl http://localhost:8524/api/IMSFiscal/get`
4. Check firewall settings
5. Ensure FBR service is not blocking requests

### Invalid POS ID

**Symptom:** Error "Invalid POS ID"

**Solutions:**
1. Verify correct POS ID in environment variables
2. Contact FBR to confirm registration
3. Check POS ID format (should be a number)

### Invoice Generation Timeout

**Symptom:** "FBR request timeout" error

**Solutions:**
1. Increase timeout in `fbr.service.ts` (default: 15000ms)
2. Check network connectivity to FBR server
3. Verify FBR server performance

### Tax Calculation Mismatch

**Symptom:** Tax amounts don't match expectations

**Solutions:**
1. Verify tax rate is set correctly in contract
2. Check item quantities and unit rates
3. Review tax calculation logic in service
4. Round values to 2 decimal places

---

## Security Considerations

### ⚠️ Important Security Notes

1. **POS ID Protection**
   - Store POS ID securely in environment variables
   - Never commit POS ID to version control
   - Use different POS IDs for dev/staging/production

2. **Buyer Data Privacy**
   - CNIC and NTN are sensitive personal information
   - Ensure database is encrypted at rest
   - Implement proper access controls
   - Follow GDPR/local privacy laws

3. **API Communication**
   - Use HTTPS in production
   - Implement request signing if available
   - Rate limit FBR API calls
   - Monitor for suspicious activity

4. **Error Messages**
   - Don't expose sensitive data in error messages
   - Log errors securely
   - Sanitize user inputs

---

## Compliance Checklist

- [ ] FBR POS device registered with tax authorities
- [ ] Valid POS ID obtained from FBR
- [ ] Application configured with correct POS ID
- [ ] Tax rate verified and up-to-date
- [ ] Buyer information collection implemented
- [ ] Invoice storage mechanism in place
- [ ] Error handling and logging configured
- [ ] Backup procedures for FBR service failures
- [ ] Staff trained on FBR invoice generation
- [ ] Regular testing of FBR integration

---

## Future Enhancements

### Planned Features

1. **Invoice History**
   - View all FBR invoices
   - Search and filter by date/customer
   - Export invoice reports

2. **Bulk Invoice Generation**
   - Generate invoices for multiple contracts
   - Batch processing for efficiency

3. **Credit/Debit Notes**
   - Support for returns (InvoiceType: 2)
   - Automatic adjustment invoices

4. **Advanced Reporting**
   - Daily/monthly tax summaries
   - FBR compliance reports
   - Tax reconciliation tools

5. **Retry Mechanism**
   - Auto-retry failed invoice generations
   - Scheduled retry jobs
   - Manual retry from UI

6. **Real-time Validation**
   - Validate CNIC format
   - Verify NTN with database
   - Check buyer details

---

## Support

### Resources

- **FBR Official Website**: https://fbr.gov.pk
- **POS Registration**: Contact FBR regional office
- **Technical Support**: Your IT department
- **Documentation**: This file

### Common Questions

**Q: Is FBR integration mandatory?**  
A: For businesses registered with FBR, yes. You can disable it via `VITE_FBR_ENABLED=false`.

**Q: What happens if FBR service is down?**  
A: Contracts are still created successfully. You can generate invoices later via manual process.

**Q: Can I change FBR invoice numbers?**  
A: No, FBR invoice numbers are permanent and cannot be modified once generated.

**Q: How do I get a POS ID?**  
A: Register your business POS device with FBR. Visit your regional FBR office for registration.

**Q: What tax rate should I use?**  
A: Use the current GST/sales tax rate applicable to your business (commonly 17% in Pakistan).

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-17 | Initial FBR integration with contract creation |

---

**End of FBR Integration Guide**
