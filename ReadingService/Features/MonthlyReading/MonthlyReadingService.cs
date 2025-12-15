using Microsoft.EntityFrameworkCore;
using ReadingService.Data;
using ReadingService.Models;
using ReadingService.Services;
using ReadingService.Features.MonthlyReading.DTOs;
using ReadingService.Features.ReadingCycle; 
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
    //  Dependency MỚI: Dùng Service để lấy chu kỳ đọc
    private readonly IReadingCycleService _cycleService;

    private readonly IMessageProducer _messageProducer; // RabbitMQ producer

    public MonthlyReadingService(
        ApplicationDbContext context,
        IS3Service s3Service,
        ILogger<MonthlyReadingService> logger,
        IUserService userService,
        IInvoiceHttpClient invoiceHttpClient,
        //  Thêm Dependency cho ReadingCycleService
        IReadingCycleService cycleService,
        IPropertyService propertyService,
        IMessageProducer messageProducer
         )
    {
        _context = context;
        _s3Service = s3Service;
        _logger = logger;
        _userService = userService;
        _invoiceHttpClient = invoiceHttpClient;
        _cycleService = cycleService; //  Gán
        _propertyService = propertyService; //  Gán
        _messageProducer = messageProducer; // Gán
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
            .Include(r => r.ReadingCycle) //  BỔ SUNG INCLUDE
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
            _logger.LogError(ex, " ERROR retrieving all missing readings for Tenant {TenantId}", tenantId);
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
                // Gọi User Service để lấy danh sách Tenant IDs thuộc Owner này
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
                _logger.LogError(ex, " Lỗi khi gọi UserService lấy danh sách Tenant IDs cho Owner.");
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

            //  LOG MỚI: KIỂM TRA MAP KEY 
            if (propertyDetailsMap.Any())
            {
                var firstKey = propertyDetailsMap.Keys.First();
                var firstDetail = propertyDetailsMap[firstKey];
                _logger.LogWarning(" Property Map Check: First Key (CycleId)={Key}, HouseName={House}", firstKey, firstDetail.HouseName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, " Lỗi gọi PropertyService để lấy chi tiết Property.");
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
            _logger.LogError(ex, " Lỗi gọi UserService để lấy thông tin chi tiết Tenant.");
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
                        propertyDetailsMap.TryGetValue(reading.TenantContractId.Value, out var details)) //  TÌM KIẾM BẰNG CONTRACT ID 
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
            var reading = await _context.MonthlyReadings
                .Include(r => r.ReadingCycle)
                .FirstOrDefaultAsync(r => r.CycleId == cycleId);

            if (reading == null)
            {
                throw new InvalidOperationException("Không tìm thấy MonthlyReading cho CycleId này");
            }

            var tenantUserId = reading.ReadingCycle?.UserId 
                ?? throw new InvalidOperationException("Không tìm thấy User ID trong Reading Cycle.");

            _logger.LogInformation($"SubmitAsync - CycleId: {cycleId}, UserId: {tenantUserId}, ElectricOld (from DB): {reading.ElectricOld}, ElectricNew (from user): {dto.ElectricNew}, WaterOld (from DB): {reading.WaterOld}, WaterNew (from user): {dto.WaterNew}");

            // --- BƯỚC MỚI: ĐẢM BẢO GÁN TENANT CONTRACT ID ---
            if (reading.TenantContractId == null)
            {
                _logger.LogInformation("TenantContractId hiện đang NULL. Tiến hành tra cứu Active Contract ID cho User {UserId}.", tenantUserId);
                
                try
                {
                    var activeContractId = await _propertyService.GetActiveContractIdByUserIdAsync(tenantUserId);
                    
                    if (activeContractId.HasValue)
                    {
                        reading.TenantContractId = activeContractId.Value;
                        _logger.LogInformation(" Đã gán TenantContractId: {ContractId}", activeContractId.Value);
                    }
                    else
                    {
                        _logger.LogWarning("⚠️ Không tìm thấy Active Contract ID cho User {UserId} khi nộp MonthlyReading. TenantContractId sẽ vẫn NULL.", tenantUserId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, " Lỗi khi gọi PropertyService lấy Active Contract ID cho User {UserId}.", tenantUserId);
                }
            }
            else
            {
                _logger.LogInformation("TenantContractId đã có sẵn: {ContractId}. Bỏ qua tra cứu.", reading.TenantContractId.Value);
            }
            // ---------------------------------------------------

            // Upload ảnh... (Giữ nguyên)
            if (dto.ElectricPhoto != null)
            {
                 if (!string.IsNullOrEmpty(reading.ElectricPhotoUrl))
                 {
                     await _s3Service.DeleteFileAsync(reading.ElectricPhotoUrl);
                 }
                 reading.ElectricPhotoUrl = await _s3Service.UploadFileAsync(dto.ElectricPhoto, $"{tenantUserId}/electric-meter-photos");
            }

            if (dto.WaterPhoto != null)
            {
                 if (!string.IsNullOrEmpty(reading.WaterPhotoUrl))
                 {
                     await _s3Service.DeleteFileAsync(reading.WaterPhotoUrl);
                 }
                 reading.WaterPhotoUrl = await _s3Service.UploadFileAsync(dto.WaterPhoto, $"{tenantUserId}/water-meter-photos");
            }

            // Cập nhật thông tin và Status
            reading.ElectricNew = dto.ElectricNew;
            reading.WaterNew = dto.WaterNew;
            reading.Status = ReadingStatus.Confirmed; 
            reading.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            
            // Tính toán mức sử dụng
            var electricUsage = (reading.ElectricNew ?? 0) - (reading.ElectricOld ?? 0);
            var waterUsage = (reading.WaterNew ?? 0) - (reading.WaterOld ?? 0);
            
            var cycleMonth = reading.ReadingCycle?.CycleMonth ?? 0;
            var cycleYear = reading.ReadingCycle?.CycleYear ?? 0;

            // ----------------------------------------------------------------------
            // ⭐️ BƯỚC 3: KIỂM TRA VÀ GỬI THÔNG BÁO BẤT THƯỜNG (ANOMALY CHECK) ⭐️
            // ----------------------------------------------------------------------
            
            bool isElectricAnomaly = electricUsage > 500;
            bool isWaterAnomaly = waterUsage > 30;

            if (isElectricAnomaly || isWaterAnomaly)
            {
                _logger.LogWarning("⚠️ ANOMALY DETECTED! Sending notification to Owner.");
                
                // Chạy bất đồng bộ
                _ = Task.Run(async () =>
                {
                    try
                    {
                        // 1. Lấy Owner ID (Sử dụng endpoint mới GetOwnerIdByTenantIdAsync)
                        var ownerId = await _userService.GetOwnerIdByTenantIdAsync(tenantUserId);

                        if (string.IsNullOrEmpty(ownerId))
                        {
                            _logger.LogWarning("⚠️ Cannot find Owner ID for Tenant {TenantId}. Skipping anomaly notification.", tenantUserId);
                            return;
                        }
                        
                        // 2. Lấy Email Owner (Sử dụng endpoint mới GetEmailByUserIdAsync)
                        var ownerEmail = await _userService.GetEmailByUserIdAsync(ownerId);
                        
                        if (string.IsNullOrEmpty(ownerEmail))
                        {
                            _logger.LogWarning("⚠️ Cannot find Email for Owner {OwnerId}. Skipping anomaly notification.", ownerId);
                            return;
                        }

                        // 3. GỬI THÔNG BÁO QUA RABBITMQ
                        var anomalyMessage = new 
                        {
                            Type = "ReadingAnomaly", // NotificationService sẽ lắng nghe type này
                            RecipientEmail = ownerEmail,
                            TenantId = tenantUserId,
                            OwnerId = ownerId,
                            CycleMonth = cycleMonth,
                            CycleYear = cycleYear,
                            ElectricUsage = electricUsage,
                            WaterUsage = waterUsage,
                            IsElectricAnomaly = isElectricAnomaly,
                            IsWaterAnomaly = isWaterAnomaly
                        };

                        _messageProducer.SendMessage(anomalyMessage, "notification_queue"); 
                        
                        _logger.LogInformation("🚀 Anomaly message sent to Owner {OwnerId} ({Email}).", ownerId, ownerEmail);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "❌ Failed to send Anomaly Notification for cycle {CycleId}.", cycleId);
                    }
                });
            }

            // --- Logic tạo Invoice ---
            if (reading.Status != ReadingStatus.AutoInvoiced && (electricUsage > 0 || waterUsage > 0))
            {
                var contractIdForInvoice = reading.TenantContractId;
                
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _invoiceHttpClient.CreateInvoiceForMonthlyReadingAsync(
                            tenantUserId,
                            cycleId,
                            cycleMonth,
                            cycleYear,
                            electricUsage,
                            waterUsage,
                            contractIdForInvoice
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to create invoice for user {tenantUserId}, cycle {cycleId}");
                    }
                });
            }

            return MapToResponseDto(reading);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, " ERROR in SubmitAsync()");
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

    public async Task<MonthlyReadingDto> CreateEmptyAsync(int cycleId, int tenantContractId)
    {
        // LOG INPUT
        _logger.LogInformation("   [Service] Creating MonthlyReading. CycleId: {CycleId}, ContractId: {ContractId}", cycleId, tenantContractId);

        // 1. TÌM CHỈ SỐ CŨ
        var lastCompletedReading = await _context.MonthlyReadings
            .Where(mr => mr.TenantContractId == tenantContractId)
            .Where(mr => mr.Status != ReadingStatus.Pending) 
            .Where(mr => mr.ElectricNew.HasValue || mr.WaterNew.HasValue) 
            .OrderByDescending(mr => mr.CreatedAt) 
            .Select(mr => new { mr.ElectricNew, mr.WaterNew })
            .FirstOrDefaultAsync(); 
        
        int? electricOldValue = lastCompletedReading?.ElectricNew ?? 0;
        int? waterOldValue = lastCompletedReading?.WaterNew ?? 0;

        // LOG LOGIC CHỈ SỐ
        if (lastCompletedReading != null)
        {
            _logger.LogInformation("   [Service] Found previous reading. Setting Old Values: E={E}, W={W}", electricOldValue, waterOldValue);
        }
        else
        {
            _logger.LogWarning("   [Service] No previous reading found (or first time). Setting Old Values to 0.");
        }
        
        // 2. TẠO MONTHLY READING
        var newReading = new ReadingService.Models.MonthlyReading 
        {
            CycleId = cycleId,
            TenantContractId = tenantContractId,
            Status = ReadingStatus.Pending,
            ElectricOld = electricOldValue, 
            WaterOld = waterOldValue,
            ElectricNew = null,
            WaterNew = null,
            ElectricPhotoUrl = null,
            WaterPhotoUrl = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.MonthlyReadings.Add(newReading);
        await _context.SaveChangesAsync();

        // LOG RESULT
        _logger.LogInformation("   [Service] MonthlyReading Saved to DB. New ID: {Id}", newReading.Id);

        return new MonthlyReadingDto
        {
            Id = newReading.Id,
            CycleId = newReading.CycleId,
            TenantContractId = newReading.TenantContractId,
            ElectricOld = newReading.ElectricOld,
            WaterOld = newReading.WaterOld,
            Status = newReading.Status.ToString(),
            CreatedAt = newReading.CreatedAt
        }; 
    }

    public async Task TriggerAutoInvoicesAsync(string ownerId)
    {
        var currentMonth = DateTime.Now.Month;
        var currentYear = DateTime.Now.Year;

        _logger.LogInformation("Manually triggering auto invoices for {Month}/{Year} by owner {OwnerId}", currentMonth, currentYear, ownerId);

        // Get tenant IDs for this owner
        var tenantIds = await _userService.GetTenantIdsByOwnerAsync(ownerId);
        if (tenantIds == null || !tenantIds.Any())
        {
            _logger.LogInformation("No tenants found for owner {OwnerId}", ownerId);
            return;
        }

        var readings = await _context.MonthlyReadings
            .Include(r => r.ReadingCycle)
            .Where(r => r.Status != ReadingStatus.Confirmed &&
                        r.Status != ReadingStatus.AutoInvoiced &&
                        r.ReadingCycle.CycleMonth == currentMonth &&
                        r.ReadingCycle.CycleYear == currentYear &&
                        tenantIds.Contains(r.ReadingCycle.UserId))
            .ToListAsync();

        _logger.LogInformation("Found {Count} readings to process for auto invoices", readings.Count);

        foreach (var reading in readings)
        {
            try
            {
                var tenantUserId = reading.ReadingCycle?.UserId;
                if (string.IsNullOrEmpty(tenantUserId))
                {
                    _logger.LogWarning("Skipping auto invoice for reading {ReadingId}: UserId is null", reading.Id);
                    continue;
                }

                if (reading.TenantContractId == null)
                {
                    _logger.LogWarning("Skipping auto invoice for reading {ReadingId}: TenantContractId is null", reading.Id);
                    continue;
                }

                var success = await _invoiceHttpClient.CreateInvoiceForMonthlyReadingAsync(
                    tenantUserId,
                    reading.CycleId,
                    currentMonth,
                    currentYear,
                    0, // electricUsage
                    0, // waterUsage
                    reading.TenantContractId
                );

                if (success)
                {
                    _logger.LogInformation("Auto invoice created for user {UserId}, cycle {CycleId}", tenantUserId, reading.CycleId);

                    // Đánh dấu đã tạo auto invoice
                    reading.Status = ReadingStatus.AutoInvoiced;
                    await _context.SaveChangesAsync();
                }
                else
                {
                    _logger.LogWarning("Failed to create auto invoice for user {UserId}, cycle {CycleId}", tenantUserId, reading.CycleId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating auto invoice for cycle {CycleId}", reading.CycleId);
            }
        }
    }
}