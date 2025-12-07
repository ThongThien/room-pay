using ReadingService.Data;
using Microsoft.EntityFrameworkCore;
using ReadingService.Services;
using ReadingService.Features.MonthlyReading;
using ReadingService.Features.ReadingCycle;
using Amazon.S3;
using Amazon.Runtime;
using Amazon;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ReadingService.Repositories.Interfaces;
using ReadingService.Repositories.Implementations;
using ReadingService.Features.User;
using ReadingService.Features.Property;
var builder = WebApplication.CreateBuilder(args);

// builder.Services.AddCors(options =>
// {
//     options.AddPolicy("AllowFE", policy =>
//     {
//         policy.WithOrigins(allowedOrigins)
//               .AllowAnyHeader()
//               .AllowAnyMethod()
//               .AllowCredentials();
//     });
// });

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))));

// Add JWT Authentication
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

builder.Services.AddAuthorization();

// Add AWS S3 Service with credentials from configuration
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

builder.Services.AddScoped<IS3Service, S3Service>();

// Add HttpClient for InvoiceService
builder.Services.AddHttpClient<IInvoiceHttpClient, InvoiceHttpClient>();

// Add MonthlyReading Service
builder.Services.AddScoped<IMonthlyReadingService, MonthlyReadingService>();

// Add ReadingCycle Service
builder.Services.AddScoped<IReadingCycleService, ReadingCycleService>();

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddHttpClient<IPropertyService, PropertyService>();

// Add Controllers
builder.Services.AddControllers();

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<IReadingCycleRepository, ReadingCycleRepository>();
builder.Services.AddScoped<IMonthlyReadingRepository, MonthlyReadingRepository>();

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
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowFE");
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
