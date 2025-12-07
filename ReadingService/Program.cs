using ReadingService.Data; // System/Vendor Usings
using ReadingService.Services;
using ReadingService.Features.MonthlyReading;
using ReadingService.Features.ReadingCycle;
using ReadingService.Features.User;
using ReadingService.Features.Property;
using ReadingService.Repositories.Interfaces;
using ReadingService.Repositories.Implementations;

using Microsoft.EntityFrameworkCore; // Microsoft Usings
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using Amazon.S3; // Third-party Usings
using Amazon.Runtime;
using Amazon;

using System.Text;
using System; // System Usings (thường đặt trên cùng, nhưng tôi đặt lại để nhóm các usings)
// --- Khởi tạo Builder ---

var builder = WebApplication.CreateBuilder(args);

// ====================================================================
//                             1. ĐĂNG KÝ DỊCH VỤ (builder.Services.Add...)
// ====================================================================

// Cấu hình Database Context
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))));

// Cấu hình CORS
string[] allowedOrigins = builder.Configuration
                             .GetSection("Cors:AllowedOrigins")
                             .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFE", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Cấu hình AWS S3 Service
var awsAccessKey = builder.Configuration["AWS:AccessKey"];
var awsSecretKey = builder.Configuration["AWS:SecretKey"];
var awsRegion = builder.Configuration["AWS:Region"];

if (!string.IsNullOrEmpty(awsAccessKey) && !string.IsNullOrEmpty(awsSecretKey))
{
    // Sử dụng credentials từ appsettings
    var credentials = new BasicAWSCredentials(awsAccessKey, awsSecretKey);
    var config = new AmazonS3Config
    {
        RegionEndpoint = RegionEndpoint.GetBySystemName(awsRegion)
    };
    builder.Services.AddSingleton<IAmazonS3>(new AmazonS3Client(credentials, config));
}
else
{
    // Fallback: sử dụng profile hoặc IAM role
    builder.Services.AddAWSService<IAmazonS3>();
}

// Cấu hình Authentication (JWT)
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["Secret"];

if (!string.IsNullOrEmpty(secretKey))
{
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        };
    });
}
builder.Services.AddAuthorization(); // Thêm Authorization

// Đăng ký Repositories (I...Repository)
builder.Services.AddScoped<IReadingCycleRepository, ReadingCycleRepository>();
builder.Services.AddScoped<IMonthlyReadingRepository, MonthlyReadingRepository>();

// Đăng ký Services & HttpClients (I...Service)
builder.Services.AddScoped<IS3Service, S3Service>();
builder.Services.AddScoped<IMonthlyReadingService, MonthlyReadingService>();
builder.Services.AddScoped<IReadingCycleService, ReadingCycleService>();
builder.Services.AddScoped<IUserService, UserService>();

// Đăng ký HttpClients (I...HttpClient)
builder.Services.AddHttpClient<IInvoiceHttpClient, InvoiceHttpClient>();
builder.Services.AddHttpClient<IPropertyService, PropertyService>();


// Cấu hình Controllers, Swagger/OpenAPI (Thường đặt cuối phần Services)
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ====================================================================
//                             2. CẤU HÌNH PIPELINE (app.Use...)
// ====================================================================

var app = builder.Build();

// Tự động tạo database và apply migrations (Tốt nhất nên chạy ngay sau app.Build())
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        // Tạo database nếu chưa tồn tại và apply tất cả migrations
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Error occurred while migrating or initializing the database.");
    }
}

// Cấu hình HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting(); // Tùy chọn, nhưng nên có trước CORS, Auth/Authz

app.UseCors("AllowFE"); // CORS phải đứng trước UseAuthentication/UseAuthorization

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();