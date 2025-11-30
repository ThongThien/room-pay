namespace InvoiceService.Features.Pricing.DTOs;

public class UpdatePricingDto
{
    public decimal? ElectricPerKwh { get; set; }
    public decimal? WaterPerCubicMeter { get; set; }
    public decimal? RoomPrice { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? EffectiveDate { get; set; }
}
