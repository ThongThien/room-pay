using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PropertyService.Data;
using System.Text;
using PropertyService.Services;
using PropertyService.Services.Interfaces;
using PropertyService.Repositories;
using PropertyService.Services.Clients;
using PropertyService.Models;
<<<<<<< HEAD
using Microsoft.OpenApi.Models;

=======
>>>>>>> origin/main
var builder = WebApplication.CreateBuilder(args);

// --- 1. Database ---
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    ));

<<<<<<< HEAD
// --- 2. CORS ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// --- 3. JWT Authentication ---
var jwtSettings = builder.Configuration.GetSection("JwtSettings");

=======
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin() // Cho phép mọi nguồn (localhost:3000, mobile, v.v.)
                  .AllowAnyMethod() // GET, POST, PUT, DELETE...
                  .AllowAnyHeader(); // Authorization, Content-Type...
        });
});

// 2. JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
>>>>>>> origin/main
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Secret"]!))
        };
    });

// --- 4. Swagger Config ---
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Property Service API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập token vào: Bearer {token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference 
                { 
                    Type = ReferenceType.SecurityScheme, 
                    Id = "Bearer" 
                }
            },
            Array.Empty<string>()
        }
    });
});

// --- 5. Dependency Injection ---
builder.Services.AddAutoMapper(typeof(Program));

builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));

builder.Services.AddScoped<IContractService, ContractService>();
builder.Services.AddScoped<IHouseService, HouseService>();
builder.Services.AddScoped<IRoomService, RoomService>();
<<<<<<< HEAD
builder.Services.AddScoped<IPropertyQueryService, PropertyQueryService>();

// --- 6. HTTP Client đến AA Service ---
builder.Services.AddHttpClient<IUserServiceClient, UserServiceClient>(client =>
{
    var aaServiceUrl = builder.Configuration["ServiceUrls:AA"];

    if (string.IsNullOrEmpty(aaServiceUrl))
    {
        aaServiceUrl = "http://localhost:5001"; // fallback
    }

=======
builder.Services.AddScoped<IGenericRepository<House>, GenericRepository<House>>();
builder.Services.AddScoped<IGenericRepository<Room>, GenericRepository<Room>>();
builder.Services.AddScoped<IPropertyQueryService, PropertyQueryService>();
// Trong PropertyService/Program.cs (hoặc Startup.cs)

builder.Services.AddHttpClient<IUserServiceClient, UserServiceClient>(client =>
{
    //  SỬA LỖI: Đổi key từ "AAService" thành "AA" 
    var aaServiceUrl = builder.Configuration["ServiceUrls:AA"]; // <--- ĐÃ SỬA THÀNH "AA"
    
    if (string.IsNullOrEmpty(aaServiceUrl))
    {
        // Bạn có thể cần kiểm tra cấu hình lại
        throw new InvalidOperationException("AA Service URL not configured in appsettings.");
    }
>>>>>>> origin/main
    client.BaseAddress = new Uri(aaServiceUrl);
});

builder.Services.AddControllers();

var app = builder.Build();

<<<<<<< HEAD
// --- PIPELINE ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 1. CORS
app.UseCors("AllowAll");

// 2. Authentication & Authorization
=======
// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowAll");

>>>>>>> origin/main
app.UseAuthentication();
app.UseAuthorization();

// 3. Map Controllers
app.MapControllers();

app.Run();
