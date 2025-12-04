using Microsoft.EntityFrameworkCore;
using ReadingService.Data;
using ReadingService.Features.ReadingCycle.DTOs;
using ReadingService.Models;

namespace ReadingService.Features.ReadingCycle;

public class ReadingCycleService : IReadingCycleService
{
    private readonly ApplicationDbContext _context;

    public ReadingCycleService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ReadingCycleDto>> GetAllAsync()
    {
        return await _context.ReadingCycles
            .Select(c => new ReadingCycleDto
            {
                Id = c.Id,
                UserId = c.UserId,
                CycleMonth = c.CycleMonth,
                CycleYear = c.CycleYear,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<ReadingCycleDto>> GetByUserIdAsync(string userId)
    {
        return await _context.ReadingCycles
            .Where(c => c.UserId == userId)
            .Select(c => new ReadingCycleDto
            {
                Id = c.Id,
                UserId = c.UserId,
                CycleMonth = c.CycleMonth,
                CycleYear = c.CycleYear,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<ReadingCycleDto?> GetByIdAsync(int id)
    {
        var cycle = await _context.ReadingCycles.FindAsync(id);

        if (cycle == null)
        {
            return null;
        }

        return new ReadingCycleDto
        {
            Id = cycle.Id,
            UserId = cycle.UserId,
            CycleMonth = cycle.CycleMonth,
            CycleYear = cycle.CycleYear,
            CreatedAt = cycle.CreatedAt,
            UpdatedAt = cycle.UpdatedAt
        };
    }

    public async Task<bool> IsOwnerAsync(int cycleId, string userId)
    {
        return await _context.ReadingCycles
            .AnyAsync(c => c.Id == cycleId && c.UserId == userId);
    }

    public async Task<ReadingCycleDto> CreateAsync(CreateReadingCycleDto createDto)
    {
        var cycle = new Models.ReadingCycle
        {
            UserId = createDto.UserId,
            CycleMonth = createDto.CycleMonth,
            CycleYear = createDto.CycleYear,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ReadingCycles.Add(cycle);
        await _context.SaveChangesAsync();

        // Lấy chỉ số mới từ lần nộp trước (nếu có) để làm chỉ số cũ cho tháng này
        var previousReading = await _context.MonthlyReadings
            .Include(mr => mr.ReadingCycle)
            .Where(mr => mr.ReadingCycle!.UserId == createDto.UserId && mr.Status == Models.ReadingStatus.Confirmed)
            .OrderByDescending(mr => mr.UpdatedAt)
            .FirstOrDefaultAsync();

        // Tự động tạo MonthlyReading với status Pending
        var monthlyReading = new Models.MonthlyReading
        {
            CycleId = cycle.Id,
            // Nếu có reading trước, lấy chỉ số mới của nó làm chỉ số cũ cho tháng này
            ElectricOld = previousReading?.ElectricNew,
            WaterOld = previousReading?.WaterNew,
            Status = Models.ReadingStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.MonthlyReadings.Add(monthlyReading);
        await _context.SaveChangesAsync();

        return new ReadingCycleDto
        {
            Id = cycle.Id,
            UserId = cycle.UserId,
            CycleMonth = cycle.CycleMonth,
            CycleYear = cycle.CycleYear,
            CreatedAt = cycle.CreatedAt,
            UpdatedAt = cycle.UpdatedAt
        };
    }

    public async Task<bool> UpdateAsync(int id, UpdateReadingCycleDto updateDto)
    {
        var cycle = await _context.ReadingCycles.FindAsync(id);

        if (cycle == null)
        {
            return false;
        }

        if (!string.IsNullOrEmpty(updateDto.UserId))
        {
            cycle.UserId = updateDto.UserId;
        }

        if (updateDto.CycleMonth.HasValue)
        {
            cycle.CycleMonth = updateDto.CycleMonth.Value;
        }

        if (updateDto.CycleYear.HasValue)
        {
            cycle.CycleYear = updateDto.CycleYear.Value;
        }

        cycle.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            return false;
        }
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var cycle = await _context.ReadingCycles.FindAsync(id);

        if (cycle == null)
        {
            return false;
        }

        _context.ReadingCycles.Remove(cycle);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ExistsAsync(string userId, int month, int year)
    {
        return await _context.ReadingCycles
            .AnyAsync(c => c.UserId == userId 
                && c.CycleMonth == month 
                && c.CycleYear == year);
    }
}
