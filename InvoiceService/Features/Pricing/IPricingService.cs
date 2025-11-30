using InvoiceService.Features.Pricing.DTOs;

namespace InvoiceService.Features.Pricing;

public interface IPricingService
{
    Task<IEnumerable<PricingDto>> GetAllAsync();
    Task<PricingDto?> GetByIdAsync(int id);
    Task<PricingDto?> GetActiveAsync();
    Task<PricingDto> CreateAsync(CreatePricingDto createDto);
    Task<bool> UpdateAsync(int id, UpdatePricingDto updateDto);
    Task<bool> DeleteAsync(int id);
}
