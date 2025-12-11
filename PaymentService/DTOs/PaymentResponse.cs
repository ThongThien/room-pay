namespace PaymentService.DTOs;

public class PaymentResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? CheckoutUrl { get; set; }
    public string? OrderId { get; set; }
    public string? QrCode { get; set; }
}
