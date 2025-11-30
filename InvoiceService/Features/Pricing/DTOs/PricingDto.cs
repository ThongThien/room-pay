namespace InvoiceService.Features.Pricing.DTOs;

public class PricingDto
{
    public int Id { get; set; }
    public decimal ElectricPerKwh { get; set; }
    public decimal WaterPerCubicMeter { get; set; }
    public decimal RoomPrice { get; set; }
    public bool IsActive { get; set; }
    public DateTime EffectiveDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
