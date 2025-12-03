using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaymentService.Data;
using PaymentService.DTOs;
using PaymentService.Models;
using PaymentService.Services;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace PaymentService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly PaymentDbContext _dbContext;
    private readonly ISePayService _sePayService;
    private readonly IInvoiceServiceClient _invoiceServiceClient;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(
        PaymentDbContext dbContext,
        ISePayService sePayService, 
        IInvoiceServiceClient invoiceServiceClient,
        ILogger<PaymentController> logger)
    {
        _dbContext = dbContext;
        _sePayService = sePayService;
        _invoiceServiceClient = invoiceServiceClient;
        _logger = logger;
    }

    /// <summary>
    /// Tạo checkout payment với SePay
    /// </summary>
    [HttpPost("create-checkout")]
    public async Task<ActionResult<PaymentResponse>> CreateCheckout([FromBody] CreatePaymentRequest request)
    {
        if (request.Amount <= 0)
        {
            return BadRequest(new PaymentResponse
            {
                Success = false,
                Message = "Amount must be greater than 0"
            });
        }

        // Ưu tiên InvoiceId, fallback sang InvoiceNumber
        string invoiceRef;
        if (request.InvoiceId.HasValue)
        {
            invoiceRef = $"INV{request.InvoiceId.Value}";
        }
        else if (!string.IsNullOrEmpty(request.InvoiceNumber))
        {
            invoiceRef = request.InvoiceNumber;
        }
        else
        {
            return BadRequest(new PaymentResponse
            {
                Success = false,
                Message = "Either InvoiceId or InvoiceNumber is required"
            });
        }

        var (success, message, checkoutUrl, orderId, qrCode) = await _sePayService.CreateCheckoutAsync(
            invoiceRef,
            request.Amount,
            request.Description,
            request.CustomData
        );

        return new PaymentResponse
        {
            Success = success,
            Message = message,
            CheckoutUrl = checkoutUrl,
            OrderId = orderId,
            QrCode = qrCode
        };
    }

    /// <summary>
    /// Callback khi thanh toán thành công
    /// </summary>
    [HttpGet("success")]
    public IActionResult PaymentSuccess([FromQuery] string? orderId, [FromQuery] string? invoiceNumber)
    {
        _logger.LogInformation("Payment Success - OrderId: {OrderId}, InvoiceNumber: {InvoiceNumber}", 
            orderId, invoiceNumber);

        // Chuyển hướng về trang success của frontend hoặc trả về view
        return Ok(new
        {
            Status = "success",
            Message = "Payment completed successfully",
            OrderId = orderId,
            InvoiceNumber = invoiceNumber
        });
    }

    /// <summary>
    /// Callback khi thanh toán thất bại
    /// </summary>
    [HttpGet("error")]
    public IActionResult PaymentError([FromQuery] string? orderId, [FromQuery] string? message)
    {
        _logger.LogWarning("Payment Error - OrderId: {OrderId}, Message: {Message}", orderId, message);

        return Ok(new
        {
            Status = "error",
            Message = message ?? "Payment failed",
            OrderId = orderId
        });
    }

    /// <summary>
    /// Callback khi người dùng hủy thanh toán
    /// </summary>
    [HttpGet("cancel")]
    public IActionResult PaymentCancel([FromQuery] string? orderId)
    {
        _logger.LogInformation("Payment Cancelled - OrderId: {OrderId}", orderId);

        return Ok(new
        {
            Status = "cancelled",
            Message = "Payment was cancelled by user",
            OrderId = orderId
        });
    }

    /// <summary>
    /// Webhook từ SePay khi có giao dịch ngân hàng
    /// Đây là endpoint QUAN TRỌNG NHẤT - SePay sẽ POST dữ liệu giao dịch đến đây
    /// Tham khảo: https://sepay.vn/lap-trinh-cong-thanh-toan.html
    /// </summary>
    [HttpPost("webhook")]
    public async Task<IActionResult> SePayWebhook()
    {
        try
        {
            // Đọc raw body để log và xử lý
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();
            
            _logger.LogInformation("=== SePay Webhook Received ===");
            _logger.LogInformation("Raw Body: {Body}", body);

            // Deserialize webhook data
            var webhookData = JsonSerializer.Deserialize<SePayWebhookData>(
                body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (webhookData == null)
            {
                _logger.LogWarning("Failed to deserialize webhook data");
                return Ok(new { success = false, message = "Invalid data format" });
            }

            _logger.LogInformation(
                "Webhook Data - ID: {Id}, Gateway: {Gateway}, Amount: {Amount}, Content: {Content}, TransferType: {TransferType}",
                webhookData.Id,
                webhookData.Gateway,
                webhookData.TransferAmount,
                webhookData.Content,
                webhookData.TransferType
            );

            // Kiểm tra xem giao dịch đã được xử lý chưa (tránh trùng lặp khi webhook retry)
            var existingTransaction = await _dbContext.Transactions
                .FirstOrDefaultAsync(t => t.SePayTransactionId == webhookData.Id);

            if (existingTransaction != null)
            {
                _logger.LogInformation(
                    "Transaction ID {TransactionId} already processed. Skipping.",
                    webhookData.Id);
                return Ok(new { success = true, message = "Transaction already processed" });
            }

            // Chỉ xử lý giao dịch tiền VÀO
            if (webhookData.TransferType != "in")
            {
                _logger.LogInformation("Transfer type is '{TransferType}', not processing", 
                    webhookData.TransferType);
                return Ok(new { success = true, message = "Only process incoming transfers" });
            }

            // Tạo transaction entity để lưu vào DB
            var transaction = new Transaction
            {
                SePayTransactionId = webhookData.Id,
                Gateway = webhookData.Gateway,
                TransactionDate = ParseTransactionDate(webhookData.TransactionDate),
                AccountNumber = webhookData.AccountNumber,
                SubAccount = webhookData.SubAccount,
                AmountIn = webhookData.TransferType == "in" ? webhookData.TransferAmount : 0,
                AmountOut = webhookData.TransferType == "out" ? webhookData.TransferAmount : 0,
                Accumulated = webhookData.Accumulated,
                Code = webhookData.Code,
                TransactionContent = webhookData.Content,
                ReferenceNumber = webhookData.ReferenceCode,
                Body = webhookData.Description,
                ProcessingStatus = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            // Extract invoice ID hoặc invoice number từ nội dung thanh toán
            // Ưu tiên: INV42 (ID) > INV-001 (Number)
            var invoiceId = ExtractInvoiceId(webhookData.Content);
            var invoiceNumber = invoiceId.HasValue ? null : ExtractInvoiceNumber(webhookData.Content);
            
            if (!invoiceId.HasValue && string.IsNullOrEmpty(invoiceNumber))
            {
                _logger.LogWarning(
                    "Could not extract invoice ID or number from content: {Content}",
                    webhookData.Content);
                
                transaction.ProcessingStatus = "Failed";
                transaction.ProcessingNote = "Could not extract invoice ID/number from transaction content";
                
                await _dbContext.Transactions.AddAsync(transaction);
                await _dbContext.SaveChangesAsync();
                
                return Ok(new 
                { 
                    success = false, 
                    message = "Invoice ID/number not found in transaction content" 
                });
            }

            transaction.InvoiceId = invoiceId;
            transaction.InvoiceNumber = invoiceNumber;
            
            if (invoiceId.HasValue)
            {
                _logger.LogInformation("Extracted Invoice ID: {InvoiceId}", invoiceId.Value);
            }
            else
            {
                _logger.LogInformation("Extracted Invoice Number: {InvoiceNumber}", invoiceNumber);
            }

            // Lưu transaction vào database
            await _dbContext.Transactions.AddAsync(transaction);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Transaction saved to database with ID: {Id}", transaction.Id);

            // Tìm invoice và cập nhật trạng thái thanh toán
            InvoiceDto? invoice = null;
            string invoiceRef = "";
            
            if (invoiceId.HasValue)
            {
                invoice = await _invoiceServiceClient.GetInvoiceByIdAsync(invoiceId.Value);
                invoiceRef = $"ID {invoiceId.Value}";
            }
            else if (!string.IsNullOrEmpty(invoiceNumber))
            {
                invoice = await _invoiceServiceClient.GetInvoiceByNumberAsync(invoiceNumber);
                invoiceRef = invoiceNumber;
            }
            
            if (invoice == null)
            {
                _logger.LogWarning(
                    "Invoice {InvoiceRef} not found in InvoiceService", 
                    invoiceRef);
                
                transaction.ProcessingStatus = "Failed";
                transaction.ProcessingNote = $"Invoice {invoiceRef} not found";
                await _dbContext.SaveChangesAsync();
                
                return Ok(new 
                { 
                    success = false, 
                    message = $"Invoice {invoiceRef} not found" 
                });
            }

            // Kiểm tra số tiền có khớp không (cho phép sai lệch nhỏ do làm tròn)
            var amountDifference = Math.Abs(invoice.TotalAmount - webhookData.TransferAmount);
            if (amountDifference > 1) // Cho phép sai lệch 1 đồng
            {
                _logger.LogWarning(
                    "Amount mismatch - Invoice: {InvoiceAmount}, Transaction: {TransactionAmount}",
                    invoice.TotalAmount,
                    webhookData.TransferAmount);
                
                transaction.ProcessingStatus = "Failed";
                transaction.ProcessingNote = $"Amount mismatch: Invoice={invoice.TotalAmount}, Transaction={webhookData.TransferAmount}";
                await _dbContext.SaveChangesAsync();
                
                return Ok(new 
                { 
                    success = false, 
                    message = "Payment amount does not match invoice amount" 
                });
            }

            // Kiểm tra invoice đã được thanh toán chưa
            if (invoice.Status == "Paid")
            {
                _logger.LogInformation(
                    "Invoice {InvoiceRef} is already paid. Marking transaction as processed.",
                    invoiceRef);
                
                transaction.ProcessingStatus = "Processed";
                transaction.ProcessingNote = "Invoice already marked as paid";
                await _dbContext.SaveChangesAsync();
                
                return Ok(new { success = true, message = "Invoice already paid" });
            }

            // Cập nhật invoice thành Paid
            bool updateSuccess;
            if (invoiceId.HasValue)
            {
                updateSuccess = await _invoiceServiceClient.MarkInvoiceAsPaidByIdAsync(
                    invoiceId.Value,
                    webhookData.ReferenceCode,
                    webhookData.Gateway
                );
            }
            else
            {
                updateSuccess = await _invoiceServiceClient.MarkInvoiceAsPaidAsync(
                    invoiceNumber!,
                    webhookData.ReferenceCode,
                    webhookData.Gateway
                );
            }

            if (updateSuccess)
            {
                _logger.LogInformation(
                    "Successfully marked invoice {InvoiceRef} as PAID. Transaction: {ReferenceCode}",
                    invoiceRef,
                    webhookData.ReferenceCode);
                
                transaction.ProcessingStatus = "Processed";
                transaction.ProcessingNote = "Invoice marked as paid successfully";
                await _dbContext.SaveChangesAsync();
                
                return Ok(new { success = true });
            }
            else
            {
                _logger.LogError(
                    "Failed to update invoice {InvoiceRef} status to Paid",
                    invoiceRef);
                
                transaction.ProcessingStatus = "Failed";
                transaction.ProcessingNote = "Failed to update invoice status in InvoiceService";
                await _dbContext.SaveChangesAsync();
                
                // Vẫn trả về success để SePay không retry
                return Ok(new 
                { 
                    success = false, 
                    message = "Failed to update invoice status" 
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing SePay webhook");
            
            // Trả về 200 OK để tránh SePay retry liên tục
            return Ok(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Extract Invoice ID từ transaction content
    /// Format: INV42, INV123 (không có dấu gạch ngang)
    /// </summary>
    private int? ExtractInvoiceId(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return null;

        // Pattern: INV + số thuần (không có dấu gạch ngang)
        // INV42, INV123
        var match = Regex.Match(content, @"\bINV(\d+)(?![-_])\b", RegexOptions.IgnoreCase);
        if (match.Success && int.TryParse(match.Groups[1].Value, out var id))
        {
            return id;
        }

        return null;
    }

    /// <summary>
    /// Extract Invoice Number từ transaction content
    /// Hỗ trợ nhiều format: INV-123, INVOICE-456, DH30, etc.
    /// </summary>
    private string? ExtractInvoiceNumber(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return null;

        // Pattern 1: INV + số với dấu gạch ngang (INV-001, INV-123)
        var match = Regex.Match(content, @"\bINV-?(\d+)\b", RegexOptions.IgnoreCase);
        if (match.Success)
            return "INV-" + match.Groups[1].Value.PadLeft(3, '0');

        // Pattern 2: INVOICE + số
        match = Regex.Match(content, @"\bINVOICE[-_]?(\d+)\b", RegexOptions.IgnoreCase);
        if (match.Success)
            return "INV-" + match.Groups[1].Value.PadLeft(3, '0');

        // Pattern 3: DH + số (như ví dụ trong docs: DH30)
        match = Regex.Match(content, @"\bDH(\d+)\b", RegexOptions.IgnoreCase);
        if (match.Success)
            return "INV-" + match.Groups[1].Value.PadLeft(3, '0');

        return null;
    }

    /// <summary>
    /// Parse transaction date từ string sang DateTime
    /// Format từ SePay: "2024-07-25 14:02:37"
    /// </summary>
    private DateTime ParseTransactionDate(string dateString)
    {
        if (DateTime.TryParse(dateString, out var date))
            return date;
        
        return DateTime.UtcNow;
    }

    /// <summary>
    /// Kiểm tra trạng thái thanh toán của invoice
    /// Frontend có thể gọi API này định kỳ để check payment status (tương tự Ajax trong docs)
    /// </summary>
    [HttpGet("check-status/{invoiceNumber}")]
    public async Task<IActionResult> CheckPaymentStatus(string invoiceNumber)
    {
        try
        {
            var invoice = await _invoiceServiceClient.GetInvoiceByNumberAsync(invoiceNumber);
            
            if (invoice == null)
            {
                return NotFound(new 
                { 
                    paymentStatus = "not_found",
                    message = "Invoice not found" 
                });
            }

            return Ok(new 
            { 
                paymentStatus = invoice.Status,
                invoiceNumber = invoice.InvoiceNumber,
                amount = invoice.TotalAmount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking payment status for invoice {InvoiceNumber}", 
                invoiceNumber);
            return StatusCode(500, new 
            { 
                paymentStatus = "error",
                message = ex.Message 
            });
        }
    }

    /// <summary>
    /// API test để kiểm tra service hoạt động
    /// </summary>
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new
        {
            Status = "healthy",
            Service = "PaymentService",
            Timestamp = DateTime.UtcNow
        });
    }
}
