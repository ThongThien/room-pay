using Microsoft.EntityFrameworkCore;
using ReadingService.Data;
using ReadingService.Models;
using ReadingService.Services;
using ReadingService.Features.MonthlyReading.DTOs;
using ReadingService.Features.ReadingCycle; 
using ReadingService.Features.MonthlyReading.DTOs; 
using System.Linq;

namespace ReadingService.Features.MonthlyReading;

public class MonthlyReadingService : IMonthlyReadingService
{
    private readonly IUserService _userService;
    private readonly ApplicationDbContext _context;
    private readonly IS3Service _s3Service;
    private readonly ILogger<MonthlyReadingService> _logger;
    private readonly IInvoiceHttpClient _invoiceHttpClient;
    // ⭐ Dependency MỚI: Dùng Service để lấy chu kỳ đọc
    private readonly IReadingCycleService _cycleService; 

    public MonthlyReadingService(
        ApplicationDbContext context,
        IS3Service s3Service,
        ILogger<MonthlyReadingService> logger,
        IUserService userService,
        IInvoiceHttpClient invoiceHttpClient,
        // ⭐ Thêm Dependency cho ReadingCycleService
        IReadingCycleService cycleService)
    {
        _context = context;
        _s3Service = s3Service;
        _logger = logger;
        _userService = userService;
        _invoiceHttpClient = invoiceHttpClient;
        _cycleService = cycleService; // ⭐ Gán
    }

    public async Task<MonthlyReadingResponseDto?> GetByIdAsync(int id)
    {
        var reading = await _context.MonthlyReadings.FindAsync(id);
        return reading == null ? null : MapToResponseDto(reading);
    }

    public async Task<MonthlyReadingResponseDto?> GetByCycleIdAsync(int cycleId)
    {
        var reading = await _context.MonthlyReadings
            .FirstOrDefaultAsync(r => r.CycleId == cycleId);

        return reading == null ? null : MapToResponseDto(reading);
    }

    public async Task<MonthlyReadingResponseDto?> GetLatestSubmittedByUserIdAsync(string userId)
    {
        // Lấy reading gần nhất đã được submit của user
        var reading = await _context.MonthlyReadings
            .Include(mr => mr.ReadingCycle)
            .Where(mr => mr.ReadingCycle!.UserId == userId && (mr.Status == ReadingStatus.Confirmed))
            .OrderByDescending(mr => mr.UpdatedAt)
            .FirstOrDefaultAsync();

        return reading == null ? null : MapToResponseDto(reading);
    }
    
