// InvoiceService/Controllers/TenantInvoicesController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Security.Claims;
using System.Net;
using InvoiceService.Features.Invoice.DTOs.Invoice; 
using InvoiceService.Features.Invoice;
[ApiController]
[Route("api/tenant/invoices")] 
[Authorize(Roles = "Tenant")]
public class TenantInvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public TenantInvoicesController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    // Helper để lấy Tenant ID từ JWT
    private Guid GetUserIdGuid() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException("User ID not found in token."));
    
    //  MỤC 4: Hóa đơn cần thanh toán VÀ Tổng tiền
    [HttpGet("unpaid-invoices")] // GET api/tenant/invoices/unpaid-invoices
    [ProducesResponseType(typeof(UnpaidInvoicesResponseDto), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.Unauthorized)]
    public async Task<IActionResult> GetUnpaidInvoices()
    {
        try
        {
            Guid tenantId = GetUserIdGuid();
            
            var response = await _invoiceService.GetUnpaidInvoicesByTenantIdAsync(tenantId);
            
            // Trả về 200 OK ngay cả khi danh sách trống
            return Ok(new 
            { 
                success = true, 
                message = "Unpaid invoices retrieved successfully.", 
                data = response 
            });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            // Log lỗi (ví dụ: Console.WriteLine(ex.Message);)
            return StatusCode(500, new { success = false, message = "Internal server error." });
        }
    }
}