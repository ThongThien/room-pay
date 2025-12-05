# Hướng dẫn Test PaymentService với SePay Webhook

## 1. Setup Environment

### Bước 1: Cài đặt và chạy Database
```bash
# Kiểm tra MySQL đã chạy chưa
# Database: payment_service_db đã được tạo sẵn từ appsettings.Development.json
```

### Bước 2: Restore packages
```bash
cd /Users/nhatbaodinh/Dev/intern-team3-2025/PaymentService
dotnet restore
```

### Bước 3: Tạo migration và update database
```bash
# Tạo migration đầu tiên
dotnet ef migrations add InitialCreate

# Apply migration vào database
dotnet ef database update
```

### Bước 4: Chạy PaymentService
```bash
dotnet run
```

PaymentService sẽ chạy trên port (kiểm tra console output), ví dụ: `http://localhost:5000`

### Bước 5: Setup Ngrok để expose local server
```bash
# Cài đặt ngrok (nếu chưa có)
brew install ngrok

# Chạy ngrok (thay 5000 bằng port của PaymentService)
ngrok http 5000
```

**Output ngrok:**
```
Forwarding  https://abc-def-ghi.ngrok-free.app -> http://localhost:5000
```

Copy URL `https://abc-def-ghi.ngrok-free.app` để dùng cho bước tiếp theo.

### Bước 6: Cập nhật appsettings.Development.json
```json
{
  "SePay": {
    "WebhookUrl": "https://abc-def-ghi.ngrok-free.app/api/payment/webhook"
  }
}
```

## 2. Cấu hình Webhook trên SePay

### Bước 1: Đăng nhập SePay
Truy cập: https://my.sepay.vn/

### Bước 2: Thêm Webhook
1. Menu: **Tích hợp Webhooks** → **Thêm Webhook**
2. Điền thông tin:
   - **Tên:** Payment Service Test
   - **Sự kiện:** ✅ Có giao dịch mới
   - **Tài khoản:** Chọn tài khoản ngân hàng của bạn
   - **Bỏ qua nếu không có Code:** ❌ KHÔNG chọn
   - **URL:** `https://abc-def-ghi.ngrok-free.app/api/payment/webhook`
   - **Xác thực thanh toán:** ✅ Đúng
   - **Kiểu chứng thực:** Không chứng thực
   - **Content type:** application/json
   - **Trạng thái:** ✅ Hoạt động
3. Click **Lưu**

## 3. Test Flow

### Test Case 1: Tạo Payment QR Code

#### Bước 1: Tạo Invoice trong InvoiceService trước
```bash
# Đảm bảo InvoiceService đang chạy
cd /Users/nhatbaodinh/Dev/intern-team3-2025/InvoiceService
dotnet run
```

Tạo invoice mới qua API hoặc Swagger UI của InvoiceService:
```http
POST http://localhost:5150/api/invoices
Content-Type: application/json

{
  "propertyId": 1,
  "tenantId": 1,
  "billingPeriodStart": "2024-12-01",
  "billingPeriodEnd": "2024-12-31",
  "dueDate": "2025-01-10",
  "invoiceItems": [
    {
      "description": "Tiền thuê tháng 12",
      "amount": 5000000,
      "quantity": 1
    }
  ]
}
```

Response sẽ có `invoiceNumber`, ví dụ: `INV001`

#### Bước 2: Tạo Payment QR Code
```http
POST http://localhost:5000/api/payment/create-checkout
Content-Type: application/json

{
  "invoiceNumber": "INV001",
  "amount": 5000000,
  "description": "Thanh toán hóa đơn INV001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "qrCode": "https://qr.sepay.vn/img?bank=MBBank&acc=0903252427&amount=5000000&des=INV001&template=compact",
  "orderId": "INV001"
}
```

#### Bước 3: Hiển thị QR Code cho người dùng
Frontend có thể hiển thị QR code bằng cách:
```html
<img src="https://qr.sepay.vn/img?bank=MBBank&acc=0903252427&amount=5000000&des=INV001&template=compact" />
```

Hoặc truy cập URL trực tiếp trên trình duyệt để xem QR.

### Test Case 2: Thanh toán và nhận Webhook

