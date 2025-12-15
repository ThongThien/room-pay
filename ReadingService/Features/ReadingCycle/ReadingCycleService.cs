using Microsoft.EntityFrameworkCore;
using ReadingService.Data;
using ReadingService.Features.ReadingCycle.DTOs;
using ReadingService.DTOs;
using ReadingService.Features.User;
using ReadingService.Models;
using ReadingService.Features.User.DTOs;
using Microsoft.Extensions.Logging;

namespace ReadingService.Features.ReadingCycle;

public class ReadingCycleService : IReadingCycleService
{
    private readonly ApplicationDbContext _context;
    private readonly IUserService _userService;
    private readonly ILogger<ReadingCycleService> _logger;

    public ReadingCycleService(ApplicationDbContext context, IUserService userService, ILogger<ReadingCycleService> logger)
    {
        _context = context;
        _userService = userService;
        _logger = logger;
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

    public async Task<ReadingCycleDto> CreateAsync(string tenantId, CreateReadingCycleDto createDto)
{
    // LOG INPUT
    _logger.LogInformation("   [Service] Creating Cycle for Tenant {TenantId}, Month {M}/{Y}", tenantId, createDto.CycleMonth, createDto.CycleYear);

    var cycle = new ReadingService.Models.ReadingCycle
    {
        UserId = tenantId,
        CycleMonth = createDto.CycleMonth,
        CycleYear = createDto.CycleYear,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    _context.ReadingCycles.Add(cycle);
    await _context.SaveChangesAsync();

    // LOG RESULT
    _logger.LogInformation("   [Service] Cycle Saved to DB. New ID: {Id}", cycle.Id);

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

    public async Task<IEnumerable<ReadingCycleDto>> GetPendingSubmissionCyclesByOwnerAsync(string ownerId)
    {
        // BƯỚC 1: Gọi dịch vụ bên ngoài để lấy danh sách Tenant ID thuộc về Owner này
        var tenantIds = await _userService.GetTenantIdsByOwnerAsync(ownerId);

        if (tenantIds == null || !tenantIds.Any())
        {
            return Enumerable.Empty<ReadingCycleDto>(); 
        }

        var currentMonth = DateTime.Now.Month;
        var currentYear = DateTime.Now.Year;

        // BƯỚC 2: Truy vấn DB cục bộ
        // 2a. Lọc các ReadingCycle thuộc Owner, trong tháng/năm hiện tại
        var recentCycles = _context.ReadingCycles
            .Where(rc => tenantIds.Contains(rc.UserId) // Lọc theo Tenant ID
                && rc.CycleMonth == currentMonth 
                && rc.CycleYear == currentYear);
                
        // 2b. Tham chiếu (Join) với MonthlyReadings để kiểm tra Status = Pending
        var cyclesToRemind = await recentCycles
            .Join(
                _context.MonthlyReadings,
                rc => rc.Id,
                mr => mr.CycleId,
                (rc, mr) => new { ReadingCycle = rc, MonthlyReading = mr }
            )
            // Lọc các MonthlyReading có Status là Pending
            .Where(joined => joined.MonthlyReading.Status == ReadingStatus.Pending)
            .Select(joined => new ReadingCycleDto 
            {
                Id = joined.ReadingCycle.Id,
                UserId = joined.ReadingCycle.UserId, // ID của Tenant
                CycleMonth = joined.ReadingCycle.CycleMonth,
                CycleYear = joined.ReadingCycle.CycleYear,
                CreatedAt = joined.ReadingCycle.CreatedAt,
                UpdatedAt = joined.ReadingCycle.UpdatedAt
            })
            .Distinct() // Đảm bảo mỗi Cycle chỉ được nhắc nhở một lần
            .ToListAsync();

        return cyclesToRemind;
    }
}
