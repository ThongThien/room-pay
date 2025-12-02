# Tích hợp PaymentService với InvoiceService

## Tổng quan

PaymentService đã được tích hợp với InvoiceService để tự động cập nhật trạng thái hóa đơn từ **Unpaid** → **Paid** khi thanh toán thành công qua SePay.

## Luồng hoạt động

```
1. Người dùng tạo đơn hàng trên InvoiceService (status: Unpaid)
2. Gọi PaymentService API: POST /api/payment/create-checkout
   - Truyền invoiceNumber, amount, description
3. PaymentService tạo checkout URL với SePay
4. Người dùng quét QR code và thanh toán
5. SePay gọi IPN webhook: POST /api/payment/ipn
6. PaymentService nhận IPN notification
7. PaymentService tự động gọi InvoiceService API: POST /api/invoices/{id}/mark-paid
8. InvoiceService cập nhật status = "Paid", paidDate = now
```

## Cấu hình

### appsettings.Development.json

```json
{
  "SePay": {
    "Environment": "sandbox",
    "MerchantId": "SP-TEST-DNB57523",
    "SecretKey": "spsk_test_Xvrv19VQ2o2YFQFqW3J2BJEt5YUrbc6K",
    "CheckoutUrl": "https://pay.sepay.vn/v1/checkout/init",
    "IpnUrl": "https://your-ngrok-url.ngrok-free.dev/api/payment/ipn",
    ...
  },
  "InvoiceService": {
    "BaseUrl": "https://localhost:5001"
  }
}
```

**Lưu ý:** Cần chỉnh `BaseUrl` của InvoiceService cho đúng với môi trường của bạn.

## API Endpoints

### 1. Tạo checkout thanh toán

**POST** `/api/payment/create-checkout`

Request:
```json
{
  "invoiceNumber": "INV-001",
  "amount": 100000,
  "description": "Thanh toán hóa đơn INV-001"
}
```

Response:
```json
{
  "success": true,
  "message": "Checkout created successfully",
  "checkoutUrl": "https://pay.sepay.vn/checkout/xxx",
  "orderId": "SEP-xxx",
  "qrCode": "data:image/png;base64,..."
}
```

### 2. IPN Webhook (Tự động)

**POST** `/api/payment/ipn`

Endpoint này nhận notification từ SePay khi thanh toán thành công, sau đó:
1. Parse thông tin đơn hàng và giao dịch
2. Tìm invoice theo `order_invoice_number`
3. Gọi InvoiceService API để đánh dấu đã thanh toán
4. Log kết quả

## Các thành phần chính

### 1. InvoiceServiceClient

File: `Services/InvoiceServiceClient.cs`

- `GetInvoiceByNumberAsync()`: Tìm invoice theo số hóa đơn
- `MarkInvoiceAsPaidAsync()`: Gọi API mark-paid của InvoiceService

### 2. PaymentController

File: `Controllers/PaymentController.cs`

- Inject `IInvoiceServiceClient` vào constructor
- Trong IPN handler, gọi `_invoiceServiceClient.MarkInvoiceAsPaidAsync()`

### 3. Program.cs

Đăng ký services:
```csharp
builder.Services.AddHttpClient<IInvoiceServiceClient, InvoiceServiceClient>();
builder.Services.AddHttpClient<ISePayService, SePayService>();
```

## Test thủ công

### Bước 1: Chạy InvoiceService
```bash
cd InvoiceService
dotnet run
# Chạy trên https://localhost:5001
```

### Bước 2: Tạo invoice trong InvoiceService
```bash
POST https://localhost:5001/api/invoices
{
  "invoiceNumber": "INV-001",
  "amount": 100000,
  "status": "Unpaid",
  ...
}
```

### Bước 3: Chạy PaymentService
```bash
cd PaymentService
dotnet run
# Chạy trên https://localhost:7000
```

### Bước 4: Setup ngrok cho IPN
```bash
ngrok http 7000
# Cập nhật IpnUrl trong appsettings.Development.json
```

### Bước 5: Tạo checkout
```bash
POST https://localhost:7000/api/payment/create-checkout
{
  "invoiceNumber": "INV-001",
  "amount": 100000,
  "description": "Test thanh toán"
}
```

### Bước 6: Thanh toán
- Mở `checkoutUrl` từ response
- Quét QR code và thanh toán

### Bước 7: Kiểm tra
- Xem logs PaymentService: IPN được nhận và gọi InvoiceService
- Kiểm tra invoice trong InvoiceService: `status` đã chuyển sang `"Paid"`

## Xử lý lỗi

### Nếu InvoiceService không tìm thấy invoice
```
Log: "Invoice INV-001 not found"
```
→ Kiểm tra số hóa đơn có tồn tại trong InvoiceService không

### Nếu gọi API mark-paid thất bại
```
Log: "Failed to mark invoice INV-001 as paid: 401 - Unauthorized"
```
→ Kiểm tra authentication/authorization giữa 2 services

### Nếu Cloudflare chặn create-checkout
```
Log: "SePay Response Status: Forbidden"
```
→ Deploy lên cloud để bypass Cloudflare (xem CLOUDFLARE_SOLUTION.md)

## So sánh với code PHP mẫu

| Feature | PHP Demo | C# PaymentService |
|---------|----------|-------------------|
| Webhook endpoint | `sepay_webhook.php` | `POST /api/payment/ipn` |
| Parse invoice number | Regex `/DH(\d+)/` | Lấy từ `order.OrderInvoiceNumber` |
| Update database | Direct MySQL query | HTTP call to InvoiceService API |
| Check payment status | Ajax polling | IPN webhook (real-time) |

## Production checklist

- [ ] Đổi `MerchantId` và `SecretKey` sang production
- [ ] Cập nhật `InvoiceService.BaseUrl` sang production URL
- [ ] Thêm authentication giữa PaymentService ↔ InvoiceService
- [ ] Implement signature verification cho IPN
- [ ] Setup retry logic nếu InvoiceService API call thất bại
- [ ] Add monitoring/alerting cho IPN failures
- [ ] Deploy cả 2 services lên cloud để bypass Cloudflare
