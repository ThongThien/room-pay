using System.Text.Json.Serialization;

namespace PaymentService.Models;

/// <summary>
/// Webhook data từ SePay khi có giao dịch ngân hàng
/// Tham khảo: https://docs.sepay.vn/tich-hop-webhooks.html
/// </summary>
public class SePayWebhookData
{
    /// <summary>
    /// ID giao dịch trên SePay
    /// </summary>
    [JsonPropertyName("id")]
    public int Id { get; set; }

    /// <summary>
    /// Brand name của ngân hàng (Vietcombank, MBBank, etc.)
    /// </summary>
    [JsonPropertyName("gateway")]
    public string Gateway { get; set; } = string.Empty;

    /// <summary>
    /// Thời gian xảy ra giao dịch phía ngân hàng (format: yyyy-MM-dd HH:mm:ss)
    /// </summary>
    [JsonPropertyName("transactionDate")]
    public string TransactionDate { get; set; } = string.Empty;

    /// <summary>
    /// Số tài khoản ngân hàng
    /// </summary>
    [JsonPropertyName("accountNumber")]
    public string AccountNumber { get; set; } = string.Empty;

    /// <summary>
    /// Tài khoản ngân hàng phụ (tài khoản định danh)
    /// </summary>
    [JsonPropertyName("subAccount")]
    public string? SubAccount { get; set; }

    /// <summary>
    /// Mã code thanh toán (sepay tự nhận diện dựa vào cấu hình)
    /// </summary>
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    /// <summary>
    /// Nội dung chuyển khoản - QUAN TRỌNG để extract mã đơn hàng
    /// </summary>
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Loại giao dịch: "in" là tiền vào, "out" là tiền ra
    /// </summary>
    [JsonPropertyName("transferType")]
    public string TransferType { get; set; } = string.Empty;

    /// <summary>
    /// Số tiền giao dịch
    /// </summary>
    [JsonPropertyName("transferAmount")]
    public decimal TransferAmount { get; set; }

    /// <summary>
    /// Số dư tài khoản (lũy kế)
    /// </summary>
    [JsonPropertyName("accumulated")]
    public decimal Accumulated { get; set; }

    /// <summary>
    /// Mã tham chiếu (Reference Code) - VD: MBVCB.3278907687
    /// </summary>
    [JsonPropertyName("referenceCode")]
    public string ReferenceCode { get; set; } = string.Empty;

    /// <summary>
    /// Toàn bộ nội dung tin notify ngân hàng
    /// </summary>
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;
}
