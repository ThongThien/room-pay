using ReadingService.Data; // System/Vendor Usings
using ReadingService.Services;
using ReadingService.Features.MonthlyReading;
using ReadingService.Features.ReadingCycle;
using ReadingService.Features.User;
using ReadingService.Features.Property;
using ReadingService.Repositories.Interfaces;
using ReadingService.Repositories.Implementations;
using Quartz;
using ReadingService.Jobs;

using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using Amazon.S3;
using Amazon.Runtime;
using Amazon;

using System.Text;
using System; 

var builder = WebApplication.CreateBuilder(args);

// Cấu hình Database Context
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))));

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

// Thêm Quartz.NET
builder.Services.AddQuartz(q =>
{
    q.UseMicrosoftDependencyInjectionJobFactory();

    // ⭐️ Thay thế UsePersistentStore bằng q.UseInMemoryStore();
    q.UseInMemoryStore();

    // ------------------------------------------------------------------
    // A. JOB TẠO CYCLE (STATIC - Ngày 20)
    // CÁC STATIC JOB VÀ TRIGGER NÀY VẪN ĐƯỢC QUARTZ TỰ TẠO LẠI KHI KHỞI ĐỘNG
    // ------------------------------------------------------------------
    var cycleJobKey = new JobKey(nameof(AutoCreateReadingCycleJob));
    q.AddJob<AutoCreateReadingCycleJob>(opts => opts.WithIdentity(cycleJobKey));
    
    q.AddTrigger(opts => opts
        .ForJob(cycleJobKey)
        .WithIdentity("AutoCreateCycle-Trigger-20th")
        .WithCronSchedule("0 0 2 20 * ?")); // 02:00 AM ngày 20 hàng tháng

    // ------------------------------------------------------------------
    // B. MASTER SCHEDULER (STATIC - Chạy hàng ngày)
    // ------------------------------------------------------------------
    var schedulerJobKey = new JobKey(nameof(ReminderSchedulerJob));
    q.AddJob<ReminderSchedulerJob>(opts => opts.WithIdentity(schedulerJobKey));
    
    q.AddTrigger(opts => opts
        .ForJob(schedulerJobKey)
        .WithIdentity("DynamicReminder-Scheduler-Trigger")
        // .WithCronSchedule("0 30 1 * * ?")); // 01:30 AM hàng ngày
        .StartNow() // Bắt đầu ngay khi Service chạy
        .WithSimpleSchedule(x => x
        .WithRepeatCount(0) // Chỉ chạy 1 lần
        .WithIntervalInSeconds(5))); // Sau 5 giây

    // ------------------------------------------------------------------
    // C. CHILD JOB (DYNAMIC - Job Nhắc Nộp Chỉ Số)
    // ------------------------------------------------------------------
    q.AddJob<ReadingReminderJob>(opts => opts.WithIdentity(nameof(ReadingReminderJob)).StoreDurably());
});

// Thêm dịch vụ Quartz để chạy Scheduler
builder.Services.AddQuartzHostedService(options =>
{
    options.WaitForJobsToComplete = true; 
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
builder.Services.AddAuthorization(); // Add Authorization

// Register Repositories (I...Repository)
builder.Services.AddScoped<IReadingCycleRepository, ReadingCycleRepository>();
builder.Services.AddScoped<IMonthlyReadingRepository, MonthlyReadingRepository>();

// Register Services & HttpClients (I...Service)
builder.Services.AddScoped<IS3Service, S3Service>();
builder.Services.AddScoped<IMonthlyReadingService, MonthlyReadingService>();
builder.Services.AddScoped<IReadingCycleService, ReadingCycleService>();

builder.Services.AddScoped<IMessageProducer, RabbitMQProducer>();

// Register IUserService with configured HttpClient
builder.Services.AddHttpClient<IUserService, UserService>(client => 
{ 
    client.BaseAddress = new Uri(builder.Configuration["ServiceUrls:AAService"]); 
});

// Register HttpClients (I...HttpClient)
builder.Services.AddHttpClient<IInvoiceHttpClient, InvoiceHttpClient>();
builder.Services.AddHttpClient<IPropertyService, PropertyService>();

// Register HttpClient for AA service
builder.Services.AddHttpClient("AA", client => 
{ 
    client.BaseAddress = new Uri(builder.Configuration["ServiceUrls:AAService"]); 
});

// Configure Controllers, Swagger/OpenAPI (Usually placed at the end of Services section)
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Quartz for scheduled jobs
builder.Services.AddQuartz(q =>
{
    var jobKey = new JobKey("AutoInvoiceJob");
    q.AddJob<AutoInvoiceJob>(opts => opts.WithIdentity(jobKey));

    q.AddTrigger(opts => opts
        .ForJob(jobKey)
        .WithIdentity("AutoInvoiceTrigger")
        .WithCronSchedule("0 0 0 25 * ?")); // Chạy vào ngày 25 hàng tháng lúc 00:00
});

builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

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


// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseRouting();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();