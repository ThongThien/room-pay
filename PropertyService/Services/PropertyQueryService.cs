using Microsoft.EntityFrameworkCore; 
using PropertyService.Data; 
using PropertyService.DTOs;
using PropertyService.Services.Interfaces;
using Microsoft.Extensions.Logging;
using PropertyService.Models.Enums;
namespace PropertyService.Services;

public class PropertyQueryService : IPropertyQueryService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PropertyQueryService> _logger;

    public PropertyQueryService(ApplicationDbContext context, ILogger<PropertyQueryService> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    public async Task<List<PropertyDetailsDto>> GetDetailsByCycleUserIdsAsync(
        List<CycleUserIdsRequestDto> cycleUserIds)
    {
        if (cycleUserIds == null || !cycleUserIds.Any())
        {
            _logger.LogWarning("Input list is null or empty. Returning empty result.");
            return new List<PropertyDetailsDto>();
        }

        // 1. Chuẩn bị IDs
        var firstRequest = cycleUserIds.First();
        _logger.LogWarning("🔥 Deserialization Check: First CycleId={CycleId}, UserId={UserId} (Length={Length})", 
            firstRequest.CycleId, firstRequest.UserId, firstRequest.UserId.Length);
        // Nếu UserID có độ dài 0, lỗi nằm ở Deserialize.

        var userIds = cycleUserIds
            .Select(c => c.UserId)
            .Where(id => !string.IsNullOrEmpty(id)) // Lọc ID rỗng trước khi đưa vào truy vấn DB
            .Distinct().ToList();
        
        _logger.LogInformation("➡️ Query Service: Received request for {CycleCount} cycles. Unique User IDs: {UserCount}", 
            cycleUserIds.Count, userIds.Count);
        
        // 2. Truy vấn TenantContracts và JOIN đến Room/House (LINQ to Entities)
        _logger.LogInformation("🔍 Query Service: Starting DB query for active contracts of {UserCount} users.", userIds.Count);

        var contracts = await _context.TenantContracts
            .Where(c => userIds.Contains(c.TenantId))
            // Lọc hợp đồng đang Active
            .Where(c => c.Status == ContractStatus.Active) 
            .Include(c => c.Room)
                .ThenInclude(r => r.House)
            // Lọc các bản ghi thiếu liên kết để tránh lỗi NULL Reference
            .Where(c => c.Room != null && c.Room.House != null)
            .ToListAsync();
        
        // ⭐ LOG ĐIỂM QUAN TRỌNG 1: Kiểm tra kết quả truy vấn DB ⭐
        if (contracts.Count == 0)
        {
            _logger.LogError("🛑 DB Query Failed: Found 0 active TenantContracts after JOIN/Filtering for {UserCount} users. Check DB data consistency (Contract Status, Room/House links).", userIds.Count);
            return new List<PropertyDetailsDto>();
        }
        _logger.LogInformation("✅ DB Query Success: Retrieved {Count} valid TenantContracts.", contracts.Count);

        // 3. Xây dựng Map: Map<UserId, RoomInfo>
        var contractMap = contracts
            .GroupBy(c => c.TenantId)
            // Lấy hợp đồng mới nhất (nếu có nhiều hợp đồng Active)
            .Select(g => g.OrderByDescending(c => c.StartDate).First()) 
            .ToDictionary(
                c => c.TenantId,
                c => new PropertyDetailsDto
                {
                    Floor = c.Room!.Floor, 
                    HouseName = c.Room!.House!.Name ?? string.Empty,
                    RoomName = c.Room!.Name ?? string.Empty,
                    CycleId = 0 
                });
        
        // ⭐ LOG ĐIỂM QUAN TRỌNG 2: Kiểm tra kết quả Mapping Dictionary ⭐
        if (contractMap.Count == 0)
        {
            _logger.LogError("🛑 Mapping Failed: contractMap is empty despite finding {ContractCount} contracts. Error in GroupBy/Select logic.", contracts.Count);
            return new List<PropertyDetailsDto>();
        }
        _logger.LogInformation("✅ Mapping Success: Created Property Map for {Count} unique Tenant IDs.", contractMap.Count);
        
        // 4. Ánh xạ ngược lại với CycleId
        var results = new List<PropertyDetailsDto>();
        int mappedCount = 0;
        int unmappedCount = 0;

        foreach (var req in cycleUserIds)
        {
            if (contractMap.TryGetValue(req.UserId, out var propertyDetails))
            {
                // Thêm kết quả đã gán CycleId vào danh sách trả về
                results.Add(new PropertyDetailsDto
                {
                    CycleId = req.CycleId, 
                    Floor = propertyDetails.Floor,
                    HouseName = propertyDetails.HouseName,
                    RoomName = propertyDetails.RoomName,
                });
                mappedCount++;
            }
            else
            {
                // ⭐ LOG ĐIỂM QUAN TRỌNG 3: Log các bản ghi bị thiếu ánh xạ ⭐
                _logger.LogWarning("⚠️ Missing Map: Cannot find contract for Cycle={CycleId}, User={UserId}. Result will not include this item.", 
                    req.CycleId, req.UserId);
                unmappedCount++;
            }
        }
        
        // ⭐ LOG ĐIỂM QUAN TRỌNG 4: Kết quả cuối cùng ⭐
        _logger.LogInformation("⬅️ Query Service Finished: Mapped {MappedCount} items, missed {UnmappedCount} items. Total results: {TotalCount}", 
            mappedCount, unmappedCount, results.Count);

        return results;
    }
}