namespace PaymentService.Models;

public class SePayConfig
{
    public string Environment { get; set; } = string.Empty;
    public string MerchantId { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string CheckoutUrl { get; set; } = string.Empty;
    public string SuccessUrl { get; set; } = string.Empty;
    public string ErrorUrl { get; set; } = string.Empty;
    public string CancelUrl { get; set; } = string.Empty;
    public string IpnUrl { get; set; } = string.Empty;
}
