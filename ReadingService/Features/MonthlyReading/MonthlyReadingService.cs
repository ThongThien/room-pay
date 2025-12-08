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
    private readonly ApplicationDbContext _context;
    private readonly IS3Service _s3Service;
    private readonly ILogger<MonthlyReadingService> _logger;
    private readonly IInvoiceHttpClient _invoiceHttpClient;
    //  Dependency MỚI: Dùng Service để lấy chu kỳ đọc
    private readonly IReadingCycleService _cycleService;

    public MonthlyReadingService(
        ApplicationDbContext context,
        IS3Service s3Service,
        ILogger<MonthlyReadingService> logger,
        IInvoiceHttpClient invoiceHttpClient,
        //  Thêm Dependency cho ReadingCycleService
        IReadingCycleService cycleService)
    {
        _context = context;
        _s3Service = s3Service;
        _logger = logger;
        _invoiceHttpClient = invoiceHttpClient;
        _cycleService = cycleService; //  Gán
    }

    public async Task<List<MonthlyReadingResponseDto>> GetAllAsync()
    {
        var readings = await _context.MonthlyReadings.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return readings.Select(MapToResponseDto).ToList();
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
        // Get the latest submitted reading of the user
        var reading = await _context.MonthlyReadings
            .Include(mr => mr.ReadingCycle)
            .Where(mr => mr.ReadingCycle!.UserId == userId && (mr.Status == ReadingStatus.Confirmed))
            .OrderByDescending(mr => mr.UpdatedAt)
            .FirstOrDefaultAsync();

        return reading == null ? null : MapToResponseDto(reading);
    }
    
    // 💡 NEW FUNCTION: GetMissingReadingsAsync
    public async Task<MissingReadingsResponseDto> GetMissingReadingsAsync(Guid tenantId)
    {
        DateTime now = DateTime.Now;
        string tenantIdString = tenantId.ToString();

        try
        {
            // 1. Identify ALL finished cycles belonging to the user
            var finishedCycles = _context.ReadingCycles
                .Where(c => 
                    c.UserId == tenantIdString && 
                    (c.CycleYear < now.Year || 
                    (c.CycleYear == now.Year && c.CycleMonth < now.Month))
                );

            // 2. LEFT JOIN with MonthlyReadings to find missing cycles
            var missingCyclesQuery = finishedCycles
                .GroupJoin(
                    _context.MonthlyReadings, // Right table (MonthlyReading)
                    c => c.Id,                // Primary key (CycleId)
                    mr => mr.CycleId,         // Foreign key (CycleId)
                    (c, mrs) => new { Cycle = c, Readings = mrs } // Join result
                )
                .SelectMany( // SelectMany to handle cases with no MonthlyReading (Left Join)
                    x => x.Readings.DefaultIfEmpty(), 
                    (x, mr) => new { x.Cycle, Reading = mr }
                )
                // 3. Filter records considered MISSING
                .Where(x => 
                    // Missing condition 1: NO MonthlyReading created for this cycle
                    x.Reading == null || 
                    
                    // Missing condition 2: Or MonthlyReading exists but is INVALID
                    (x.Reading != null && 
                    (
                        x.Reading.Status == ReadingStatus.Pending || // Pending status
                        x.Reading.ElectricNew <= 0 ||                // Missing new electric reading
                        x.Reading.WaterNew <= 0 ||                   // Missing new water reading
                        string.IsNullOrEmpty(x.Reading.ElectricPhotoUrl) || // Missing electric photo
                        string.IsNullOrEmpty(x.Reading.WaterPhotoUrl)       // Missing water photo
                    )
                    )
                )
                // 4. Group to avoid duplicates (though there shouldn't be multiple missing records for same cycle)
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
    public async Task<IEnumerable<MonthlyReadingResponseDto>> GetAllReadingsByUserIdAsync(string userId)
    {
        // 1. Get all Cycle IDs for the user
        var cycleIds = await _context.ReadingCycles
            .Where(c => c.UserId == userId)
            .Select(c => c.Id)
            .ToListAsync();

        // 2. Get ALL corresponding MonthlyReadings (Using ToListAsync)
        var readings = await _context.MonthlyReadings
            .Where(r => cycleIds.Contains(r.CycleId))
            .OrderByDescending(r => r.CreatedAt) // Sort by submission time
            .ToListAsync();

        // Map and return
        return readings.Select(MapToResponseDto);
    }

    public async Task<MonthlyReadingResponseDto> SubmitAsync(int cycleId, SubmitMonthlyReadingDto dto)
    {
        try
        {
        // Find MonthlyReading by CycleId
        var reading = await _context.MonthlyReadings
            .Include(r => r.ReadingCycle) // Include to get UserId
            .FirstOrDefaultAsync(r => r.CycleId == cycleId);

        if (reading == null)
        {
            throw new InvalidOperationException("Không tìm thấy MonthlyReading cho CycleId này");
        }

        var userId = reading.ReadingCycle?.UserId ?? "unknown";
        
        // Log for debugging
        _logger.LogInformation($"SubmitAsync - CycleId: {cycleId}, UserId: {userId}, ElectricOld (from DB): {reading.ElectricOld}, ElectricNew (from user): {dto.ElectricNew}, WaterOld (from DB): {reading.WaterOld}, WaterNew (from user): {dto.WaterNew}");

        // Upload electric photo to S3
        if (dto.ElectricPhoto != null)
        {
            // Delete old photo if exists
            if (!string.IsNullOrEmpty(reading.ElectricPhotoUrl))
            {
                await _s3Service.DeleteFileAsync(reading.ElectricPhotoUrl);
            }
            reading.ElectricPhotoUrl = await _s3Service.UploadFileAsync(dto.ElectricPhoto, $"{userId}/electric-meter-photos");
        }

        // Upload water photo to S3
        if (dto.WaterPhoto != null)
        {
            // Delete old photo if exists
            if (!string.IsNullOrEmpty(reading.WaterPhotoUrl))
            {
                await _s3Service.DeleteFileAsync(reading.WaterPhotoUrl);
            }
            reading.WaterPhotoUrl = await _s3Service.UploadFileAsync(dto.WaterPhoto, $"{userId}/water-meter-photos");
        }

        // Update information - old readings were automatically set when creating ReadingCycle
        // ElectricOld and WaterOld don't need updating, already available from previous submission
        reading.ElectricNew = dto.ElectricNew;
        reading.WaterNew = dto.WaterNew;
        reading.Status = ReadingStatus.Confirmed; // Update status to Confirmed
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

        // Delete photos from S3 if they exist
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