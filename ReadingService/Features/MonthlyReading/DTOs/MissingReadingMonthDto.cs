// ReadingService/Features/MonthlyReading/DTOs/MissingReadingMonthDto.cs
namespace ReadingService.Features.MonthlyReading.DTOs;

public class MissingReadingMonthDto
{
    public string MonthYear { get; set; } = string.Empty; 
    public int ReadingCycleId { get; set; } 
}