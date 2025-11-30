using Microsoft.AspNetCore.Mvc;
using InvoiceService.Features.Pricing.DTOs;
using InvoiceService.Features.Pricing;

namespace InvoiceService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PricingController : ControllerBase
{
    private readonly IPricingService _service;

    public PricingController(IPricingService service)
    {
        _service = service;
    }

    // GET: api/Pricing
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PricingDto>>> GetAllPricings()
    {
        var pricings = await _service.GetAllAsync();
        return Ok(pricings);
    }

    // GET: api/Pricing/5
    [HttpGet("{id}")]
    public async Task<ActionResult<PricingDto>> GetPricing(int id)
    {
        var pricing = await _service.GetByIdAsync(id);

        if (pricing == null)
        {
            return NotFound(new { message = "Pricing not found" });
        }

        return Ok(pricing);
    }

    // GET: api/Pricing/active
    [HttpGet("active")]
    public async Task<ActionResult<PricingDto>> GetActivePricing()
    {
        var pricing = await _service.GetActiveAsync();

        if (pricing == null)
        {
            return NotFound(new { message = "No active pricing found" });
        }

        return Ok(pricing);
    }

    // POST: api/Pricing
    [HttpPost]
    public async Task<ActionResult<PricingDto>> CreatePricing(CreatePricingDto createDto)
    {
        // Validate pricing values
        if (createDto.ElectricPerKwh <= 0)
        {
            return BadRequest(new { message = "Electric price must be greater than 0" });
        }

        if (createDto.WaterPerCubicMeter <= 0)
        {
            return BadRequest(new { message = "Water price must be greater than 0" });
        }

        if (createDto.RoomPrice <= 0)
        {
            return BadRequest(new { message = "Room price must be greater than 0" });
        }

        var pricing = await _service.CreateAsync(createDto);

        return CreatedAtAction(nameof(GetPricing), new { id = pricing.Id }, pricing);
    }

    // PUT: api/Pricing/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePricing(int id, UpdatePricingDto updateDto)
    {
        // Validate pricing values if provided
        if (updateDto.ElectricPerKwh.HasValue && updateDto.ElectricPerKwh.Value <= 0)
        {
            return BadRequest(new { message = "Electric price must be greater than 0" });
        }

        if (updateDto.WaterPerCubicMeter.HasValue && updateDto.WaterPerCubicMeter.Value <= 0)
        {
            return BadRequest(new { message = "Water price must be greater than 0" });
        }

        if (updateDto.RoomPrice.HasValue && updateDto.RoomPrice.Value <= 0)
        {
            return BadRequest(new { message = "Room price must be greater than 0" });
        }

        var success = await _service.UpdateAsync(id, updateDto);

        if (!success)
        {
            return NotFound(new { message = "Pricing not found" });
        }

        return NoContent();
    }

    // DELETE: api/Pricing/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePricing(int id)
    {
        var success = await _service.DeleteAsync(id);

        if (!success)
        {
            return NotFound(new { message = "Pricing not found" });
        }

        return NoContent();
    }
}
