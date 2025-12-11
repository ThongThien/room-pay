using Microsoft.EntityFrameworkCore;
using ReadingService.Data;
using ReadingService.Features.ReadingCycle.DTOs;
using ReadingService.DTOs;
using ReadingService.Features.User;
using ReadingService.Models;
using ReadingService.Features.User.DTOs;

namespace ReadingService.Features.ReadingCycle;

public class ReadingCycleService : IReadingCycleService
{
    private readonly ApplicationDbContext _context;
    private readonly IUserService _userService;

    public ReadingCycleService(ApplicationDbContext context, IUserService userService)
    {
        _context = context;
        _userService = userService;
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

    public async Task<ReadingCycleDto> CreateAsync(string userId, CreateReadingCycleDto createDto)
    {
        var cycle = new Models.ReadingCycle
        {
            UserId = userId,
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
            .Where(mr => mr.ReadingCycle!.UserId == userId && mr.Status == Models.ReadingStatus.Confirmed)
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

    public async Task<ReadingCycleDto?> GetLatestCycleByOwnerAsync(string ownerId)
    {
        // BƯỚC 1: Gọi dịch vụ bên ngoài để lấy danh sách Tenant ID thuộc về Owner này
        // Sử dụng IUserService để truy vấn AuthService/UserService
        var tenantIds = await _userService.GetTenantIdsByOwnerAsync(ownerId);

        // Kiểm tra: Nếu không có Tenant nào hoặc gọi dịch vụ thất bại
        if (tenantIds == null || !tenantIds.Any())
        {
            // Trả về null, Controller sẽ trả về 404 (Không tìm thấy chu kỳ)
            return null; 
        }

        var currentMonth = DateTime.Now.Month;
        var currentYear = DateTime.Now.Year;

        // BƯỚC 2: Truy vấn DB cục bộ để tìm chu kỳ đọc chỉ số mới nhất (tháng hiện tại)
        var cycle = await _context.ReadingCycles
            // Lọc các kỳ đọc có UserId (Tenant ID) nằm trong danh sách tenantIds
            .Where(c => tenantIds.Contains(c.UserId))
            
            // Lọc theo tháng và năm hiện tại (Tìm chu kỳ được tạo cho tháng hiện tại)
            .Where(c => c.CycleMonth == currentMonth && c.CycleYear == currentYear)
            
            // Lấy chu kỳ được tạo gần nhất nếu có nhiều Tenant có cùng chu kỳ
            .OrderByDescending(c => c.CreatedAt) 
            .FirstOrDefaultAsync();

        if (cycle == null)
        {
            return null;
        }

        // BƯỚC 3: Map sang DTO
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

    public async Task<IEnumerable<UserInfo>> GetTenantsMissingReadingAsync(int ownerCycleId)
    {
        // 1. Tìm các ReadingCycle IDs (là CycleId trong MonthlyReading) 
        // thuộc về chủ sở hữu (owner) và đang ở trạng thái Pending.
        
        // Tìm tất cả các ReadingCycle thuộc về ownerCycleId và join để lấy status từ MonthlyReading.
        // Vì mỗi ReadingCycle tương ứng với một Tenant/User, ReadingCycle.UserId chính là Tenant ID.

        var pendingReadingCycleIds = await _context.MonthlyReadings
            .Where(mr => mr.CycleId == ownerCycleId 
                        && mr.Status == ReadingStatus.Pending)
            // Lỗi CS1061 trước đây: mr.UserId không tồn tại.
            // Giờ ta cần lấy UserId (Tenant ID) từ Navigation Property ReadingCycle
            // Tạm thời, tôi sẽ dùng cách truy vấn trực tiếp DB nếu chưa có Navigation Property ngược lại.
            // HOẶC, nếu 'mr.CycleId' thực chất là ID của bản ghi ReadingCycle, ta dùng:
            .Select(mr => mr.CycleId) // mr.CycleId chính là ReadingCycle.Id
            .Distinct()
            .ToListAsync();

        // 2. Lấy Tenant ID từ các ReadingCycle IDs tìm được
        var tenantIds = await _context.ReadingCycles
            .Where(rc => pendingReadingCycleIds.Contains(rc.Id))
            .Select(rc => rc.UserId) // Lấy Tenant ID từ ReadingCycle
            .Distinct()
            .ToListAsync();

        if (!tenantIds.Any())
        {
            return Enumerable.Empty<UserInfo>();
        }

        // 3. Gọi UserService để lấy thông tin chi tiết (FullName, Email) của các Tenant này
        var tenantsInfo = await _userService.GetUsersByIdsAsync(tenantIds); 

        return tenantsInfo;
    }
}
