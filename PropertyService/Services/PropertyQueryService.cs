using Microsoft.EntityFrameworkCore; 
using PropertyService.Data; 
using PropertyService.DTOs;
using PropertyService.Services.Interfaces;
using Microsoft.Extensions.Logging;
public class PropertyQueryService : IPropertyQueryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PropertyQueryService> _logger;

    // SỬA CONSTRUCTOR ĐỂ CHỈ DÙNG CÁC DEPENDENCY CHÍNH XÁC
    public PropertyQueryService(ApplicationDbContext context, ILogger<PropertyQueryService> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    // ⭐ PHƯƠNG THỨC MỚI: Lấy chi tiết Property dựa trên CHUỖI KẾT NỐI
    public async Task<List<PropertyDetailsDto>> GetDetailsByCycleUserIdsAsync(
        List<(int CycleId, string UserId)> cycleUserIds)
    {
        if (cycleUserIds == null || !cycleUserIds.Any())
        {
            return new List<PropertyDetailsDto>();
        }

        // 1. Lấy danh sách duy nhất các User ID cần tra cứu
        var userIds = cycleUserIds.Select(c => c.UserId).Distinct().ToList();
        
        // 2. Truy vấn TenantContracts (cầu nối giữa User và Room)
        var contracts = await _context.TenantContracts
            .Where(c => userIds.Contains(c.TenantId))
            .Include(c => c.Room)
                .ThenInclude(r => r.House)
            // Chỉ chọn những Room đang active (nếu cần) và có Room/House hợp lệ
            .Where(c => c.Room != null && c.Room.House != null)
            .ToListAsync();
        
        // 3. Xây dựng Map để tra cứu nhanh: Map<UserId, RoomInfo>
        // LƯU Ý: Một User có thể có nhiều contracts/rooms, ta cần phải chọn cái nào có hiệu lực 
        // hoặc cái mới nhất. Ở đây ta giả định là 1 User chỉ có 1 hợp đồng active.
        var contractMap = contracts
            .GroupBy(c => c.TenantId)
            // Lấy hợp đồng mới nhất/active nhất (tùy thuộc vào logic của bạn)
            .Select(g => g.OrderByDescending(c => c.StartDate).First()) 
            .ToDictionary(
                c => c.TenantId,
                c => new PropertyDetailsDto
                {
                    // TenantContracts không biết CycleId, nên ta tạm để 0
                    CycleId = 0, 
                    HouseName = c.Room!.House!.Name,
                    RoomName = c.Room.Name,
                    Floor = c.Room!.Floor
                });

        // 4. Ánh xạ kết quả trở lại với danh sách CycleId ban đầu
        var results = new List<PropertyDetailsDto>();

        foreach (var (cycleId, userId) in cycleUserIds)
        {
            if (contractMap.TryGetValue(userId, out var propertyDetails))
            {
                // Gán lại CycleId cho DTO (vì PropertyService không biết CycleId)
                propertyDetails.CycleId = cycleId; 
                results.Add(propertyDetails);
            }
            else
            {
                 // Ghi log nếu không tìm thấy hợp đồng nào cho User ID này
                _logger.LogWarning("⚠️ Property Query: No active contract found for UserId {UserId} (Cycle {CycleId}).", 
                    userId, cycleId);
            }
        }
        
        return results;
    }
}