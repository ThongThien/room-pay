using Microsoft.EntityFrameworkCore;
using InvoiceService.Data;
using InvoiceService.Features.Pricing.DTOs;
using InvoiceService.Models;

namespace InvoiceService.Features.Pricing;

public class PricingService : IPricingService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PricingService> _logger;

    public PricingService(ApplicationDbContext context, ILogger<PricingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<PricingDto>> GetAllAsync()
    {
        return await _context.Pricings
            .OrderByDescending(p => p.EffectiveDate)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }

    public async Task<PricingDto?> GetByIdAsync(int id)
    {
        var pricing = await _context.Pricings.FindAsync(id);
        return pricing == null ? null : MapToDto(pricing);
    }

    public async Task<PricingDto?> GetActiveAsync()
    {
        var pricing = await _context.Pricings
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.EffectiveDate)
            .FirstOrDefaultAsync();

        return pricing == null ? null : MapToDto(pricing);
    }

    public async Task<PricingDto> CreateAsync(CreatePricingDto createDto)
    {
        // Deactivate all existing active pricings
        var activePricings = await _context.Pricings
            .Where(p => p.IsActive)
            .ToListAsync();

        foreach (var p in activePricings)
        {
            p.IsActive = false;
            p.UpdatedAt = DateTime.UtcNow;
        }

        var pricing = new Models.Pricing
        {
            ElectricPerKwh = createDto.ElectricPerKwh,
            WaterPerCubicMeter = createDto.WaterPerCubicMeter,
            RoomPrice = createDto.RoomPrice,
            EffectiveDate = createDto.EffectiveDate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Pricings.Add(pricing);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Created new pricing with ID {pricing.Id}, effective from {pricing.EffectiveDate}");

        return MapToDto(pricing);
    }

    public async Task<bool> UpdateAsync(int id, UpdatePricingDto updateDto)
    {
        var pricing = await _context.Pricings.FindAsync(id);

        if (pricing == null)
        {
            return false;
        }

        if (updateDto.ElectricPerKwh.HasValue)
        {
            pricing.ElectricPerKwh = updateDto.ElectricPerKwh.Value;
        }

        if (updateDto.WaterPerCubicMeter.HasValue)
        {
            pricing.WaterPerCubicMeter = updateDto.WaterPerCubicMeter.Value;
        }

        if (updateDto.RoomPrice.HasValue)
        {
            pricing.RoomPrice = updateDto.RoomPrice.Value;
        }

        if (updateDto.IsActive.HasValue)
        {
            // If setting this pricing to active, deactivate all others
            if (updateDto.IsActive.Value && !pricing.IsActive)
            {
                var activePricings = await _context.Pricings
                    .Where(p => p.IsActive && p.Id != id)
                    .ToListAsync();

                foreach (var p in activePricings)
                {
                    p.IsActive = false;
                    p.UpdatedAt = DateTime.UtcNow;
                }
            }

            pricing.IsActive = updateDto.IsActive.Value;
        }

        if (updateDto.EffectiveDate.HasValue)
        {
            pricing.EffectiveDate = updateDto.EffectiveDate.Value;
        }

        pricing.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation($"Updated pricing with ID {id}");
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var pricing = await _context.Pricings.FindAsync(id);

        if (pricing == null)
        {
            return false;
        }

        _context.Pricings.Remove(pricing);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Deleted pricing with ID {id}");

        return true;
    }

    private static PricingDto MapToDto(Models.Pricing pricing)
    {
        return new PricingDto
        {
            Id = pricing.Id,
            ElectricPerKwh = pricing.ElectricPerKwh,
            WaterPerCubicMeter = pricing.WaterPerCubicMeter,
            RoomPrice = pricing.RoomPrice,
            IsActive = pricing.IsActive,
            EffectiveDate = pricing.EffectiveDate,
            CreatedAt = pricing.CreatedAt,
            UpdatedAt = pricing.UpdatedAt
        };
    }
}
