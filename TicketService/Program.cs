using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TicketService.Data;
using TicketService.Services;

// --- TẤT CẢ CODE LOGIC PHẢI NẰM DƯỚI CÁC DÒNG USING Ở TRÊN ---

var builder = WebApplication.CreateBuilder(args);

// ==============================================
// 1. CẤU HÌNH DỊCH VỤ (SERVICES)
// ==============================================

// Thêm Controllers
builder.Services.AddControllers();

// Cấu hình Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// [QUAN TRỌNG - MỚI THÊM] Cấu hình CORS (Cho phép Frontend gọi vào)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()  // Cho phép mọi nguồn (React, Vue, Mobile...)
              .AllowAnyMethod()  // Cho phép mọi hành động (GET, POST, PUT, DELETE)
              .AllowAnyHeader(); // Cho phép mọi Header
    });
});

// Cấu hình kết nối Database MySQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// ĐĂNG KÝ SERVICE
builder.Services.AddScoped<ITicketService, TicketService.Services.TicketService>();

// Cấu hình AutoMapper
builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

// Cấu hình Authentication (JWT)
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

app.UseHttpsRedirection();

// [QUAN TRỌNG - MỚI THÊM] Kích hoạt CORS (Phải đặt trước Auth)
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();