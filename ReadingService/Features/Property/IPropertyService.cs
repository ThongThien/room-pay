using ReadingService.Features.Property.DTOs; // Cần tạo DTOs mới

public interface IPropertyService
{
    // Hàm lấy thông tin chi tiết phòng/nhà cho một danh sách Cycle ID
    Task<Dictionary<int, PropertyDetailsDto>> GetPropertyDetailsByCycleIdsAsync(List<int> cycleIds);
}