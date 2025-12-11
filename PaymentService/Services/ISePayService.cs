namespace PaymentService.Services;

public interface ISePayService
{
    Task<(bool Success, string Message, string? CheckoutUrl, string? OrderId, string? QrCode)> CreateCheckoutAsync(
        string invoiceNumber,
        decimal amount,
        string description,
        Dictionary<string, string>? customData = null);

    bool VerifyIpnSignature(string receivedSignature, Dictionary<string, string> data);
}
