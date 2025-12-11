using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PaymentService.Models;

/// <summary>
/// Entity để lưu thông tin giao dịch ngân hàng từ SePay webhook
/// Tương tự bảng tb_transactions trong hướng dẫn PHP
/// </summary>
[Table("Transactions")]
public class Transaction
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// ID giao dịch từ SePay (để tránh trùng lặp khi webhook bắn lại)
    /// </summary>
    [Required]
    public int SePayTransactionId { get; set; }

    /// <summary>
    /// Brand name ngân hàng (Vietcombank, MBBank, etc.)
    /// </summary>
    [MaxLength(100)]
    public string Gateway { get; set; } = string.Empty;

    /// <summary>
    /// Thời gian giao dịch tại ngân hàng
    /// </summary>
    public DateTime TransactionDate { get; set; }

    /// <summary>
    /// Số tài khoản ngân hàng
    /// </summary>
    [MaxLength(100)]
    public string AccountNumber { get; set; } = string.Empty;

    /// <summary>
    /// Tài khoản phụ/định danh
    /// </summary>
    [MaxLength(250)]
    public string? SubAccount { get; set; }

    /// <summary>
    /// Số tiền vào
    /// </summary>
    [Column(TypeName = "decimal(20,2)")]
    public decimal AmountIn { get; set; }

    /// <summary>
    /// Số tiền ra
    /// </summary>
    [Column(TypeName = "decimal(20,2)")]
    public decimal AmountOut { get; set; }

    /// <summary>
    /// Số dư tích lũy
    /// </summary>
    [Column(TypeName = "decimal(20,2)")]
    public decimal Accumulated { get; set; }

    /// <summary>
    /// Mã code thanh toán
    /// </summary>
    [MaxLength(250)]
    public string? Code { get; set; }

    /// <summary>
    /// Nội dung chuyển khoản
    /// </summary>
    public string TransactionContent { get; set; } = string.Empty;

    /// <summary>
    /// Mã tham chiếu (Reference Number)
    /// </summary>
    [MaxLength(255)]
    public string ReferenceNumber { get; set; } = string.Empty;

    /// <summary>
    /// Toàn bộ nội dung tin notify từ ngân hàng
    /// </summary>
    public string? Body { get; set; }

    /// <summary>
    /// Invoice Number được extract từ transaction content (deprecated)
    /// </summary>
    [MaxLength(100)]
    public string? InvoiceNumber { get; set; }

    /// <summary>
    /// Invoice ID được extract từ transaction content
    /// </summary>
    public int? InvoiceId { get; set; }

    /// <summary>
    /// Trạng thái xử lý: Pending, Processed, Failed
    /// </summary>
    [MaxLength(50)]
    public string ProcessingStatus { get; set; } = "Pending";

    /// <summary>
    /// Thời gian tạo bản ghi
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Ghi chú xử lý
    /// </summary>
    public string? ProcessingNote { get; set; }
}
