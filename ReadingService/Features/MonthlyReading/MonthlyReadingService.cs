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
    // ⭐ Dependency MỚI: Dùng Service để lấy chu kỳ đọc
    private readonly IReadingCycleService _cycleService; 

    public MonthlyReadingService(
        ApplicationDbContext context,
        IS3Service s3Service,
        ILogger<MonthlyReadingService> logger,
        IInvoiceHttpClient invoiceHttpClient,
        // ⭐ Thêm Dependency cho ReadingCycleService
        IReadingCycleService cycleService)
    {
        _context = context;
        _s3Service = s3Service;
        _logger = logger;
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
            .Where(mr => mr.ReadingCycle!.UserId == userId && mr.Status == ReadingStatus.Submitted)
            .OrderByDescending(mr => mr.UpdatedAt)
            .FirstOrDefaultAsync();

        return reading == null ? null : MapToResponseDto(reading);
    }
    
    // 💡 HÀM MỚI: GetMissingReadingsAsync
    public async Task<MissingReadingsResponseDto> GetMissingReadingsAsync(Guid tenantId)
    {
        try
        {
            DateTime now = DateTime.Now;
            string tenantIdString = tenantId.ToString();
            
            // 1. TÌM CHU KỲ ĐỌC GẦN NHẤT đã kết thúc
            // ⭐ SỬA LỖI 1: Không có CycleEnd, sử dụng CycleYear và CycleMonth để xác định chu kỳ đã qua.
            var latestCycle = await _context.ReadingCycles
                // Điều kiện: Chu kỳ này phải kết thúc TRƯỚC tháng hiện tại (CycleMonth < now.Month)
                .Where(c => c.CycleYear < now.Year || 
                            (c.CycleYear == now.Year && c.CycleMonth < now.Month)) 
                .OrderByDescending(c => c.CycleYear)
                .ThenByDescending(c => c.CycleMonth)
                .FirstOrDefaultAsync(); 
                
            if (latestCycle == null) 
                return new MissingReadingsResponseDto();

            // 2. TÌM BẢN GHI ĐÃ NỘP CỦA TENANT TRONG CHU KỲ ĐÓ
            var submittedReading = await _context.MonthlyReadings
                .Include(r => r.ReadingCycle)
                .FirstOrDefaultAsync(r => 
                    // ⭐ SỬA LỖI 2: Dùng r.CycleId (Đã sửa chính xác theo Model)
                    r.CycleId == latestCycle.Id && 
                    r.ReadingCycle!.UserId == tenantIdString 
                );

            bool isMissing = false;

            if (submittedReading == null)
            {
                // TH1: Hoàn toàn chưa nộp bản ghi MonthlyReading nào
                isMissing = true;
            }
            else
            {
                // TH2: Đã nộp nhưng thiếu chỉ số (kiểm tra null HOẶC <= 0, vì kiểu là int?)
                if (submittedReading.ElectricNew is null || submittedReading.ElectricNew <= 0 ||
                    submittedReading.WaterNew is null || submittedReading.WaterNew <= 0)
                {
                    isMissing = true;
                }
            }

            if (isMissing)
            {
                _logger.LogWarning("Missing reading found for CycleId: {CycleId}, TenantId: {TenantId}", latestCycle.Id, tenantId);
                return new MissingReadingsResponseDto
                {
                    MissingReadings = new List<MissingReadingMonthDto>
                    {
                        new MissingReadingMonthDto
                        {
                            ReadingCycleId = latestCycle.Id,
                            // Dùng Month/Year từ ReadingCycle để hiển thị
                            MonthYear = $"Tháng {latestCycle.CycleMonth:D2}/{latestCycle.CycleYear}" 
                        }
                    }
                };
            }
            
            return new MissingReadingsResponseDto();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 ERROR in GetMissingReadingsAsync for Tenant {TenantId}", tenantId);
            throw; 
        }
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
        reading.Status = ReadingStatus.Submitted;
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