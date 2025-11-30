# Invoice Service API

API quản lý hóa đơn với tính năng thanh toán dựa trên tenant.

## Cấu trúc dự án

- **Models**: Chứa các entity models (Invoice, InvoiceItem)
- **Data**: ApplicationDbContext cho Entity Framework
- **Services**: Business logic layer
- **Controllers**: REST API endpoints
- **Features/DTOs**: Data Transfer Objects

## API Endpoints

### 1. Lấy tất cả hóa đơn của tenant
```
GET /api/invoices?tenantId={tenantId}
```

### 2. Lấy hóa đơn theo trạng thái
```
GET /api/invoices/status/{status}?tenantId={tenantId}
```
Trạng thái: Unpaid, Paid, Cancelled, Overdue

### 3. Lấy chi tiết hóa đơn
```
GET /api/invoices/{id}?tenantId={tenantId}
```

### 4. Tạo hóa đơn mới
```
POST /api/invoices
```
Body:
```json
{
  "tenantId": "tenant-123",
  "invoiceDate": "2025-11-29T00:00:00Z",
  "dueDate": "2025-12-29T00:00:00Z",
  "customerName": "Nguyễn Văn A",
  "customerEmail": "nguyenvana@example.com",
  "customerAddress": "123 Đường ABC, TP.HCM",
  "customerPhone": "0901234567",
  "taxAmount": 10.00,
  "notes": "Ghi chú",
  "items": [
    {
      "description": "Sản phẩm A",
      "quantity": 2,
      "unitPrice": 100000,
      "productCode": "PROD-001"
    }
  ]
}
```

### 5. Cập nhật hóa đơn
```
PUT /api/invoices/{id}?tenantId={tenantId}
```

### 6. Xóa hóa đơn
```
DELETE /api/invoices/{id}?tenantId={tenantId}
```

### 7. Đánh dấu hóa đơn đã thanh toán
```
POST /api/invoices/{id}/mark-paid?tenantId={tenantId}
```
Body:
```json
{
  "paymentMethod": "Bank Transfer",
  "paymentReference": "TXN123456"
}
```

## Cài đặt

### 1. Khôi phục packages
```bash
dotnet restore
```

### 2. Cấu hình connection string
Cập nhật `appsettings.json` với connection string của bạn:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=InvoiceServiceDb;..."
  }
}
```

### 3. Tạo migration và database
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### 4. Chạy ứng dụng
```bash
dotnet run
```

Truy cập Swagger UI tại: https://localhost:7119/swagger

## Tính năng chính

- ✅ CRUD đầy đủ cho hóa đơn
- ✅ Hỗ trợ multi-tenant (theo tenantId)
- ✅ Tự động tạo số hóa đơn theo định dạng INV-YYYYMM-XXXX
- ✅ Tính toán tự động tổng tiền
- ✅ Quản lý trạng thái thanh toán
- ✅ Tracking thông tin thanh toán (phương thức, tham chiếu)
- ✅ Quản lý chi tiết các item trong hóa đơn
- ✅ Logging và error handling

## Models

### Invoice
- Id, TenantId, InvoiceNumber
- Thông tin khách hàng (Name, Email, Address, Phone)
- Ngày hóa đơn, ngày đến hạn
- Tổng tiền (SubTotal, TaxAmount, TotalAmount)
- Trạng thái, thông tin thanh toán
- Items (danh sách InvoiceItem)

### InvoiceItem
- Description, Quantity, UnitPrice, Amount
- ProductCode
- Liên kết với Invoice
