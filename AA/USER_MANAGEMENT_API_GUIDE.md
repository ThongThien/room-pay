# Hướng dẫn Test API Quản lý Người dùng

## 🚀 Khởi động ứng dụng

```bash
cd /Users/nhatbaodinh/Dev/intern-team3-2025/AA
dotnet run
```

Ứng dụng sẽ chạy tại: `http://localhost:5286`  
Swagger UI: `http://localhost:5286/swagger`

---

## 📝 Các bước test API

### Bước 1: Đăng ký tài khoản Owner

```bash
curl -X POST http://localhost:5286/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "Owner123",
    "confirmPassword": "Owner123",
    "fullName": "Owner Test"
  }'
```

**Response mẫu:**
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "abc123...",
  "email": "owner@example.com",
  "fullName": "Owner Test",
  "roles": ["Owner"]
}
```

**Lưu lại `token` để sử dụng cho các request tiếp theo!**

---

### Bước 2: Đăng nhập (nếu đã có tài khoản)

```bash
curl -X POST http://localhost:5286/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "Owner123"
  }'
```

---

### Bước 3: Tạo người dùng mới (Owner tạo Tenant)

**Thay `YOUR_TOKEN` bằng token nhận được từ bước 1 hoặc 2**

```bash
curl -X POST http://localhost:5286/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "tenant1@example.com",
    "password": "Tenant123",
    "fullName": "Nguyen Van A"
  }'
```

**Response mẫu:**
```json
{
  "success": true,
  "message": "Tạo người dùng thành công",
  "data": {
    "id": "user123...",
    "email": "tenant1@example.com",
    "fullName": "Nguyen Van A",
    "ownerId": "abc123...",
    "roles": ["Tenant"],
    "createdAt": "2025-12-04T13:00:00Z",
    "updatedAt": null
  }
}
```

**Lưu ý:** 
- Role tự động gán là `Tenant`
- `ownerId` tự động gán là userId của Owner tạo
- Không cần và không được chọn Role

---

### Bước 4: Cập nhật thông tin người dùng

```bash
curl -X PUT http://localhost:5286/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fullName": "Nguyen Van B",
    "email": "newemail@example.com"
  }'
```

**Các trường có thể cập nhật (tùy chọn):**
- `email`: Email mới
- `fullName`: Tên đầy đủ mới
- `password`: Mật khẩu mới
- `role`: Role mới (Admin, Owner, Tenant, etc.)

**Ví dụ cập nhật mật khẩu:**
```bash
curl -X PUT http://localhost:5286/api/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "password": "NewPassword123"
  }'
```

---

### Bước 5: Xóa người dùng

```bash
curl -X DELETE http://localhost:5286/api/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response mẫu:**
```json
{
  "success": true,
  "message": "Xóa người dùng thành công",
  "data": null
}
```

---

### Bước 6: Lấy danh sách người dùng thuộc Owner

```bash
curl -X GET http://localhost:5286/api/users/owner/OWNER_ID/tenants \
  -H "X-Service-Api-Key: your-service-api-key-here"
```

---

## 🧪 Test bằng Swagger UI

1. Mở trình duyệt: `http://localhost:5286/swagger`
2. Đăng ký/Đăng nhập để lấy token
3. Click nút **"Authorize"** ở góc trên bên phải
4. Nhập: `Bearer YOUR_TOKEN` (có chữ "Bearer" và khoảng trắng)
5. Click **"Authorize"** rồi **"Close"**
6. Bây giờ bạn có thể test các API bằng giao diện đồ họa

---

## 🔒 Quy tắc bảo mật

### API yêu cầu token JWT:
- ✅ `POST /api/users` - Tạo user (Owner only)
- ✅ `PUT /api/users/{userId}` - Cập nhật user (Owner only)
- ✅ `DELETE /api/users/{userId}` - Xóa user (Owner only)

### Kiểm tra quyền:
- Owner chỉ có thể quản lý user có `ownerId` = userId của chính họ
- Owner không thể xóa chính mình
- Owner không thể cập nhật/xóa user của Owner khác

---

## 💡 Các trường hợp lỗi thường gặp

### 1. Unauthorized (401)
```json
{
  "error": "Không thể xác định Owner"
}
```
**Nguyên nhân:** Thiếu hoặc sai token  
**Giải pháp:** Kiểm tra header `Authorization: Bearer YOUR_TOKEN`

### 2. Forbidden (403)
**Nguyên nhân:** User không có quyền Owner  
**Giải pháp:** Đăng nhập bằng tài khoản Owner

### 3. Bad Request (400)
```json
{
  "success": false,
  "message": "Email đã được sử dụng"
}
```
**Nguyên nhân:** Dữ liệu không hợp lệ  
**Giải pháp:** Kiểm tra lại thông tin đầu vào

### 4. Not Found (404)
```json
{
  "success": false,
  "message": "Người dùng không tồn tại"
}
```
**Nguyên nhân:** userId không tồn tại  
**Giải pháp:** Kiểm tra lại userId

---

## 📊 Ví dụ test hoàn chỉnh

### Test Case: Owner tạo và quản lý 2 Tenant

```bash
# 1. Đăng ký Owner
curl -X POST http://localhost:5286/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.com","password":"Owner123","confirmPassword":"Owner123","fullName":"Owner Test"}'

# Lưu token vào biến (Linux/Mac)
TOKEN="eyJhbGc..."

# 2. Tạo Tenant 1
curl -X POST http://localhost:5286/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"tenant1@test.com","password":"Tenant123","fullName":"Tenant 1"}'

# 3. Tạo Tenant 2
curl -X POST http://localhost:5286/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"tenant2@test.com","password":"Tenant123","fullName":"Tenant 2"}'

# 4. Cập nhật thông tin Tenant 1
curl -X PUT http://localhost:5286/api/users/TENANT1_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fullName":"Tenant Updated"}'

# 5. Xóa Tenant 2
curl -X DELETE http://localhost:5286/api/users/TENANT2_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🛠️ Tools khuyên dùng

1. **Swagger UI** (đã tích hợp): `http://localhost:5286/swagger`
2. **Postman**: Import các request từ Swagger
3. **curl**: Command line testing
4. **Thunder Client** (VS Code Extension): Test API ngay trong VS Code

---

## 📌 Lưu ý quan trọng

1. **Token có thời gian hết hạn** - cần đăng nhập lại khi token hết hạn
2. **Role mặc định là Tenant** - không thể chọn role khi tạo user
3. **OwnerId tự động gán** - không thể thay đổi sau khi tạo
4. **Email phải unique** - không thể tạo 2 user cùng email
5. **Password tối thiểu 6 ký tự** - phải có ít nhất 1 số

---

## ✅ Checklist Test

- [ ] Đăng ký Owner thành công
- [ ] Đăng nhập Owner thành công
- [ ] Tạo Tenant thành công (role tự động là Tenant)
- [ ] OwnerId được gán đúng
- [ ] Cập nhật thông tin Tenant
- [ ] Cập nhật password Tenant
- [ ] Xóa Tenant thành công
- [ ] Không xóa được chính mình
- [ ] Không quản lý được user của Owner khác
- [ ] Token hết hạn trả về 401
