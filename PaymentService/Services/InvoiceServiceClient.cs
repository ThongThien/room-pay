using System.Text;
using System.Text.Json;

namespace PaymentService.Services;

public class InvoiceServiceClient : IInvoiceServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<InvoiceServiceClient> _logger;
    private readonly string _invoiceServiceUrl;

    public InvoiceServiceClient(
        HttpClient httpClient, 
        ILogger<InvoiceServiceClient> logger,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _invoiceServiceUrl = configuration["InvoiceService:BaseUrl"] 
            ?? throw new InvalidOperationException("InvoiceService:BaseUrl not configured");
    }

    public async Task<InvoiceDto?> GetInvoiceByNumberAsync(string invoiceNumber)
    {
        try
        {
            // Tìm invoice theo invoice number
            // Giả sử InvoiceService có endpoint GET /api/invoices?invoiceNumber={number}
            var response = await _httpClient.GetAsync(
                $"{_invoiceServiceUrl}/api/invoices?invoiceNumber={invoiceNumber}");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get invoice {InvoiceNumber}: {StatusCode}", 
                    invoiceNumber, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var invoices = JsonSerializer.Deserialize<List<InvoiceDto>>(content, 
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return invoices?.FirstOrDefault();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice {InvoiceNumber}", invoiceNumber);
            return null;
        }
    }

    public async Task<bool> MarkInvoiceAsPaidAsync(
        string invoiceNumber, 
        string transactionId, 
        string paymentMethod)
    {
        try
        {
            // Bước 1: Tìm invoice theo invoice number
            var invoice = await GetInvoiceByNumberAsync(invoiceNumber);
            if (invoice == null)
            {
                _logger.LogWarning("Invoice {InvoiceNumber} not found", invoiceNumber);
                return false;
            }

            // Bước 2: Gọi API mark-paid với invoice ID
            var requestBody = new
            {
                transactionId = transactionId,
                paymentMethod = paymentMethod,
                paidDate = DateTime.UtcNow
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(
                $"{_invoiceServiceUrl}/api/invoices/{invoice.Id}/mark-paid",
                content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation(
                    "Successfully marked invoice {InvoiceNumber} (ID: {InvoiceId}) as paid. Transaction: {TransactionId}",
                    invoiceNumber, invoice.Id, transactionId);
                return true;
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogWarning(
                "Failed to mark invoice {InvoiceNumber} as paid: {StatusCode} - {Error}",
                invoiceNumber, response.StatusCode, errorContent);
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Error marking invoice {InvoiceNumber} as paid", invoiceNumber);
            return false;
        }
    }
}
