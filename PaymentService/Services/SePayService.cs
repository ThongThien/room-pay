using Microsoft.Extensions.Options;
using PaymentService.Models;
using System.Web;

namespace PaymentService.Services;

/// <summary>
/// Service để tạo QR code thanh toán với SePay (VietQR)
/// Không cần gọi API, chỉ cần tạo URL QR code
/// </summary>
public class SePayService : ISePayService
{
    private readonly SePayConfig _config;
    private readonly ILogger<SePayService> _logger;
    private const string QR_BASE_URL = "https://qr.sepay.vn/img";

    public SePayService(
        IOptions<SePayConfig> config,
        ILogger<SePayService> logger)
    {
        _config = config.Value;
        _logger = logger;
    }

    /// <summary>
    /// Tạo thông tin checkout với QR code
    /// Không cần gọi API, chỉ tạo URL QR code từ SePay
    /// </summary>
    public Task<(bool Success, string Message, string? CheckoutUrl, string? OrderId, string? QrCode)> CreateCheckoutAsync(
        string invoiceNumber,
        decimal amount,
        string description,
        Dictionary<string, string>? customData = null)
    {
        try
        {
            // Validate config
            if (string.IsNullOrEmpty(_config.BankCode) || 
                string.IsNullOrEmpty(_config.AccountNumber))
            {
                return Task.FromResult<(bool, string, string?, string?, string?)>(
                    (false, "SePay configuration is incomplete", null, null, null));
            }

            // Tạo nội dung chuyển khoản
            // Format: Description only (invoice number sẽ được parse từ description)
            var transferContent = !string.IsNullOrEmpty(description) 
                ? description
                : invoiceNumber;

            // Tạo QR code URL theo format của SePay
            // https://qr.sepay.vn/img?bank=BANK&acc=ACCOUNT&amount=AMOUNT&des=DESCRIPTION&template=compact
            var qrUrl = BuildQrCodeUrl(
                _config.BankCode,
                _config.AccountNumber,
                amount,
                transferContent,
                template: "compact"
            );

            _logger.LogInformation(
                "Created QR code for invoice {InvoiceNumber}, Amount: {Amount}, QR URL: {QrUrl}",
                invoiceNumber, amount, qrUrl);

            return Task.FromResult<(bool, string, string?, string?, string?)>(
                (true, "QR code generated successfully", null, invoiceNumber, qrUrl));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating QR code");
            return Task.FromResult<(bool, string, string?, string?, string?)>(
                (false, $"Error: {ex.Message}", null, null, null));
        }
    }

    /// <summary>
    /// Tạo URL QR code từ SePay
    /// </summary>
    private string BuildQrCodeUrl(
        string bankCode,
        string accountNumber,
        decimal amount,
        string description,
        string template = "compact")
    {
        var queryParams = HttpUtility.ParseQueryString(string.Empty);
        queryParams["bank"] = bankCode;
        queryParams["acc"] = accountNumber;
        queryParams["amount"] = ((int)amount).ToString(); // SePay không hỗ trợ số thập phân
        queryParams["des"] = description;
        queryParams["template"] = template;

        return $"{QR_BASE_URL}?{queryParams}";
    }

    /// <summary>
    /// Verify webhook signature (nếu có cấu hình)
    /// Hiện tại để đơn giản, chưa implement signature verification
    /// </summary>
    public bool VerifyIpnSignature(string receivedSignature, Dictionary<string, string> data)
    {
        // TODO: Implement signature verification nếu cần
        // Tham khảo: https://docs.sepay.vn/tich-hop-webhooks.html
        _logger.LogWarning("Signature verification not implemented yet");
        return true; // Tạm thời accept tất cả webhook
    }
}
