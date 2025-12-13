using InvoiceService.Data;
using InvoiceService.Features.Invoice;
using InvoiceService.Features.Pricing;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using InvoiceService.Repositories.Interfaces; 
using InvoiceService.Repositories.Implementations;
using InvoiceService.Features.Property;
using Quartz;
using InvoiceService.Jobs;
using System.Text;
using InvoiceService.Services;
using Quartz;
using InvoiceService.Jobs;

var builder = WebApplication.CreateBuilder(args);

// Đọc JwtSettings từ cấu hình
var jwtSettingsSection = builder.Configuration.GetSection("JwtSettings");
var jwtSecret = jwtSettingsSection.GetValue<string>("Secret") 
    ?? throw new InvalidOperationException("JWT Secret is not configured");
var jwtIssuer = jwtSettingsSection.GetValue<string>("Issuer") 
    ?? throw new InvalidOperationException("JWT Issuer is not configured");
var jwtAudience = jwtSettingsSection.GetValue<string>("Audience") 
    ?? throw new InvalidOperationException("JWT Audience is not configured");

// Add services to the container.
builder.Services.AddControllers();

// Thêm xác thực JWT
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
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ClockSkew = TimeSpan.Zero
    };
});

// Configure Entity Framework and MySQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))));

builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>(); 
builder.Services.AddScoped<IInvoiceService, InvoiceServiceImpl>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddHttpClient<InvoiceService.Services.IUserServiceClient, InvoiceService.Services.UserServiceClient>();
builder.Services.AddHttpClient<IPropertyService, PropertyServiceClientImpl>();
builder.Services.AddSingleton<InvoiceService.Services.PaymentWebSocketHandler>();
builder.Services.AddScoped<IInvoiceReminderService, InvoiceReminderService>();
builder.Services.AddScoped<IMessageProducer,RabbitMQProducer>();

// Configure Quartz for scheduled jobs
builder.Services.AddQuartz(q =>
{
    var jobKey = new JobKey("InvoiceVisibilityJob");
    q.AddJob<InvoiceVisibilityJob>(opts => opts.WithIdentity(jobKey));

    q.AddTrigger(opts => opts
        .ForJob(jobKey)
        .WithIdentity("InvoiceVisibilityTrigger")
        .WithCronSchedule("0 0 3 25 * ?")); // Chạy vào ngày 25 hàng tháng lúc 3 giờ 00:00
});

builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Invoice Service API",
        Version = "v1",
        Description = "API for managing invoices with tenant-based payment tracking"
    });
});
// ⭐️ CẤU HÌNH QUARTZ cho Invoice Service
builder.Services.AddQuartz(q =>
{
    q.UseMicrosoftDependencyInjectionJobFactory();

    // 1. Đăng ký Job Child: Payment Reminder
    var paymentJobKey = new JobKey("PaymentReminderJob");
    q.AddJob<PaymentReminderJob>(j => j.WithIdentity(paymentJobKey).StoreDurably());

    // 2. Đăng ký Job Master: Invoice Reminder Scheduler
    var masterJobKey = new JobKey("InvoiceReminderSchedulerJob");
    q.AddJob<InvoiceReminderSchedulerJob>(j => j.WithIdentity(masterJobKey));

    // 3. Lên lịch cho Job Master (Chạy mỗi phút để quét Owners và lên lịch lại)
    q.AddTrigger(t => t
        .ForJob(masterJobKey)
        .WithIdentity("InvoiceReminderSchedulerTrigger")
        .WithCronSchedule("0 0/1 * * * ?") // Chạy mỗi phút (hoặc theo lịch bạn muốn Master Job chạy)
        .StartAt(DateTimeOffset.UtcNow.AddSeconds(10)) 
    );
});

// ⭐️ THÊM HOSTED SERVICE QUARTZ
builder.Services.AddQuartzHostedService(options =>
{
    options.WaitForJobsToComplete = true; // Đợi Job hoàn thành khi Shutdown
});

// Add Cors
string allowedOrigins = builder.Configuration
                             .GetSection("Cors:AllowedOrigins")
                             .Get<string>() ?? string.Empty;
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Tự động tạo database và apply migrations
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

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

app.UseCors("AllowAll");

// Enable WebSocket support
app.UseWebSockets();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();