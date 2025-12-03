using InvoiceService.Models;
using InvoiceService.Features.Invoice;
using InvoiceService.Features.Invoice.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace InvoiceService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;
    private readonly ILogger<InvoicesController> _logger;

    public InvoicesController(IInvoiceService invoiceService, ILogger<InvoicesController> logger)
    {
        _invoiceService = invoiceService;
        _logger = logger;
    }

    /// <summary>
    /// Get all invoices for the current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvoiceResponse>>> GetAllInvoices()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "UserId not found in access token" });
        }

        var invoices = await _invoiceService.GetAllInvoicesByUserAsync(userId);
        var response = invoices.Select(MapToResponse);
        return Ok(response);
    }

    /// <summary>
    /// Get invoices by status for the current user
    /// </summary>
    [HttpGet("status/{status}")]
    public async Task<ActionResult<IEnumerable<InvoiceResponse>>> GetInvoicesByStatus(string status)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "UserId not found in access token" });
        }

        var invoices = await _invoiceService.GetInvoicesByStatusAsync(userId, status);
        var response = invoices.Select(MapToResponse);
        return Ok(response);
    }

    /// <summary>
    /// Get a specific invoice by ID for the current user
    /// </summary>
    /// <summary>
    /// Get invoice by ID
    /// Supports both JWT auth (user access) and API key auth (service-to-service)
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<InvoiceResponse>> GetInvoiceById(int id)
    {
        // Try to get userId from JWT token first
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        // If no JWT token, check for service API key
        if (string.IsNullOrEmpty(userId))
        {
            var apiKey = Request.Headers["X-Service-Api-Key"].FirstOrDefault();
            var configuredApiKey = HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["ServiceApiKey"];
            
            if (string.IsNullOrEmpty(apiKey) || apiKey != configuredApiKey)
            {
                return Unauthorized(new { error = "Invalid or missing authentication" });
            }
            
            // API Key is valid, allow access to any invoice
            var invoice = await _invoiceService.GetInvoiceByIdAsync(id);
            if (invoice == null)
            {
                return NotFound(new { error = $"Invoice with ID {id} not found" });
            }
            
            return Ok(MapToResponse(invoice));
        }

        // JWT auth: only return user's own invoice
        var userInvoice = await _invoiceService.GetInvoiceByIdAsync(id, userId);
        if (userInvoice == null)
        {
            return NotFound(new { error = $"Invoice with ID {id} not found for user {userId}" });
        }

        return Ok(MapToResponse(userInvoice));
    }

    /// <summary>
    /// Create a new invoice for the current user
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<InvoiceResponse>> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Lấy userId từ token, nếu không có thì kiểm tra API Key và lấy từ request body (cho service-to-service call)
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        // Nếu không có userId từ token, kiểm tra API Key cho service-to-service call
        if (string.IsNullOrEmpty(userId))
        {
            var apiKey = Request.Headers["X-Service-Api-Key"].FirstOrDefault();
            var configuredApiKey = HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["ServiceApiKey"];
            
            if (string.IsNullOrEmpty(apiKey) || apiKey != configuredApiKey)
            {
                return Unauthorized(new { error = "Invalid or missing authentication" });
            }
            
            // API Key hợp lệ, lấy userId từ request body
            userId = request.UserId;
        }
        
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest(new { error = "UserId is required" });
        }

        var invoice = new Invoice
        {
            UserId = userId,
            InvoiceDate = request.InvoiceDate,
            DueDate = request.DueDate
        };

        // If usage data is provided, calculate items from pricing
        if (request.ElectricUsage.HasValue || request.WaterUsage.HasValue)
        {
            var pricingService = HttpContext.RequestServices.GetRequiredService<Features.Pricing.IPricingService>();
            var activePricing = await pricingService.GetActiveAsync();

            if (activePricing == null)
            {
                return BadRequest(new { error = "No active pricing found. Please set up pricing first." });
            }

            var items = new List<InvoiceItem>();

            // Tạo description với tháng/năm chính xác
            var cycleDescription = "";
            if (request.CycleMonth.HasValue && request.CycleYear.HasValue)
            {
                cycleDescription = $"tháng {request.CycleMonth}/{request.CycleYear}";
            }
            else if (request.CycleId.HasValue)
            {
                cycleDescription = $"Cycle {request.CycleId}";
            }

            if (request.ElectricUsage.HasValue && request.ElectricUsage.Value > 0)
            {
                var amount = request.ElectricUsage.Value * activePricing.ElectricPerKwh;
                items.Add(new InvoiceItem
                {
                    Description = $"Tiền điện {cycleDescription}",
                    Quantity = request.ElectricUsage.Value,
                    UnitPrice = activePricing.ElectricPerKwh,
                    Amount = amount,
                    ProductCode = "ELECTRIC"
                });
            }

            if (request.WaterUsage.HasValue && request.WaterUsage.Value > 0)
            {
                var amount = request.WaterUsage.Value * activePricing.WaterPerCubicMeter;
                items.Add(new InvoiceItem
                {
                    Description = $"Tiền nước {cycleDescription}",
                    Quantity = request.WaterUsage.Value,
                    UnitPrice = activePricing.WaterPerCubicMeter,
                    Amount = amount,
                    ProductCode = "WATER"
                });
            }

            // Thêm tiền phòng
            if (activePricing.RoomPrice > 0)
            {
                items.Add(new InvoiceItem
                {
                    Description = $"Tiền phòng {cycleDescription}",
                    Quantity = 1,
                    UnitPrice = activePricing.RoomPrice,
                    Amount = activePricing.RoomPrice,
                    ProductCode = "ROOM"
                });
            }

            if (!items.Any())
            {
                return BadRequest(new { error = "No usage data provided" });
            }

            invoice.Items = items;
        }
        else
        {
            // Manual invoice creation with provided items
            if (!request.Items.Any())
            {
                return BadRequest(new { error = "Invoice must have at least one item or usage data" });
            }

            invoice.Items = request.Items.Select(item => new InvoiceItem
            {
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Amount = item.Amount,
                ProductCode = item.ProductCode
            }).ToList();
        }

        var createdInvoice = await _invoiceService.CreateInvoiceAsync(invoice);
        var response = MapToResponse(createdInvoice);

        return CreatedAtAction(
            nameof(GetInvoiceById), 
            new { id = createdInvoice.Id }, 
            response);
    }

    /// <summary>
    /// Update an existing invoice for the current user
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<InvoiceResponse>> UpdateInvoice(
        int id,
        [FromBody] UpdateInvoiceRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "UserId not found in access token" });
        }

        if (!request.Items.Any())
        {
            return BadRequest(new { error = "Invoice must have at least one item" });
        }

        var invoice = new Invoice
        {
            InvoiceDate = request.InvoiceDate,
            DueDate = request.DueDate,
            Status = request.Status,
            Items = request.Items.Select(item => new InvoiceItem
            {
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Amount = item.Amount,
                ProductCode = item.ProductCode
            }).ToList()
        };

        var updatedInvoice = await _invoiceService.UpdateInvoiceAsync(id, invoice, userId);
        if (updatedInvoice == null)
        {
            return NotFound(new { error = $"Invoice with ID {id} not found for user {userId}" });
        }

        return Ok(MapToResponse(updatedInvoice));
    }

    /// <summary>
    /// Delete an invoice for the current user
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteInvoice(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { error = "UserId not found in access token" });
        }

        var result = await _invoiceService.DeleteInvoiceAsync(id, userId);
        if (!result)
        {
            return NotFound(new { error = $"Invoice with ID {id} not found for user {userId}" });
        }

        return NoContent();
    }

    /// <summary>
    /// Mark an invoice as paid for the current user
    /// </summary>
    /// <summary>
    /// Mark invoice as paid
    /// Supports both JWT auth (user access) and API key auth (service-to-service)
    /// </summary>
    [HttpPost("{id}/mark-paid")]
    [AllowAnonymous]
    public async Task<ActionResult<InvoiceResponse>> MarkInvoiceAsPaid(int id)
    {
        // Try to get userId from JWT token first
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        // If no JWT token, check for service API key
        if (string.IsNullOrEmpty(userId))
        {
            var apiKey = Request.Headers["X-Service-Api-Key"].FirstOrDefault();
            var configuredApiKey = HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["ServiceApiKey"];
            
            if (string.IsNullOrEmpty(apiKey) || apiKey != configuredApiKey)
            {
                return Unauthorized(new { error = "Invalid or missing authentication" });
            }
            
            // API Key is valid, allow marking any invoice as paid
            var invoice = await _invoiceService.MarkInvoiceAsPaidAsync(id);
            if (invoice == null)
            {
                return NotFound(new { error = $"Invoice with ID {id} not found" });
            }
            
            return Ok(MapToResponse(invoice));
        }

        // JWT auth: only mark user's own invoice as paid
        var userInvoice = await _invoiceService.MarkInvoiceAsPaidAsync(id, userId);
        if (userInvoice == null)
        {
            return NotFound(new { error = $"Invoice with ID {id} not found for user {userId}" });
        }

        return Ok(MapToResponse(userInvoice));
    }

    private static InvoiceResponse MapToResponse(Invoice invoice)
    {
        return new InvoiceResponse
        {
            Id = invoice.Id,
            UserId = invoice.UserId,
            InvoiceDate = invoice.InvoiceDate,
            DueDate = invoice.DueDate,
            TotalAmount = invoice.TotalAmount,
            Status = invoice.Status,
            PaidDate = invoice.PaidDate,
            CreatedAt = invoice.CreatedAt,
            UpdatedAt = invoice.UpdatedAt,
            Items = invoice.Items.Select(item => new InvoiceItemResponse
            {
                Id = item.Id,
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Amount = item.Amount,
                ProductCode = item.ProductCode
            }).ToList()
        };
    }
}
