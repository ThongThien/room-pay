# Hướng dẫn thanh toán theo Invoice ID

## Tổng quan

PaymentService hỗ trợ 2 cách thanh toán:
1. **Theo Invoice ID** (số nguyên, ví dụ: 42) - **KHUYẾN NGHỊ**
2. **Theo Invoice Number** (chuỗi, ví dụ: INV-001) - Legacy

## Cách 1: Thanh toán theo Invoice ID (Khuyến nghị)

### Bước 1: Tạo QR Code thanh toán

```http
POST /api/payment/create-checkout
Content-Type: application/json

{
  "invoiceId": 42,
  "amount": 66268500,
  "description": "Thanh toán hóa đơn"
}
```

**Response:**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "qrCode": "https://qr.sepay.vn/img?bank=TPBank&acc=00002599719&amount=66268500&des=INV42&template=compact",
  "orderId": "INV42"
}
```

### Bước 2: Khách hàng quét QR và chuyển khoản

Nội dung chuyển khoản sẽ là: **`INV42`**

### Bước 3: SePay gửi webhook về PaymentService

```json
{
  "id": 33687610,
  "gateway": "TPBank",
  "transactionDate": "2025-12-03 13:00:00",
  "accountNumber": "00002599719",
  "content": "INV42",
  "transferType": "in",
  "transferAmount": 66268500,
  ...
}
```

### Bước 4: PaymentService tự động xử lý

1. Extract Invoice ID từ content: `INV42` → ID = **42**
2. Gọi InvoiceService: `GET /api/invoices/42`
3. Kiểm tra số tiền có khớp không
4. Cập nhật invoice: `POST /api/invoices/42/mark-paid`
5. Lưu transaction vào database

### Bước 5: Kiểm tra kết quả

**Trong InvoiceService database:**
```sql
SELECT * FROM Invoices WHERE Id = 42;
-- Status sẽ là 'Paid'
-- PaidDate sẽ có giá trị
```

**Trong PaymentService database:**
```sql
SELECT * FROM Transactions WHERE InvoiceId = 42;
-- ProcessingStatus = 'Processed'
-- InvoiceId = 42
```

## Cách 2: Thanh toán theo Invoice Number (Legacy)

### Tạo QR Code

```http
POST /api/payment/create-checkout
Content-Type: application/json

{
  "invoiceNumber": "INV-001",
  "amount": 100000,
  "description": "Thanh toán hóa đơn"
}
```

Nội dung chuyển khoản: **`INV-001`**

## Format nội dung chuyển khoản được hỗ trợ

### Invoice ID (Priority 1)
- `INV42` → Invoice ID = 42 ✅
- `INV123` → Invoice ID = 123 ✅
- `INV1` → Invoice ID = 1 ✅

### Invoice Number (Priority 2 - nếu không match ID)
- `INV-001` → Invoice Number = "INV-001" ✅
- `INV-123` → Invoice Number = "INV-123" ✅
- `INVOICE-456` → Invoice Number = "INV-456" ✅
- `DH30` → Invoice Number = "INV-030" ✅

### ❌ Format KHÔNG hỗ trợ
- `109478837677-INV42` - Có số dài phía trước
- `Thanh toan INV42` - Invoice không ở đầu
- `INV` - Thiếu số

## Kiểm tra trạng thái thanh toán

### Theo Invoice ID
```http
GET /api/payment/check-status/INV42
```

### Theo Invoice Number
```http
GET /api/payment/check-status/INV-001
```

**Response:**
```json
{
  "paymentStatus": "Paid",
  "invoiceNumber": "INV-001",
  "amount": 100000
}
```

## Test với invoice của bạn

### Invoice hiện tại:
```
ID: 42
TotalAmount: 66268500.00
Status: Unpaid
```

### 1. Tạo QR Code
```bash
curl -X POST http://localhost:5241/api/payment/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": 42,
    "amount": 66268500,
    "description": "Thanh toán hóa đơn ID 42"
  }'
```

### 2. Copy QR URL từ response và mở trong browser

### 3. Quét QR bằng app ngân hàng

Thông tin chuyển khoản:
- Ngân hàng: **TPBank**
- Số tài khoản: **00002599719**
- Số tiền: **66,268,500 VND**
- Nội dung: **INV42**

### 4. Xác nhận chuyển khoản

### 5. Kiểm tra log của PaymentService

```bash
# Sẽ thấy log tương tự:
info: PaymentService.Controllers.PaymentController[0]
      === SePay Webhook Received ===
info: PaymentService.Controllers.PaymentController[0]
      Extracted Invoice ID: 42
info: PaymentService.Controllers.PaymentController[0]
      Transaction saved to database with ID: 3
info: PaymentService.Controllers.PaymentController[0]
      Successfully marked invoice ID 42 as PAID
```

### 6. Verify trong database

```sql
-- Kiểm tra invoice đã được update
SELECT Id, Status, PaidDate, TotalAmount 
FROM Invoices 
WHERE Id = 42;

-- Kiểm tra transaction
SELECT Id, InvoiceId, AmountIn, ProcessingStatus, ProcessingNote
FROM Transactions
WHERE InvoiceId = 42;
```

## Troubleshooting

### Lỗi: Invoice not found
```json
{
  "success": false,
  "message": "Invoice ID 42 not found"
}
```

**Nguyên nhân:**
- Invoice không tồn tại trong InvoiceService
- API Key không đúng (HTTP 401)

**Giải pháp:**
```bash
# Kiểm tra invoice có tồn tại không
curl -H "X-API-Key: YOUR_API_KEY" \
  http://localhost:5150/api/invoices/42

# Kiểm tra API Key trong appsettings.Development.json
```

### Lỗi: Amount mismatch
```json
{
  "success": false,
  "message": "Payment amount does not match invoice amount"
}
```

**Nguyên nhân:**
- Số tiền chuyển khoản khác với TotalAmount của invoice

**Giải pháp:**
- Chuyển khoản đúng số tiền: **66,268,500 VND**

### Lỗi: Could not extract invoice ID
```json
{
  "success": false,
  "message": "Invoice ID/number not found in transaction content"
}
```

**Nguyên nhân:**
- Nội dung chuyển khoản không đúng format

**Giải pháp:**
- Đảm bảo nội dung chuyển khoản là: **INV42** (đúng)
- Không được: `Thanh toan INV42` (sai)
- Không được: `123456-INV42` (sai)

## API Reference

### Create Payment QR Code

**Endpoint:** `POST /api/payment/create-checkout`

**Request Body:**
```typescript
{
  invoiceId?: number,        // Invoice ID (ưu tiên)
  invoiceNumber?: string,    // Invoice Number (fallback)
  amount: number,            // Số tiền (VND)
  description?: string       // Mô tả
}
```

**Response:**
```typescript
{
  success: boolean,
  message: string,
  qrCode?: string,           // URL của QR code
  orderId?: string,          // Invoice reference
  checkoutUrl?: string       // Không dùng với VietQR
}
```

### Check Payment Status

**Endpoint:** `GET /api/payment/check-status/{invoiceRef}`

**Parameters:**
- `invoiceRef`: Invoice ID (`INV42`) hoặc Invoice Number (`INV-001`)

**Response:**
```typescript
{
  paymentStatus: "Paid" | "Unpaid" | "not_found",
  invoiceNumber: string,
  amount: number
}