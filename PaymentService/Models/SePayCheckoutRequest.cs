using System.Text.Json.Serialization;

namespace PaymentService.Models;

public class SePayCheckoutRequest
{
    [JsonPropertyName("merchant_id")]
    public string MerchantId { get; set; } = string.Empty;

    [JsonPropertyName("order_currency")]
    public string OrderCurrency { get; set; } = "VND";

    [JsonPropertyName("order_invoice_number")]
    public string OrderInvoiceNumber { get; set; } = string.Empty;

    [JsonPropertyName("order_amount")]
    public decimal OrderAmount { get; set; }

    [JsonPropertyName("operation")]
    public string Operation { get; set; } = "PURCHASE";

    [JsonPropertyName("order_description")]
    public string OrderDescription { get; set; } = string.Empty;

    [JsonPropertyName("success_url")]
    public string SuccessUrl { get; set; } = string.Empty;

    [JsonPropertyName("error_url")]
    public string ErrorUrl { get; set; } = string.Empty;

    [JsonPropertyName("cancel_url")]
    public string CancelUrl { get; set; } = string.Empty;

    [JsonPropertyName("ipn_url")]
    public string IpnUrl { get; set; } = string.Empty;

    [JsonPropertyName("signature")]
    public string Signature { get; set; } = string.Empty;

    [JsonPropertyName("custom_data")]
    public Dictionary<string, string>? CustomData { get; set; }
}
