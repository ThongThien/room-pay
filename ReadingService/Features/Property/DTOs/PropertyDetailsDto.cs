// File: ReadingService/Features/Property/DTOs/PropertyDetailsDto.cs (ví dụ)

namespace ReadingService.Features.Property.DTOs;

public class PropertyDetailsDto
{
    public int CycleId { get; set; } // Để dễ dàng Map lại
    public string HouseName { get; set; } = string.Empty; // Cột 'Nhà'
    public string RoomName { get; set; } = string.Empty; // Cột 'Phòng'
    public int Floor { get; set; } // Cột 'Tầng'
    public string TenantName { get; set; } = string.Empty; // Cột 'Người Thuê' (Tên đầy đủ)
}