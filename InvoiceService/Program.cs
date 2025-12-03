using InvoiceService.Data;
using InvoiceService.Features.Invoice;
using InvoiceService.Features.Pricing;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

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

// Register services
builder.Services.AddScoped<IInvoiceService, InvoiceServiceImpl>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddHttpClient<InvoiceService.Services.IUserServiceClient, InvoiceService.Services.UserServiceClient>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
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

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
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
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();