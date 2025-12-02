using Microsoft.AspNetCore.Mvc;
using PaymentService.DTOs;
using PaymentService.Models;
using PaymentService.Services;
using System.Text.Json;

namespace PaymentService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly ISePayService _sePayService;
    private readonly IInvoiceServiceClient _invoiceServiceClient;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(
        ISePayService sePayService, 
        IInvoiceServiceClient invoiceServiceClient,
        ILogger<PaymentController> logger)
    {
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

        var (success, message, checkoutUrl, orderId, qrCode) = await _sePayService.CreateCheckoutAsync(
            request.InvoiceNumber,
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
    /// IPN Webhook - Nhận thông báo từ SePay khi có giao dịch
    /// Đây là endpoint QUAN TRỌNG NHẤT để cập nhật trạng thái đơn hàng
    /// </summary>
    [HttpPost("ipn")]
    public async Task<IActionResult> ReceiveIpn()
    {
        try
        {
            // Đọc raw body để log và debug
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();
            
            _logger.LogInformation("Received IPN Raw Body: {Body}", body);

            // Parse JSON
            var notification = JsonSerializer.Deserialize<SePayIpnNotification>(
                body,
                new JsonSerializerOptions 
                { 
                    PropertyNameCaseInsensitive = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase 
                });

            if (notification == null)
            {
                _logger.LogWarning("Failed to deserialize IPN notification");
                return Ok(new { success = false, message = "Invalid data format" });
            }

            _logger.LogInformation("IPN Notification Type: {Type}", notification.NotificationType);

            // TODO: Verify signature để đảm bảo request đến từ SePay
            // var isValid = _sePayService.VerifyIpnSignature(signature, data);
            // if (!isValid)
            // {
            //     _logger.LogWarning("Invalid IPN signature");
            //     return Ok(new { success = false, message = "Invalid signature" });
            // }

            // Xử lý theo notification type
            if (notification.NotificationType == "ORDER_PAID" || notification.NotificationType == "PAYMENT_SUCCESS")
            {
                var order = notification.Order;
                var transaction = notification.Transaction;

                _logger.LogInformation(
                    "Order Paid - InvoiceNumber: {InvoiceNumber}, Amount: {Amount}, Status: {Status}, TransactionId: {TransactionId}",
                    order.OrderInvoiceNumber,
                    order.OrderAmount,
                    order.OrderStatus,
                    transaction.TransactionId
                );

                // Cập nhật trạng thái hóa đơn trong InvoiceService
                // Tương tự code PHP mẫu: tìm invoice theo số hóa đơn và cập nhật status = "Paid"
                var updateSuccess = await _invoiceServiceClient.MarkInvoiceAsPaidAsync(
                    order.OrderInvoiceNumber,
                    transaction.TransactionId,
                    transaction.PaymentMethod
                );

                if (updateSuccess)
                {
                    _logger.LogInformation(
                        "Successfully updated invoice {InvoiceNumber} status to Paid",
                        order.OrderInvoiceNumber);
                }
                else
                {
                    _logger.LogWarning(
                        "Failed to update invoice {InvoiceNumber} status. Payment was successful but invoice update failed.",
                        order.OrderInvoiceNumber);
                }
            }

            // Phải trả về HTTP 200 để SePay biết đã nhận được IPN
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing IPN");
            // Vẫn trả về 200 để tránh SePay retry liên tục
            return Ok(new { success = false, message = ex.Message });
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
