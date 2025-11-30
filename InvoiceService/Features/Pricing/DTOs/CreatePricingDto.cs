namespace InvoiceService.Features.Pricing.DTOs;

public class CreatePricingDto
{
    public decimal ElectricPerKwh { get; set; }
    public decimal WaterPerCubicMeter { get; set; }
    public decimal RoomPrice { get; set; }
    public DateTime EffectiveDate { get; set; }
}
