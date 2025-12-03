using System.Text;
using System.Text.Json;

namespace PaymentService.Services;

public class InvoiceServiceClient : IInvoiceServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<InvoiceServiceClient> _logger;
    private readonly string _invoiceServiceUrl;
    private readonly string _apiKey;

    public InvoiceServiceClient(
        HttpClient httpClient, 
        ILogger<InvoiceServiceClient> logger,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;
        _invoiceServiceUrl = configuration["InvoiceService:BaseUrl"] 
            ?? throw new InvalidOperationException("InvoiceService:BaseUrl not configured");
        _apiKey = configuration["InvoiceService:ApiKey"] 
            ?? throw new InvalidOperationException("InvoiceService:ApiKey not configured");
        
        // Add API key to default headers (must match InvoiceService header name)
        _httpClient.DefaultRequestHeaders.Add("X-Service-Api-Key", _apiKey);
    }

    public async Task<InvoiceDto?> GetInvoiceByNumberAsync(string invoiceNumber)
    {
        try
        {
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
            var invoice = await GetInvoiceByNumberAsync(invoiceNumber);
            if (invoice == null)
            {
                _logger.LogWarning("Invoice {InvoiceNumber} not found", invoiceNumber);
                return false;
            }

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

    public async Task<InvoiceDto?> GetInvoiceByIdAsync(int invoiceId)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"{_invoiceServiceUrl}/api/invoices/{invoiceId}");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to get invoice ID {InvoiceId}: {StatusCode}", 
                    invoiceId, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            var invoice = JsonSerializer.Deserialize<InvoiceDto>(content, 
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return invoice;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice ID {InvoiceId}", invoiceId);
            return null;
        }
    }

    public async Task<bool> MarkInvoiceAsPaidByIdAsync(
        int invoiceId, 
        string transactionId, 
        string paymentMethod)
    {
        try
        {
            var invoice = await GetInvoiceByIdAsync(invoiceId);
            if (invoice == null)
            {
                _logger.LogWarning("Invoice ID {InvoiceId} not found", invoiceId);
                return false;
            }

            var requestBody = new
            {
                transactionId = transactionId,
                paymentMethod = paymentMethod,
                paidDate = DateTime.UtcNow
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(
                $"{_invoiceServiceUrl}/api/invoices/{invoiceId}/mark-paid",
                content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation(
                    "Successfully marked invoice ID {InvoiceId} as paid. Transaction: {TransactionId}",
                    invoiceId, transactionId);
                return true;
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogWarning(
                "Failed to mark invoice ID {InvoiceId} as paid: {StatusCode} - {Error}",
                invoiceId, response.StatusCode, errorContent);
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Error marking invoice ID {InvoiceId} as paid", invoiceId);
            return false;
        }
    }
}
