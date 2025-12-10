using NotificationService.Data;
using NotificationService.Repositories;
using NotificationService.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<NotificationDbContext>(options =>
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))));

// 2. Đăng ký Repository
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// 3. Đăng ký Services
builder.Services.AddTransient<IEmailService, EmailService>();

// 4. Đăng ký RabbitMQWorker (Hosted Service)
builder.Services.AddHostedService<RabbitMQWorker>();


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ... (UseSwagger, UseHttpsRedirection, etc.)

app.MapControllers();

app.Run();