// ReadingService/Features/MonthlyReading/DTOs/MissingReadingsResponseDto.cs
using System.Collections.Generic;
namespace ReadingService.Features.MonthlyReading.DTOs;

public class MissingReadingsResponseDto
{
    public List<MissingReadingMonthDto> MissingReadings { get; set; } = new List<MissingReadingMonthDto>();
    
    public int TotalMissingMonths => MissingReadings.Count;
    
}