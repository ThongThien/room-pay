using Microsoft.EntityFrameworkCore;
using ReadingService.Data;
using ReadingService.Models;
using ReadingService.Services;
using ReadingService.Features.MonthlyReading.DTOs;
using ReadingService.Features.ReadingCycle; 
using ReadingService.Features.MonthlyReading.DTOs; 
using ReadingService.Features.Property; 
using ReadingService.Features.Property.DTOs;
using System.Linq;

namespace ReadingService.Features.MonthlyReading;

public class MonthlyReadingService : IMonthlyReadingService
{
    private readonly IUserService _userService;
    private readonly IPropertyService _propertyService;
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
        IReadingCycleService cycleService,
        IPropertyService propertyService)
    {
        _context = context;
        _s3Service = s3Service;
        _logger = logger;
        _userService = userService;
        _invoiceHttpClient = invoiceHttpClient;
        _cycleService = cycleService; // ⭐ Gán
        _propertyService = propertyService; // ⭐ Gán
    }

    public async Task<List<MonthlyReadingResponseDto>> GetAllAsync()
    {
        var readings = await _context.MonthlyReadings.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return readings.Select(MapToResponseDto).ToList();
    }

    public async Task<MonthlyReadingResponseDto?> GetByIdAsync(int id)
    {
        var reading = await _context.MonthlyReadings
        .Include(r => r.ReadingCycle) 
        .FirstOrDefaultAsync(r => r.Id == id);
        return reading == null ? null : MapToResponseDto(reading);
    }

    public async Task<MonthlyReadingResponseDto?> GetByCycleIdAsync(int cycleId)
    {
        var reading = await _context.MonthlyReadings
            .Include(r => r.ReadingCycle) // ⭐ BỔ SUNG INCLUDE
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
        // 1. XÁC ĐỊNH PHẠM VI TRUY VẤN (Lấy danh sách Cycle ID)
        List<int> cycleIds;

        if (role == "Tenant")
        {
            // LOGIC 1: TENANT (Khách thuê)
            cycleIds = await _context.ReadingCycles
                .Where(c => c.UserId == userId) 
                .Select(c => c.Id)
                .ToListAsync();
            
            _logger.LogInformation("Truy vấn cho Tenant {UserId}. Tìm thấy {Count} Cycles.", userId, cycleIds.Count);
        }
        else if (role == "Owner")
        {
            // LOGIC 2: OWNER (Chủ nhà/Quản lý) - Dùng Microservice call
            
            try
            {
                // BƯỚC 1: Gọi User Service để lấy danh sách Tenant IDs thuộc Owner này
                // ⭐ ĐÃ SỬA: Phải dùng tên hàm GetTenantIdsByOwnerIdAsync nếu đây là hàm bạn muốn dùng ⭐
                var tenantUserIds = await _userService.GetTenantIdsByOwnerAsync(userId); 
                
                if (!tenantUserIds.Any())
                {
                    _logger.LogInformation("Truy vấn cho Owner {UserId}. Không có Tenant ID nào được trả về từ User Service.", userId);
                    return Enumerable.Empty<MonthlyReadingResponseDto>();
                }

                // BƯỚC 2: Lấy tất cả Cycle IDs của các Tenant vừa tìm thấy
                cycleIds = await _context.ReadingCycles
                    .Where(c => tenantUserIds.Contains(c.UserId))
                    .Select(c => c.Id)
                    .ToListAsync();
            
                _logger.LogInformation("Truy vấn cho Owner {UserId}. Tìm thấy {Count} Cycles liên quan.", userId, cycleIds.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "🔥 Lỗi khi gọi UserService lấy danh sách Tenant IDs cho Owner.");
                return Enumerable.Empty<MonthlyReadingResponseDto>();
            }
        }
        else
        {
            _logger.LogWarning("Vai trò {Role} không được hỗ trợ trong truy vấn MonthlyReading.", role);
            return Enumerable.Empty<MonthlyReadingResponseDto>();
        }

        // --- 2. THỰC THI TRUY VẤN CƠ SỞ --- 
        
        if (!cycleIds.Any())
        {
            return Enumerable.Empty<MonthlyReadingResponseDto>();
        }

        var readings = await _context.MonthlyReadings
            .Include(r => r.ReadingCycle) 
            .Where(r => cycleIds.Contains(r.CycleId))
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        _logger.LogInformation("Đã lấy được {Count} bản ghi MonthlyReading từ DB.", readings.Count);
        
        // --- 3. LÀM GIÀU DỮ LIỆU TỪ MICROSERVICE (Data Enrichment) ---
        
        // 3.1. Chuẩn bị IDs
        var allTenantIds = readings
        .Where(r => r.ReadingCycle != null)
        .Select(r => r.ReadingCycle!.UserId)
        .Distinct().ToList();

        var contractIds = readings
        .Where(r => r.TenantContractId.HasValue) // Chỉ lấy các bản ghi đã có Contract ID
        .Select(r => r.TenantContractId!.Value)
        .Distinct()
        .ToList();

        _logger.LogInformation("Thu thập được {Count} Contract IDs để làm giàu dữ liệu.", contractIds.Count);
        // 3.2. Lấy thông tin Nhà/Phòng (PropertyService)
        var propertyDetailsMap = new Dictionary<int, PropertyDetailsDto>();
        try
        {
            var detailsList = await _propertyService.GetDetailsByContractIdsAsync(contractIds);
            propertyDetailsMap = detailsList
            .Where(d => d.ContractId.HasValue) 
            .ToDictionary(d => d.ContractId!.Value, d => d);
            _logger.LogInformation("Property Service: Đã lấy thành công {Count} chi tiết Property.", propertyDetailsMap.Count);

            // ⭐ LOG MỚI: KIỂM TRA MAP KEY ⭐
            if (propertyDetailsMap.Any())
            {
                var firstKey = propertyDetailsMap.Keys.First();
                var firstDetail = propertyDetailsMap[firstKey];
                _logger.LogWarning("🔥 Property Map Check: First Key (CycleId)={Key}, HouseName={House}", firstKey, firstDetail.HouseName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 Lỗi gọi PropertyService để lấy chi tiết Property.");
        }
        
        // 3.3. Lấy thông tin Tên Người Thuê (UserService)
        var tenantMap = new Dictionary<string, string>();
        try
        {
            var tenantInfos = await _userService.GetUsersByIdsAsync(allTenantIds); 
            tenantMap = tenantInfos.ToDictionary(t => t.Id, t => t.FullName);
            _logger.LogInformation("User Service: Đã lấy thành công {Count} thông tin Tenant.", tenantMap.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 Lỗi gọi UserService để lấy thông tin chi tiết Tenant.");
        }

        // --- 4. MAP VÀ TRẢ VỀ ---
        var responseList = new List<MonthlyReadingResponseDto>();

        foreach (var reading in readings)
        {
            var cycle = reading.ReadingCycle!; 
            var dto = MapToResponseDto(reading); 
            
            bool isPropertyMapped = false;

            // 4.1. Tenant Name (Làm giàu)
            if (tenantMap.TryGetValue(cycle.UserId, out var tenantName) && !string.IsNullOrEmpty(tenantName))
            {
                dto.TenantName = tenantName;
            }

            // 4.2. Property Details (Làm giàu)
            if (reading.TenantContractId.HasValue &&
                        propertyDetailsMap.TryGetValue(reading.TenantContractId.Value, out var details)) // ⭐ TÌM KIẾM BẰNG CONTRACT ID ⭐
                    {
                        dto.HouseName = details.HouseName;
                        dto.RoomName = details.RoomName;
                        dto.Floor = details.Floor;
                        _logger.LogDebug("Mapped successfully: Reading ID {ReadingId} -> House {HouseName}", reading.Id, dto.HouseName);
                    }
                    else 
                    {
                        _logger.LogWarning("MonthlyReading ID {ReadingId}: Không tìm thấy chi tiết Property cho Contract ID {ContractId} (UserId {UserId}).", 
                            reading.Id, reading.TenantContractId, cycle.UserId);
                    }

                    responseList.Add(dto);
        }
        
        return responseList;
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

    private static MonthlyReadingResponseDto MapToResponseDto(
    ReadingService.Models.MonthlyReading reading) 
    {
        // Dùng Toán tử an toàn Null cho các thuộc tính từ ReadingCycle
        var cycle = reading.ReadingCycle;
        var tenantId = cycle?.UserId ?? string.Empty;

        return new MonthlyReadingResponseDto
        {
            // ... (các trường gốc giữ nguyên) ...
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
            UpdatedAt = reading.UpdatedAt,
            TenantContractId = reading.TenantContractId,
        };
    }
}