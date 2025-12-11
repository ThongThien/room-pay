// File: ReadingService/Features/MonthlyReading/DTOs/MonthlyReadingResponseDto.cs (CẬP NHẬT)

using ReadingService.Models;

namespace ReadingService.Features.MonthlyReading.DTOs;

public class MonthlyReadingResponseDto
{
    public int Id { get; set; }
    public int CycleId { get; set; }
    
    // --- THÔNG TIN CHỈ SỐ ---
    public int? ElectricOld { get; set; }
    public int? ElectricNew { get; set; }
    public string? ElectricPhotoUrl { get; set; }
    public int? WaterOld { get; set; }
    public int? WaterNew { get; set; }
    public string? WaterPhotoUrl { get; set; }
    public ReadingStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // --- THÔNG TIN NHÀ/PHÒNG (Từ PropertyService) ---
    public int? TenantContractId { get; set; } // Thêm TenantContractId để dễ Join/Group sau này
    public string HouseName { get; set; } = string.Empty; // Cột 'Nhà'
    public string RoomName { get; set; } = string.Empty; // Cột 'Phòng'
    public int Floor { get; set; } // Cột 'Tầng'
    public string TenantName { get; set; } = string.Empty; // Cột 'Người Thuê' (Tên đầy đủ)
    public string TenantId { get; set; } = string.Empty; // Thêm TenantId để dễ Join/Group sau này
}