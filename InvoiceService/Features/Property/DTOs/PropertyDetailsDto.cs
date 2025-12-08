using System.Text.Json.Serialization;

namespace InvoiceService.Features.Property.DTOs; // Namespace rõ ràng

// DTO này mô tả dữ liệu mà Property Service trả về
public class PropertyDetailsDto
{
    public int? ContractId { get; set; } // Thêm ContractId để liên kết với Invoice
    public int CycleId { get; set; }
    public string HouseName { get; set; }
    public string RoomName { get; set; }
    public int? Floor { get; set; }
}