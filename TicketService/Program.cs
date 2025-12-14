using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TicketService.Data;
using TicketService.Services;

var builder = WebApplication.CreateBuilder(args);

// ==============================================
// 1. CẤU HÌNH DỊCH VỤ (SERVICES)
// ==============================================

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --- CẤU HÌNH CORS (Cho phép Frontend truy cập) ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()   // Chấp nhận mọi nguồn (React, Vue...)
              .AllowAnyMethod()   // Chấp nhận GET, POST, PUT...
              .AllowAnyHeader();  // Chấp nhận mọi Header
    });
});

// Cấu hình Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// Đăng ký Service
builder.Services.AddScoped<ITicketService, TicketService.Services.TicketService>();

builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

// Cấu hình Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("SecretKeyTu16KyTuTroLenNheBan!!!!"))
    };
});

var app = builder.Build();

// ==============================================
// 2. CẤU HÌNH PIPELINE (MIDDLEWARE)
// ==============================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ⚠️ QUAN TRỌNG: Comment dòng này lại khi chạy Local
// Lý do: Nếu Frontend gọi http:// mà Backend ép chuyển sang https:// 
// nhưng máy bạn chưa cài chứng chỉ SSL -> Sẽ bị lỗi "Refused to connect"
// app.UseHttpsRedirection(); 

// ✅ Kích hoạt CORS (Phải đặt TRƯỚC Auth & StaticFiles)
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();