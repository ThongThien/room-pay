using Microsoft.EntityFrameworkCore;
using ReadingService.Data;
using ReadingService.Models;
using ReadingService.Services;

namespace ReadingService.Features.MonthlyReadings;

public class MonthlyReadingService : IMonthlyReadingService
{
    private readonly ApplicationDbContext _context;
    private readonly IS3Service _s3Service;
    private readonly ILogger<MonthlyReadingService> _logger;

    public MonthlyReadingService(
        ApplicationDbContext context,
        IS3Service s3Service,
        ILogger<MonthlyReadingService> logger)
    {
        _context = context;
        _s3Service = s3Service;
        _logger = logger;
    }

    public async Task<MonthlyReadingResponseDto> CreateAsync(CreateMonthlyReadingDto dto)
    {
        // Kiểm tra CycleId có tồn tại không
        var cycleExists = await _context.ReadingCycles.AnyAsync(c => c.Id == dto.CycleId);
        if (!cycleExists)
        {
            throw new InvalidOperationException("CycleId không tồn tại");
        }

        // Upload ảnh điện lên S3
        string? electricPhotoUrl = null;
        if (dto.ElectricPhoto != null)
        {
            electricPhotoUrl = await _s3Service.UploadFileAsync(dto.ElectricPhoto, "electric-photos");
        }

        // Upload ảnh nước lên S3
        string? waterPhotoUrl = null;
        if (dto.WaterPhoto != null)
        {
            waterPhotoUrl = await _s3Service.UploadFileAsync(dto.WaterPhoto, "water-photos");
        }

        // Tạo entity
        var monthlyReading = new MonthlyReading
        {
            CycleId = dto.CycleId,
            UserId = dto.UserId,
            ElectricOld = dto.ElectricOld,
            ElectricNew = dto.ElectricNew,
            ElectricPhotoUrl = electricPhotoUrl,
            WaterOld = dto.WaterOld,
            WaterNew = dto.WaterNew,
            WaterPhotoUrl = waterPhotoUrl,
            Status = dto.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.MonthlyReadings.Add(monthlyReading);
        await _context.SaveChangesAsync();

        // Trả về response
        return MapToResponseDto(monthlyReading);
    }

    public async Task<MonthlyReadingResponseDto?> GetByIdAsync(int id)
    {
        var reading = await _context.MonthlyReadings.FindAsync(id);
        return reading == null ? null : MapToResponseDto(reading);
    }

    public async Task<List<MonthlyReadingResponseDto>> GetByCycleIdAsync(int cycleId)
    {
        var readings = await _context.MonthlyReadings
            .Where(r => r.CycleId == cycleId)
            .ToListAsync();

        return readings.Select(MapToResponseDto).ToList();
    }

    public async Task<bool> UpdateAsync(int id, CreateMonthlyReadingDto dto)
    {
        var reading = await _context.MonthlyReadings.FindAsync(id);
        if (reading == null)
        {
            return false;
        }

        // Kiểm tra CycleId mới có tồn tại không
        if (reading.CycleId != dto.CycleId)
        {
            var cycleExists = await _context.ReadingCycles.AnyAsync(c => c.Id == dto.CycleId);
            if (!cycleExists)
            {
                throw new InvalidOperationException("CycleId không tồn tại");
            }
        }

        // Upload ảnh điện mới nếu có
        if (dto.ElectricPhoto != null)
        {
            // Xóa ảnh cũ nếu có
            if (!string.IsNullOrEmpty(reading.ElectricPhotoUrl))
            {
                await _s3Service.DeleteFileAsync(reading.ElectricPhotoUrl);
            }
            reading.ElectricPhotoUrl = await _s3Service.UploadFileAsync(dto.ElectricPhoto, "electric-photos");
        }

        // Upload ảnh nước mới nếu có
        if (dto.WaterPhoto != null)
        {
            // Xóa ảnh cũ nếu có
            if (!string.IsNullOrEmpty(reading.WaterPhotoUrl))
            {
                await _s3Service.DeleteFileAsync(reading.WaterPhotoUrl);
            }
            reading.WaterPhotoUrl = await _s3Service.UploadFileAsync(dto.WaterPhoto, "water-photos");
        }

        // Cập nhật các trường khác
        reading.CycleId = dto.CycleId;
        reading.UserId = dto.UserId;
        reading.ElectricOld = dto.ElectricOld;
        reading.ElectricNew = dto.ElectricNew;
        reading.WaterOld = dto.WaterOld;
        reading.WaterNew = dto.WaterNew;
        reading.Status = dto.Status;
        reading.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
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

    private static MonthlyReadingResponseDto MapToResponseDto(MonthlyReading reading)
    {
        return new MonthlyReadingResponseDto
        {
            Id = reading.Id,
            CycleId = reading.CycleId,
            UserId = reading.UserId,
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

