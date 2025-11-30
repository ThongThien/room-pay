namespace InvoiceService.Models;

public class Pricing
{
    public int Id { get; set; }
    public decimal ElectricPerKwh { get; set; }
    public decimal WaterPerCubicMeter { get; set; }
    public decimal RoomPrice { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime EffectiveDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