#### Bước 1: Thực hiện chuyển khoản
Có 2 cách test:

**Cách 1: Chuyển khoản thật (Recommended)**
1. Mở app ngân hàng trên điện thoại
2. Quét QR code từ bước trên
3. Kiểm tra thông tin:
   - Số tài khoản: `0903252427`
   - Ngân hàng: MBBank
   - Số tiền: `5,000,000 VND`
   - Nội dung: `INV001`
4. Xác nhận chuyển khoản

**Cách 2: Sử dụng Test Transaction trong SePay (nếu có tài khoản test)**
- Vào SePay Dashboard → Test Transaction
- Tạo giao dịch giả lập

#### Bước 2: Theo dõi Log
Kiểm tra console của PaymentService, bạn sẽ thấy log như:
```
[INFO] === SePay Webhook Received ===
[INFO] Raw Body: {"id":92704,"gateway":"MBBank",...}
[INFO] Webhook Data - ID: 92704, Gateway: MBBank, Amount: 5000000, Content: INV001
[INFO] Extracted Invoice Number: INV001
[INFO] Transaction saved to database with ID: 1
[INFO] Successfully marked invoice INV001 as PAID
```

#### Bước 3: Kiểm tra trong SePay Dashboard
1. Vào **Giao dịch** → Tìm giao dịch vừa thực hiện
2. Click vào giao dịch → **Xem Webhooks đã bắn**
3. Kiểm tra:
   - **Request Body:** Dữ liệu SePay gửi đến
   - **Response:** `{"success":true}` (HTTP 200)
   - **Status:** Success

#### Bước 4: Verify kết quả

**Kiểm tra trong PaymentService Database:**
```sql
USE payment_service_db;
SELECT * FROM Transactions ORDER BY CreatedAt DESC LIMIT 1;
```

Kết quả mong đợi:
- `SePayTransactionId`: 92704
- `InvoiceNumber`: INV001
- `AmountIn`: 5000000
- `ProcessingStatus`: Processed

**Kiểm tra trong InvoiceService:**
```http
GET http://localhost:5150/api/invoices?invoiceNumber=INV001
```

Response sẽ có `status`: `"Paid"`

### Test Case 3: Check Payment Status (AJAX Polling)

Frontend có thể poll API này để kiểm tra trạng thái thanh toán:

```http
GET http://localhost:5000/api/payment/check-status/INV001
```

**Response khi chưa thanh toán:**
```json
{
  "paymentStatus": "Unpaid",
  "invoiceNumber": "INV001",
  "amount": 5000000
}
```

**Response khi đã thanh toán:**
```json
{
  "paymentStatus": "Paid",
  "invoiceNumber": "INV001",
  "amount": 5000000
}
```

**Frontend code example (JavaScript):**
```javascript
// Poll mỗi 2 giây
const pollInterval = setInterval(async () => {
  const response = await fetch('http://localhost:5000/api/payment/check-status/INV001');
  const data = await response.json();
  
  if (data.paymentStatus === 'Paid') {
    clearInterval(pollInterval);
    alert('Thanh toán thành công!');
    // Redirect hoặc update UI
  }
}, 2000);
```

## 4. Test Edge Cases

### Test Case 4: Số tiền không khớp
```bash
# Tạo invoice với số tiền 5,000,000
# Nhưng chuyển khoản 4,999,999 hoặc 5,000,001
```

**Kết quả mong đợi:**
- Transaction được lưu vào DB
- `ProcessingStatus`: Failed
- `ProcessingNote`: "Amount mismatch: Invoice=5000000, Transaction=4999999"
- Invoice vẫn ở trạng thái Unpaid

### Test Case 5: Invoice không tồn tại
```bash
# Chuyển khoản với nội dung "INV999" (invoice không tồn tại)
```

**Kết quả mong đợi:**
- Transaction được lưu vào DB
- `ProcessingStatus`: Failed
- `ProcessingNote`: "Invoice INV999 not found"

### Test Case 6: Nội dung không có Invoice Number
```bash
# Chuyển khoản với nội dung "Chuyen tien mua hang"
```

