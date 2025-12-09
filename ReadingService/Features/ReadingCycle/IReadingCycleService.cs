using ReadingService.Features.ReadingCycle.DTOs;

namespace ReadingService.Features.ReadingCycle;

public interface IReadingCycleService
{
    Task<IEnumerable<ReadingCycleDto>> GetAllAsync();
    Task<IEnumerable<ReadingCycleDto>> GetByUserIdAsync(string userId);
    Task<ReadingCycleDto?> GetByIdAsync(int id);
    Task<bool> IsOwnerAsync(int cycleId, string userId);
    Task<ReadingCycleDto> CreateAsync(string userId, CreateReadingCycleDto createDto);
    Task<bool> UpdateAsync(int id, UpdateReadingCycleDto updateDto);
    Task<bool> DeleteAsync(int id);
    Task<bool> ExistsAsync(string userId, int month, int year);
}
