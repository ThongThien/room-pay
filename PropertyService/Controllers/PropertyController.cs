using Microsoft.AspNetCore.Mvc;
using PropertyService.Services.Interfaces;
using PropertyService.DTOs;
using System.Net;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System; // Cần thiết cho Guid

[ApiController]
[Route("api/[controller]")] // Route: api/property
public class PropertyController : ControllerBase
{
    private readonly IPropertyQueryService _queryService;
    private readonly IConfiguration _configuration; 
    private readonly ILogger<PropertyController> _logger; 
    
    //  ĐÃ THÊM: Khai báo Service cần thiết
    private readonly IContractService _contractService; 

    //  ĐÃ SỬA: Inject IContractService vào Constructor
    public PropertyController(
        IPropertyQueryService queryService, 
        IConfiguration configuration, 
        ILogger<PropertyController> logger,
        IContractService contractService //  Inject Contract Service
    )
    {
        _queryService = queryService;
        _configuration = configuration;
        _logger = logger;
        _contractService = contractService; //  Gán giá trị
    }

    // Endpoint mới để tra cứu chi tiết Property bằng Contract ID (Đã có)
    // URL: POST api/property/details-by-contracts
    [HttpPost("details-by-contracts")]
    [ProducesResponseType(typeof(List<PropertyDetailsDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<PropertyDetailsDto>>> GetDetailsByContracts(
        [FromBody] List<int> contractIds) 
    {
        if (contractIds == null || !contractIds.Any())
        {
            return Ok(Enumerable.Empty<PropertyDetailsDto>());
        }
        
        var results = await _queryService.GetDetailsByContractIdsAsync(contractIds);
        
        _logger.LogWarning("🔥 Final Output Check: Returning {Count} Property details based on Contracts.", results.Count);
        return Ok(results);
    }

    //  HÀM MỚI: Get Active Contract ID for Service-to-Service
    // URL: GET api/property/active-id/{userId}
    [HttpGet("active-id/{userId}")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<int?>> GetActiveContractIdForService(string userId)
    {
        //  LƯU Ý BẢO MẬT: Bạn nên thêm cơ chế kiểm tra API Key/Header Service-to-Service tại đây.
        
        if (!Guid.TryParse(userId, out var tenantId)) 
        {
             _logger.LogWarning("Invalid User ID format received: {UserId}", userId);
             return BadRequest("Invalid User ID format.");
        }
        
        try
        {
            // 1. Gọi hàm Service đã có
            // Lưu ý: Hàm này trả về ContractDto. Ta chỉ lấy Id.
            var contract = await _contractService.GetActiveContractByTenantIdAsync(tenantId);
            
            if (contract == null) 
            {
                 _logger.LogInformation("No active contract found for user ID: {TenantId}", tenantId);
                // Trả về 204 No Content nếu không tìm thấy
                return NoContent(); 
            }
            
            // 2. Trả về Contract ID đơn thuần (int)
            _logger.LogInformation("Active Contract ID found: {ContractId} for user ID: {TenantId}", contract.Id, tenantId);
            return Ok(contract.Id); 
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active contract ID for user {UserId}", userId);
            return StatusCode(500, "Internal server error during contract lookup.");
        }
    }
}