**Kết quả mong đợi:**
- Transaction được lưu vào DB
- `ProcessingStatus`: Failed
- `ProcessingNote`: "Could not extract invoice number from transaction content"

### Test Case 7: Webhook Retry
```bash
# Stop PaymentService
# Thực hiện chuyển khoản
# Webhook sẽ fail
# Start PaymentService
# Vào SePay Dashboard → Webhook Logs → Click "Gọi lại"
```

**Kết quả mong đợi:**
- Webhook được gọi lại thành công
- Transaction được xử lý

### Test Case 8: Duplicate Webhook
```bash
# Thực hiện chuyển khoản thành công
# Vào SePay Dashboard → Click "Gọi lại" webhook
```

**Kết quả mong đợi:**
- Log: "Transaction ID xxx already processed. Skipping."
- Không tạo transaction mới trong DB
- Response: `{"success":true,"message":"Transaction already processed"}`

## 5. Debugging Tips

### Kiểm tra Webhook có được gọi không
```bash
# Tail log của PaymentService
tail -f /path/to/paymentservice.log

# Hoặc xem console output khi chạy dotnet run
```

### Kiểm tra Ngrok có hoạt động không
```bash
# Truy cập Ngrok Web Interface
http://127.0.0.1:4040

# Xem tất cả HTTP requests đến ngrok tunnel
```

### Test Webhook manually
```bash
curl -X POST http://localhost:5000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "gateway": "MBBank",
    "transactionDate": "2024-12-03 10:30:00",
    "accountNumber": "0903252427",
    "content": "INV001 Thanh toan",
    "transferType": "in",
    "transferAmount": 5000000,
    "accumulated": 10000000,
    "referenceCode": "MBVCB.12345",
    "description": "Chuyen tien tu nguoi dung"
  }'
```

### Kiểm tra Database
```sql
-- Xem tất cả transactions
SELECT * FROM Transactions ORDER BY CreatedAt DESC;

-- Xem transactions theo invoice
SELECT * FROM Transactions WHERE InvoiceNumber = 'INV001';

-- Xem failed transactions
SELECT * FROM Transactions WHERE ProcessingStatus = 'Failed';
```

### Xem API Documentation
Truy cập Swagger UI:
```
http://localhost:5000/swagger
```

## 6. Troubleshooting

### Lỗi: Cannot connect to MySQL
```bash
# Kiểm tra MySQL đang chạy
mysql -h 47.129.169.174 -P 3306 -u root -p

# Kiểm tra connection string trong appsettings.Development.json
```

### Lỗi: Webhook không được gọi
1. ✅ Kiểm tra ngrok có đang chạy
2. ✅ Kiểm tra URL trong SePay webhook config
3. ✅ Kiểm tra webhook status = "Hoạt động"
4. ✅ Kiểm tra có chọn đúng tài khoản ngân hàng

### Lỗi: Invoice không được cập nhật
1. ✅ Kiểm tra InvoiceService có đang chạy
2. ✅ Kiểm tra connection giữa PaymentService và InvoiceService
3. ✅ Kiểm tra log của PaymentService
4. ✅ Kiểm tra transactions table xem processing status

### Lỗi: "Entity Framework Core is not installed"
```bash
dotnet tool install --global dotnet-ef
```

## 7. Clean Up sau khi Test

### Xóa test data
```sql
-- Xóa test transactions
DELETE FROM Transactions WHERE InvoiceNumber LIKE 'TEST%';

-- Reset auto increment
ALTER TABLE Transactions AUTO_INCREMENT = 1;
```

### Stop services
```bash
# Stop PaymentService: Ctrl+C
# Stop Ngrok: Ctrl+C
# Stop InvoiceService: Ctrl+C
```

### Disable webhook trong SePay
Vào SePay Dashboard → Webhooks → Chuyển status thành "Tạm dừng"

## 8. Next Steps

Sau khi test thành công local:

1. ✅ Deploy PaymentService lên server (có domain thật)
2. ✅ Update webhook URL trong SePay với domain production
3. ✅ Enable API Key authentication cho webhook (nếu cần)
4. ✅ Setup monitoring và alerting
5. ✅ Tạo unit tests và integration tests
6. ✅ Document API cho Frontend team
