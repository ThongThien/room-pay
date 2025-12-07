// File: PropertyService/Controllers/PropertyController.cs

using Microsoft.AspNetCore.Mvc;
using PropertyService.Services.Interfaces;
using PropertyService.DTOs; // Giả sử PropertyDetailsDto nằm ở đây
using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration; // Để đọc ServiceApiKey
using Microsoft.Extensions.Logging; // Để ghi log

namespace PropertyService.Controllers;

// File: PropertyService/Controllers/PropertyController.cs (Tạo mới)

[ApiController]
[Route("api/[controller]")] // Route: api/property
public class PropertyController : ControllerBase
{
    private readonly IPropertyQueryService _queryService;
    private readonly IConfiguration _configuration;
    // ... (Logger)

    public PropertyController(IPropertyQueryService queryService, IConfiguration configuration, ILogger<PropertyController> logger)
    {
        _queryService = queryService;
        _configuration = configuration;
        // ...
    }

    [HttpPost("details-by-cycles")] // ⭐ ROUTE CẦN THIẾT: api/property/details-by-cycles
    [AllowAnonymous] 
    [ProducesResponseType(typeof(List<PropertyDetailsDto>), (int)HttpStatusCode.OK)]
    public async Task<IActionResult> GetDetailsByCycleIds([FromBody] List<(int CycleId, string UserId)> cycleUserIds)
    {
        // 1. Kiểm tra API Key (Service-to-Service Authentication)
        var apiKey = Request.Headers["X-Service-Api-Key"].FirstOrDefault();
        var configuredApiKey = _configuration["ServiceApiKey"];
        
        if (string.IsNullOrEmpty(apiKey) || apiKey != configuredApiKey)
        {
            return Unauthorized(new { error = "Invalid or missing authentication" });
        }
        
        // 2. Gọi Service Query
        var details = await _queryService.GetDetailsByCycleUserIdsAsync(cycleUserIds);
        
        return Ok(details);
    }
}