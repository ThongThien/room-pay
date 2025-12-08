using Microsoft.EntityFrameworkCore; 
using PropertyService.Data; 
using PropertyService.DTOs;
using PropertyService.Services.Interfaces;
using Microsoft.Extensions.Logging;
using PropertyService.Models.Enums;
using System.Linq;

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
    
    //  ĐÃ SỬA: Đảm bảo Include() để tránh NullReferenceException
    public async Task<List<PropertyDetailsDto>> GetDetailsByContractIdsAsync(
        List<int> contractIds)
    {
        if (contractIds == null || !contractIds.Any())
        {
            _logger.LogWarning("Input Contract ID list is null or empty. Returning empty result.");
            return new List<PropertyDetailsDto>();
        }

        var uniqueContractIds = contractIds.Distinct().ToList();
        
        _logger.LogInformation("➡️ Query Service: Received request for {Count} unique Contract IDs.", uniqueContractIds.Count);
        
        var results = await _context.TenantContracts
            
            //  KHẮC PHỤC LỖI NRE: Bắt buộc Include các mối quan hệ trước khi Select
            .Include(c => c.Room)
                .ThenInclude(r => r.House)
                
            .Where(c => uniqueContractIds.Contains(c.Id)) // Lọc theo danh sách Contract ID
            
            //  SỬ DỤNG PROJECTION VÀ NULL CONDITIONAL OPERATOR (?.) ĐỂ ÁNH XẠ AN TOÀN
            // c.Room/c.Room.House có thể là NULL nếu DB không nhất quán.
            .Select(c => new PropertyDetailsDto
            {
                ContractId = c.Id, 
                // Sử dụng ?. hoặc !. (nếu bạn chắc chắn có data, nhưng ?. là an toàn nhất)
                // Giả định Room!.Name và Room!.Floor là các trường hợp lệ
                Floor = c.Room!.Floor, 
                HouseName = c.Room!.House!.Name ?? string.Empty,
                RoomName = c.Room!.Name ?? string.Empty,
            })
            .ToListAsync();

        //  LOG ĐIỂM QUAN TRỌNG: Kiểm tra kết quả truy vấn DB 
        if (results.Count != uniqueContractIds.Count)
        {
            _logger.LogWarning("⚠️ Found {FoundCount} details out of {RequestedCount} requested contracts. Missing details for some IDs (Do liên kết Room/House bị thiếu).", 
                results.Count, uniqueContractIds.Count);
        }
        else
        {
            _logger.LogInformation("✅ DB Query Success: Retrieved details for all {Count} contracts.", results.Count);
        }
        
        return results;
    }
    
    // Xóa hoặc không sử dụng hàm GetDetailsByCycleUserIdsAsync
}