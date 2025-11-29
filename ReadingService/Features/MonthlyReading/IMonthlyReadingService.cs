namespace ReadingService.Features.MonthlyReadings;

public interface IMonthlyReadingService
{
    Task<MonthlyReadingResponseDto> CreateAsync(CreateMonthlyReadingDto dto);
    Task<MonthlyReadingResponseDto?> GetByIdAsync(int id);
    Task<List<MonthlyReadingResponseDto>> GetByCycleIdAsync(int cycleId);
    Task<bool> UpdateAsync(int id, CreateMonthlyReadingDto dto);
    Task<bool> DeleteAsync(int id);
}

