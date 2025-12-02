using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PaymentService.Models;

namespace PaymentService.Services;

public class SePayService : ISePayService
{
    private readonly SePayConfig _config;
    private readonly HttpClient _httpClient;
    private readonly ILogger<SePayService> _logger;

    public SePayService(
        IOptions<SePayConfig> config,
        HttpClient httpClient,
        ILogger<SePayService> logger)
    {
        _config = config.Value;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<(bool Success, string Message, string? CheckoutUrl, string? OrderId, string? QrCode)> CreateCheckoutAsync(
        string invoiceNumber,
        decimal amount,
        string description,
        Dictionary<string, string>? customData = null)
    {
        try
        {
            // Tạo checkout request
            var checkoutRequest = new SePayCheckoutRequest
            {
                MerchantId = _config.MerchantId,
                OrderCurrency = "VND",
                OrderInvoiceNumber = invoiceNumber,
                OrderAmount = amount,
                Operation = "PURCHASE",
                OrderDescription = description,
                SuccessUrl = _config.SuccessUrl,
                ErrorUrl = _config.ErrorUrl,
                CancelUrl = _config.CancelUrl,
                IpnUrl = _config.IpnUrl,
                CustomData = customData
            };

            // Tạo signature
            checkoutRequest.Signature = GenerateSignature(checkoutRequest);

            // Serialize request
            var jsonContent = JsonSerializer.Serialize(checkoutRequest, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            _logger.LogInformation("SePay Request: {Request}", jsonContent);

            // Tạo HTTP request với headers phù hợp
            var request = new HttpRequestMessage(HttpMethod.Post, _config.CheckoutUrl);
            
            // Set content
            request.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
            
            // Gửi request
            var response = await _httpClient.SendAsync(request);

            var responseContent = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("SePay Response Status: {Status}", response.StatusCode);
            _logger.LogInformation("SePay Response: {Response}", responseContent);

            if (response.IsSuccessStatusCode)
            {
                var checkoutResponse = JsonSerializer.Deserialize<SePayCheckoutResponse>(
                    responseContent,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

                if (checkoutResponse?.Status == "success")
                {
                    return (true, "Checkout created successfully",
                        checkoutResponse.Data?.CheckoutUrl,
                        checkoutResponse.Data?.OrderId,
                        checkoutResponse.Data?.QrCode);
                }

                return (false, checkoutResponse?.Message ?? "Unknown error", null, null, null);
            }

            return (false, $"HTTP Error: {response.StatusCode}", null, null, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating SePay checkout");
            return (false, $"Error: {ex.Message}", null, null, null);
        }
    }

    public bool VerifyIpnSignature(string receivedSignature, Dictionary<string, string> data)
    {
        try
        {
            // Sắp xếp các key theo thứ tự alphabet
            var sortedData = data.OrderBy(kvp => kvp.Key).ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

            // Tạo chuỗi để ký
            var signString = string.Join("&", sortedData.Select(kvp => $"{kvp.Key}={kvp.Value}"));
            signString += $"&secret_key={_config.SecretKey}";

            // Tạo signature bằng SHA256
            var signature = ComputeSha256Hash(signString);

            return signature.Equals(receivedSignature, StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying IPN signature");
            return false;
        }
    }

    private string GenerateSignature(SePayCheckoutRequest request)
    {
        // Tạo dictionary từ request (không bao gồm signature và custom_data)
        var data = new Dictionary<string, string>
        {
            { "merchant_id", request.MerchantId },
            { "order_currency", request.OrderCurrency },
            { "order_invoice_number", request.OrderInvoiceNumber },
            { "order_amount", request.OrderAmount.ToString("F2") },
            { "operation", request.Operation },
            { "order_description", request.OrderDescription },
            { "success_url", request.SuccessUrl },
            { "error_url", request.ErrorUrl },
            { "cancel_url", request.CancelUrl },
            { "ipn_url", request.IpnUrl }
        };

        // Sắp xếp theo thứ tự alphabet
        var sortedData = data.OrderBy(kvp => kvp.Key).ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

        // Tạo chuỗi để ký
        var signString = string.Join("&", sortedData.Select(kvp => $"{kvp.Key}={kvp.Value}"));
        signString += $"&secret_key={_config.SecretKey}";

        _logger.LogDebug("Sign String: {SignString}", signString);

        // Hash bằng SHA256
        return ComputeSha256Hash(signString);
    }

    private static string ComputeSha256Hash(string input)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLower();
    }
}
