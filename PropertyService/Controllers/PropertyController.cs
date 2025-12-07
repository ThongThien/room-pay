using Microsoft.AspNetCore.Mvc;
using PropertyService.Services.Interfaces;
using PropertyService.DTOs; 
using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration; 
using Microsoft.Extensions.Logging; 
using Microsoft.EntityFrameworkCore;
namespace PropertyService.Controllers;

[ApiController]
[Route("api/[controller]")] // Route: api/property
public class PropertyController : ControllerBase
{
    private readonly IPropertyQueryService _queryService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PropertyController> _logger;   
    public PropertyController(IPropertyQueryService queryService, IConfiguration configuration, ILogger<PropertyController> logger)
    {
        _queryService = queryService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("details-by-cycles")]
    [ProducesResponseType(typeof(List<PropertyDetailsDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<PropertyDetailsDto>>> GetDetailsByCycles(
        [FromBody] List<CycleUserIdsRequestDto> cycleUserIds)
    {
        if (cycleUserIds == null || !cycleUserIds.Any())
        {
            return BadRequest("Input list cannot be empty.");
        }
        
        var results = await _queryService.GetDetailsByCycleUserIdsAsync(cycleUserIds);
        _logger.LogWarning("🔥 Final Output Check: Returning {Count} Property details.", results.Count);
        return Ok(results);
    }
}