using System.Text.Json.Serialization;

namespace PaymentService.Models;

public class SePayIpnNotification
{
    [JsonPropertyName("notification_type")]
    public string NotificationType { get; set; } = string.Empty;

    [JsonPropertyName("order")]
    public SePayOrder Order { get; set; } = new();

    [JsonPropertyName("transaction")]
    public SePayTransaction Transaction { get; set; } = new();

    [JsonPropertyName("signature")]
    public string Signature { get; set; } = string.Empty;
}

public class SePayOrder
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("order_id")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("order_status")]
    public string OrderStatus { get; set; } = string.Empty;

    [JsonPropertyName("order_currency")]
    public string OrderCurrency { get; set; } = string.Empty;

    [JsonPropertyName("order_amount")]
    public decimal OrderAmount { get; set; }

    [JsonPropertyName("order_invoice_number")]
    public string OrderInvoiceNumber { get; set; } = string.Empty;

    [JsonPropertyName("custom_data")]
    public object? CustomData { get; set; }

    [JsonPropertyName("user_agent")]
    public object? UserAgent { get; set; }

    [JsonPropertyName("ip_address")]
    public string? IpAddress { get; set; }

    [JsonPropertyName("order_description")]
    public string? OrderDescription { get; set; }
}

public class SePayTransaction
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("transaction_id")]
    public string TransactionId { get; set; } = string.Empty;

    [JsonPropertyName("transaction_status")]
    public string TransactionStatus { get; set; } = string.Empty;

    [JsonPropertyName("transaction_amount")]
    public decimal TransactionAmount { get; set; }

    [JsonPropertyName("payment_method")]
    public string PaymentMethod { get; set; } = string.Empty;

    [JsonPropertyName("payment_channel")]
    public string? PaymentChannel { get; set; }

    [JsonPropertyName("transaction_date")]
    public string? TransactionDate { get; set; }
}
