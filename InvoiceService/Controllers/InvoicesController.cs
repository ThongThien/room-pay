using InvoiceService.Models;
using InvoiceService.Features.Invoice;
using InvoiceService.Features.Invoice.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace InvoiceService.Controllers;

[ApiController]
[Route("api/[controller]")]
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
    /// Get all invoices for a user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvoiceResponse>>> GetAllInvoices([FromQuery] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return BadRequest(new { error = "UserId is required" });
        }

        var invoices = await _invoiceService.GetAllInvoicesByUserAsync(userId);
        var response = invoices.Select(MapToResponse);
        return Ok(response);
    }

    /// <summary>
    /// Get invoices by status for a user
    /// </summary>
    [HttpGet("status/{status}")]
    public async Task<ActionResult<IEnumerable<InvoiceResponse>>> GetInvoicesByStatus(
        string status, 
        [FromQuery] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return BadRequest(new { error = "UserId is required" });
        }

        var invoices = await _invoiceService.GetInvoicesByStatusAsync(userId, status);
        var response = invoices.Select(MapToResponse);
        return Ok(response);
    }

    /// <summary>
    /// Get a specific invoice by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<InvoiceResponse>> GetInvoiceById(int id, [FromQuery] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return BadRequest(new { error = "UserId is required" });
        }

        var invoice = await _invoiceService.GetInvoiceByIdAsync(id, userId);
        if (invoice == null)
        {
            return NotFound(new { error = $"Invoice with ID {id} not found for user {userId}" });
        }

        return Ok(MapToResponse(invoice));
    }

    /// <summary>
    /// Create a new invoice
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<InvoiceResponse>> CreateInvoice([FromBody] CreateInvoiceRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (string.IsNullOrWhiteSpace(request.UserId))
        {
            return BadRequest(new { error = "UserId is required" });
        }

        var invoice = new Invoice
        {
            UserId = request.UserId,
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

            if (request.ElectricUsage.HasValue && request.ElectricUsage.Value > 0)
            {
                var amount = request.ElectricUsage.Value * activePricing.ElectricPerKwh;
                items.Add(new InvoiceItem
                {
                    Description = $"Tiền điện tháng (Cycle {request.CycleId})",
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
                    Description = $"Tiền nước tháng (Cycle {request.CycleId})",
                    Quantity = request.WaterUsage.Value,
                    UnitPrice = activePricing.WaterPerCubicMeter,
                    Amount = amount,
                    ProductCode = "WATER"
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
            new { id = createdInvoice.Id, userId = createdInvoice.UserId }, 
            response);
    }

    /// <summary>
    /// Update an existing invoice
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<InvoiceResponse>> UpdateInvoice(
        int id, 
        [FromQuery] string userId,
        [FromBody] UpdateInvoiceRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        if (string.IsNullOrWhiteSpace(userId))
        {
            return BadRequest(new { error = "UserId is required" });
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
    /// Delete an invoice
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteInvoice(int id, [FromQuery] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return BadRequest(new { error = "UserId is required" });
        }

        var result = await _invoiceService.DeleteInvoiceAsync(id, userId);
        if (!result)
        {
            return NotFound(new { error = $"Invoice with ID {id} not found for user {userId}" });
        }

        return NoContent();
    }

    /// <summary>
    /// Mark an invoice as paid
    /// </summary>
    [HttpPost("{id}/mark-paid")]
    public async Task<ActionResult<InvoiceResponse>> MarkInvoiceAsPaid(
        int id,
        [FromQuery] string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return BadRequest(new { error = "UserId is required" });
        }

        var invoice = await _invoiceService.MarkInvoiceAsPaidAsync(id, userId);

        if (invoice == null)
        {
            return NotFound(new { error = $"Invoice with ID {id} not found for user {userId}" });
        }

        return Ok(MapToResponse(invoice));
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
