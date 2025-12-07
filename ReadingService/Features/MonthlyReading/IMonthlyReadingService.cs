using ReadingService.Features.MonthlyReading.DTOs;

namespace ReadingService.Features.MonthlyReading;

public interface IMonthlyReadingService
{
    Task<MonthlyReadingResponseDto?> GetByIdAsync(int id);
    Task<MonthlyReadingResponseDto?> GetByCycleIdAsync(int cycleId);
    Task<MonthlyReadingResponseDto?> GetLatestSubmittedByUserIdAsync(string userId);
    Task<MonthlyReadingResponseDto> SubmitAsync(int cycleId, SubmitMonthlyReadingDto dto);
    Task<bool> DeleteAsync(int id);
    Task<MissingReadingsResponseDto> GetMissingReadingsAsync(Guid tenantId);
    Task<IEnumerable<MonthlyReadingResponseDto>> GetAllReadingsByRoleAsync(
        string userId, 
        string role, 
        string? ownerId
    );
    Task<IEnumerable<MonthlyReadingResponseDto>> GetAllReadingsByUserIdAsync(string userId);
    Task<List<MonthlyReadingResponseDto>> GetAllAsync();
    
    
}

