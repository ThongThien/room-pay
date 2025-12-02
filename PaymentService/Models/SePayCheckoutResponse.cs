using System.Text.Json.Serialization;

namespace PaymentService.Models;

public class SePayCheckoutResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("data")]
    public SePayCheckoutData? Data { get; set; }
}

public class SePayCheckoutData
{
    [JsonPropertyName("checkout_url")]
    public string CheckoutUrl { get; set; } = string.Empty;

    [JsonPropertyName("order_id")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("qr_code")]
    public string? QrCode { get; set; }
}