    // 💡 HÀM MỚI: GetMissingReadingsAsync
    public async Task<MissingReadingsResponseDto> GetMissingReadingsAsync(Guid tenantId)
    {
        DateTime now = DateTime.Now;
        string tenantIdString = tenantId.ToString();

        try
        {
            // 1. Xác định TẤT CẢ chu kỳ đã kết thúc và thuộc về user
            var finishedCycles = _context.ReadingCycles
                .Where(c => 
                    c.UserId == tenantIdString && 
                    (c.CycleYear < now.Year || 
                    (c.CycleYear == now.Year && c.CycleMonth < now.Month))
                );

            // 2. LEFT JOIN với MonthlyReadings để tìm chu kỳ bị thiếu
            var missingCyclesQuery = finishedCycles
                .GroupJoin(
                    _context.MonthlyReadings, // Bảng bên phải (MonthlyReading)
                    c => c.Id,                // Khóa chính (CycleId)
                    mr => mr.CycleId,         // Khóa ngoại (CycleId)
                    (c, mrs) => new { Cycle = c, Readings = mrs } // Kết quả Join
                )
                .SelectMany( // SelectMany để xử lý trường hợp không có MonthlyReading (Left Join)
                    x => x.Readings.DefaultIfEmpty(), 
                    (x, mr) => new { x.Cycle, Reading = mr }
                )
                // 3. Lọc ra các bản ghi được coi là BỊ THIẾU (Missing)
                .Where(x => 
                    // Điều kiện thiếu 1: CHƯA CÓ MonthlyReading nào được tạo cho chu kỳ này
                    x.Reading == null || 
                    
                    // Điều kiện thiếu 2: Hoặc MonthlyReading có tồn tại, nhưng KHÔNG HỢP LỆ
                    (x.Reading != null && 
                    (
                        x.Reading.Status == ReadingStatus.Pending || // Trạng thái Pending
                        x.Reading.ElectricNew <= 0 ||                // Thiếu chỉ số điện mới
                        x.Reading.WaterNew <= 0 ||                   // Thiếu chỉ số nước mới
                        string.IsNullOrEmpty(x.Reading.ElectricPhotoUrl) || // Thiếu ảnh điện
                        string.IsNullOrEmpty(x.Reading.WaterPhotoUrl)       // Thiếu ảnh nước
                    )
                    )
                )
                // 4. Group lại để tránh trùng lặp (vì có thể có nhiều bản ghi thiếu cho cùng 1 cycle, mặc dù không nên)
                .Select(x => x.Cycle)
                .Distinct()
                .OrderByDescending(c => c.CycleYear)
                .ThenByDescending(c => c.CycleMonth)
                .Select(c => new MissingReadingMonthDto 
                {
                    ReadingCycleId = c.Id,
                    MonthYear = $"Tháng {c.CycleMonth:D2}/{c.CycleYear}"
                })
                .ToListAsync(); 
                
            return new MissingReadingsResponseDto
            {
                MissingReadings = await missingCyclesQuery,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 ERROR retrieving all missing readings for Tenant {TenantId}", tenantId);
            return new MissingReadingsResponseDto(); 
        }
    }
    public async Task<IEnumerable<MonthlyReadingResponseDto>> GetAllReadingsByRoleAsync(
    string userId, 
    string role, 
    string? ownerId)
    {
        // Khởi tạo danh sách các Cycle IDs cần truy vấn
        List<int> cycleIds;

        if (role == "Tenant")
        {
            // LOGIC 1: TENANT (Khách thuê)
            // Tenant chỉ được xem các Cycle mà họ là UserId
            
            cycleIds = await _context.ReadingCycles
                .Where(c => c.UserId == userId) // UserId của Cycle phải khớp với TenantId đang đăng nhập
                .Select(c => c.Id)
                .ToListAsync();
            
            _logger.LogInformation("Truy vấn cho Tenant {UserId}. Tìm thấy {Count} Cycles.", userId, cycleIds.Count);
        }
        else if (role == "Owner")
        {
            // LOGIC 2: OWNER (Chủ nhà/Quản lý) - Dùng Microservice call
            
            // BƯỚC 1: GỌI SERVICE USER để lấy danh sách Tenant IDs thuộc Owner này
            // (userId ở đây chính là OwnerId đang đăng nhập)
            var tenantUserIds = await _userService.GetTenantIdsByOwnerAsync(userId); 
            
            if (!tenantUserIds.Any())
            {
                _logger.LogInformation("Truy vấn cho Owner {UserId}. Không có Tenant ID nào được trả về từ User Service.", userId);
                return Enumerable.Empty<MonthlyReadingResponseDto>();
            }

            // BƯỚC 2: Lấy tất cả Cycle IDs của các Tenant vừa tìm thấy
            // (Sử dụng Contains để lọc qua các Cycle mà Tenant đó sở hữu)
            cycleIds = await _context.ReadingCycles
                .Where(c => tenantUserIds.Contains(c.UserId))
                .Select(c => c.Id)
                .ToListAsync();
                
            _logger.LogInformation("Truy vấn cho Owner {UserId}. Tìm thấy {Count} Cycles liên quan.", userId, cycleIds.Count);
        }
        else
        {
            // Xử lý các vai trò không hợp lệ hoặc không xác định
            _logger.LogWarning("Vai trò {Role} không được hỗ trợ trong truy vấn MonthlyReading.", role);
            return Enumerable.Empty<MonthlyReadingResponseDto>();
        }

        // THỰC THI TRUY VẤN CHUNG (Sau khi đã xác định được cycleIds)
        if (!cycleIds.Any())
        {
            return Enumerable.Empty<MonthlyReadingResponseDto>();
        }

        // Lấy TẤT CẢ MonthlyReadings tương ứng
        var readings = await _context.MonthlyReadings
            .Where(r => cycleIds.Contains(r.CycleId))
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        // Map và trả về
        var result = readings.Select(MapToResponseDto).ToList();
        _logger.LogInformation("Hoàn tất Map. Trả về {ResultCount} bản ghi DTO.", result.Count);
        
        return result;
    }

    public async Task<MonthlyReadingResponseDto> SubmitAsync(int cycleId, SubmitMonthlyReadingDto dto)
    {
        try
        {
        // Tìm MonthlyReading theo CycleId
        var reading = await _context.MonthlyReadings
            .Include(r => r.ReadingCycle) // Include để lấy UserId
            .FirstOrDefaultAsync(r => r.CycleId == cycleId);

        if (reading == null)
        {
            throw new InvalidOperationException("Không tìm thấy MonthlyReading cho CycleId này");
        }

        var userId = reading.ReadingCycle?.UserId ?? "unknown";
        
        // Log để debug
        _logger.LogInformation($"SubmitAsync - CycleId: {cycleId}, UserId: {userId}, ElectricOld (from DB): {reading.ElectricOld}, ElectricNew (from user): {dto.ElectricNew}, WaterOld (from DB): {reading.WaterOld}, WaterNew (from user): {dto.WaterNew}");

        // Upload ảnh điện lên S3
        if (dto.ElectricPhoto != null)
        {
            // Xóa ảnh cũ nếu có
            if (!string.IsNullOrEmpty(reading.ElectricPhotoUrl))
            {
                await _s3Service.DeleteFileAsync(reading.ElectricPhotoUrl);
            }
            reading.ElectricPhotoUrl = await _s3Service.UploadFileAsync(dto.ElectricPhoto, $"{userId}/electric-meter-photos");
        }

        // Upload ảnh nước lên S3
        if (dto.WaterPhoto != null)
        {
            // Xóa ảnh cũ nếu có
            if (!string.IsNullOrEmpty(reading.WaterPhotoUrl))
            {
                await _s3Service.DeleteFileAsync(reading.WaterPhotoUrl);
            }
            reading.WaterPhotoUrl = await _s3Service.UploadFileAsync(dto.WaterPhoto, $"{userId}/water-meter-photos");
        }

        // Cập nhật thông tin - chỉ số cũ đã được set tự động khi tạo ReadingCycle
        // ElectricOld và WaterOld không cần cập nhật, đã có sẵn từ lần nộp trước
        reading.ElectricNew = dto.ElectricNew;
        reading.WaterNew = dto.WaterNew;
        reading.Status = ReadingStatus.Confirmed; // Cập nhật trạng thái thành Confirmed
        reading.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Automatically create invoice after submitting monthly reading
        var electricUsage = (reading.ElectricNew ?? 0) - (reading.ElectricOld ?? 0);
        var waterUsage = (reading.WaterNew ?? 0) - (reading.WaterOld ?? 0);

        if (electricUsage > 0 || waterUsage > 0)
        {
            var cycleMonth = reading.ReadingCycle?.CycleMonth ?? 0;
            var cycleYear = reading.ReadingCycle?.CycleYear ?? 0;
            
            _ = Task.Run(async () =>
            {
                try
                {
                    await _invoiceHttpClient.CreateInvoiceForMonthlyReadingAsync(
                        userId,
                        cycleId,
                        cycleMonth,
                        cycleYear,
                        electricUsage,
                        waterUsage);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Failed to create invoice for user {userId}, cycle {cycleId}");
                }
            });
        }

        return MapToResponseDto(reading);
        }
            catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 ERROR in SubmitAsync()");
            throw;
        }
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var reading = await _context.MonthlyReadings.FindAsync(id);
        if (reading == null)
        {
            return false;
        }

        // Xóa ảnh trên S3 nếu có
        if (!string.IsNullOrEmpty(reading.ElectricPhotoUrl))
        {
            await _s3Service.DeleteFileAsync(reading.ElectricPhotoUrl);
        }
        if (!string.IsNullOrEmpty(reading.WaterPhotoUrl))
        {
            await _s3Service.DeleteFileAsync(reading.WaterPhotoUrl);
        }

        _context.MonthlyReadings.Remove(reading);
        await _context.SaveChangesAsync();
        return true;
    }

    private static MonthlyReadingResponseDto MapToResponseDto(ReadingService.Models.MonthlyReading reading)
    {
        return new MonthlyReadingResponseDto
        {
            Id = reading.Id,
            CycleId = reading.CycleId,
            ElectricOld = reading.ElectricOld,
            ElectricNew = reading.ElectricNew,
            ElectricPhotoUrl = reading.ElectricPhotoUrl,
            WaterOld = reading.WaterOld,
            WaterNew = reading.WaterNew,
            WaterPhotoUrl = reading.WaterPhotoUrl,
            Status = reading.Status,
            CreatedAt = reading.CreatedAt,
            UpdatedAt = reading.UpdatedAt
        };
    }
}