namespace ReadingService.Features.MonthlyReading.DTOs;

public class SubmitMonthlyReadingDto
{
    public int ElectricNew { get; set; }
    public IFormFile? ElectricPhoto { get; set; }
    public int WaterNew { get; set; }
    public IFormFile? WaterPhoto { get; set; }
}
