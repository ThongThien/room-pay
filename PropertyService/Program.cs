using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PropertyService.Data;
using PropertyService.Models;
using PropertyService.Repositories;
using PropertyService.Services;
using PropertyService.Services.Clients;
using PropertyService.Services.Interfaces;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// =====================
// 1. DATABASE
// =====================
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))
    )
);

// =====================
// 2. CORS (AN TOÀN, DEV DỄ CHẠY)
// =====================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// =====================
// 3. JWT AUTHENTICATION
// =====================
var jwtSettings = builder.Configuration.GetSection("JwtSettings");

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
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSettings["Secret"]!)
            )
        };
    });

// =====================
// 4. SWAGGER
// =====================
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Property Service API",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập token theo format: Bearer {token}"
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

// =====================
// 5. DEPENDENCY INJECTION
// =====================
builder.Services.AddAutoMapper(typeof(Program));

builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IContractService, ContractService>();
builder.Services.AddScoped<IHouseService, HouseService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IPropertyQueryService, PropertyQueryService>();

// HTTP Client → AA Service
builder.Services.AddHttpClient<IUserServiceClient, UserServiceClient>(client =>
{
    var aaServiceUrl = builder.Configuration["ServiceUrls:AA"];

    if (string.IsNullOrEmpty(aaServiceUrl))
    {
        aaServiceUrl = "http://localhost:5001"; // fallback dev
    }

    client.BaseAddress = new Uri(aaServiceUrl);
});

builder.Services.AddControllers();

var app = builder.Build();

// =====================
// 6. PIPELINE
// =====================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
