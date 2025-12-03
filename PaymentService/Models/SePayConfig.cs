namespace PaymentService.Models;

/// <summary>
/// Configuration cho SePay payment gateway
/// Approach: Sử dụng VietQR + Webhook (không cần API checkout)
/// </summary>
public class SePayConfig
{
    /// <summary>
    /// Mã ngân hàng (MBBank, VCB, Vietcombank, etc.)
    /// Xem danh sách tại: https://qr.sepay.vn/banks.json
    /// </summary>
    public string BankCode { get; set; } = string.Empty;

    /// <summary>
    /// Số tài khoản ngân hàng nhận tiền
    /// </summary>
    public string AccountNumber { get; set; } = string.Empty;

    /// <summary>
    /// Tên chủ tài khoản
    /// </summary>
    public string AccountName { get; set; } = string.Empty;

    /// <summary>
    /// URL webhook để nhận thông báo từ SePay
    /// Phải là URL public (dùng ngrok cho development)
    /// </summary>
    public string WebhookUrl { get; set; } = string.Empty;
}
