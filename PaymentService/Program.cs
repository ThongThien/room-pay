using PaymentService.Models;
using PaymentService.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure SePay
builder.Services.Configure<SePayConfig>(
    builder.Configuration.GetSection("SePay"));

// Register HttpClient for SePayService with custom configuration
builder.Services.AddHttpClient<ISePayService, SePayService>();

// Register HttpClient for InvoiceServiceClient
builder.Services.AddHttpClient<IInvoiceServiceClient, InvoiceServiceClient>();

// Enable CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();
