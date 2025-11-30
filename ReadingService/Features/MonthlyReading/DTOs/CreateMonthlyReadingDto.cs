namespace ReadingService.Features.MonthlyReading.DTOs;

public class CreateMonthlyReadingDto
{
    public int CycleId { get; set; }
    public int ElectricOld { get; set; }
    public int ElectricNew { get; set; }
    public IFormFile? ElectricPhoto { get; set; }
    public int WaterOld { get; set; }
    public int WaterNew { get; set; }
    public IFormFile? WaterPhoto { get; set; }
    public string Status { get; set; } = string.Empty;
}