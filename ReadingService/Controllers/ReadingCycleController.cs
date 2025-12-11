using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ReadingService.Features.ReadingCycle;
using ReadingService.Features.ReadingCycle.DTOs;
using ReadingService.Features.MonthlyReading; 
using ReadingService.Features.MonthlyReading.DTOs;
namespace ReadingService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReadingCycleController : ControllerBase
{
    private readonly IReadingCycleService _service;
    private readonly IMonthlyReadingService _monthlyReadingService;
    private readonly ILogger<ReadingCycleController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public ReadingCycleController(IReadingCycleService service,
    IMonthlyReadingService monthlyReadingService,
    ILogger<ReadingCycleController> logger,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration)
    {
        _service = service;
        _monthlyReadingService = monthlyReadingService;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    // GetMyMissingReadings
    /// <summary>
    /// Get past reading cycles where the logged-in user has not submitted or submitted incomplete readings.
    /// </summary>
    /// <returns>MissingReadingsResponseDto</returns>
    // ReadingService/Controllers/ReadingCycleController.cs (Only change this function)
    [HttpGet("me/missing-readings")] 
    public async Task<ActionResult<MissingReadingsResponseDto>> GetMyMissingReadings()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                         ?? User.FindFirstValue("sub") 
                         ?? User.FindFirstValue("userId");
        
        // Convert to Guid for passing to Service
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var tenantId))
        {
            return Unauthorized(new { success = false, message = "Không tìm thấy hoặc User ID không hợp lệ." });
        }
        
        try
        {
            // CALL UPDATED FUNCTION (Strict filtering by tenantId in Service)
            var result = await _monthlyReadingService.GetMissingReadingsAsync(tenantId);
            
            return Ok(new 
            { 
                success = true, 
                message = "Missing readings retrieved successfully.", 
                data = result 
            });
        }
        catch (Exception ex)
        {
             _logger.LogError(ex, "Error retrieving missing readings for user {TenantId}", tenantId); //  Fixed CS0168
            return StatusCode(500, new { success = false, message = "Có lỗi xảy ra khi lấy danh sách chỉ số còn thiếu." });
        }
    }


    // GET: api/ReadingCycle
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ReadingCycleDto>>> GetReadingCycles()
    {
        // Get current user ID from JWT token
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
        }

        // Only get cycles for current user
        var cycles = await _service.GetByUserIdAsync(userId);
        return Ok(cycles);
    }

    // GET: api/ReadingCycle/5
    [HttpGet("{id}")]
    public async Task<ActionResult<ReadingCycleDto>> GetReadingCycle(int id)
    {
        // Get userId from JWT token
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
        }

        var cycle = await _service.GetByIdAsync(id);

        if (cycle == null)
        {
            return NotFound(new { message = "Reading cycle not found" });
        }

        // Check if cycle belongs to this user
        if (cycle.UserId != userId)
        {
            return Forbid(); // 403 Forbidden
        }

        return Ok(cycle);
    }

    // POST: api/ReadingCycle trigger owner create or auto creation on 20th of every month
    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<ActionResult> CreateReadingCycle(CreateReadingCycleDto createDto)
    {
        // Validate month
        if (createDto.CycleMonth < 1 || createDto.CycleMonth > 12)
        {
            return BadRequest(new { message = "Cycle month must be between 1 and 12" });
        }

        // Get current owner ID
        var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                     ?? User.FindFirstValue("sub") 
                     ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(ownerId))
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin người dùng" });
        }

        try
        {
            // Get all tenants for this owner
            var tenants = await GetTenantsByOwnerAsync(ownerId);
            if (tenants == null || !tenants.Any())
            {
                return BadRequest(new { message = "No tenants found for this owner" });
            }

            var createdCycles = new List<ReadingCycleDto>();
            var skippedCycles = new List<string>();

            foreach (var tenant in tenants)
            {
                // Check if cycle already exists for this tenant
                var exists = await _service.ExistsAsync(tenant.Id, createDto.CycleMonth, createDto.CycleYear);
                if (exists)
                {
                    skippedCycles.Add(tenant.Id);
                    continue;
                }

                var cycle = await _service.CreateAsync(tenant.Id, new CreateReadingCycleDto
                {
                    CycleMonth = createDto.CycleMonth,
                    CycleYear = createDto.CycleYear
                });

                createdCycles.Add(cycle);
            }

            return Ok(new 
            { 
                message = $"Created {createdCycles.Count} reading cycles, skipped {skippedCycles.Count} existing ones",
                created = createdCycles,
                skipped = skippedCycles
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating reading cycles for owner {OwnerId}", ownerId);
            return StatusCode(500, new { message = "Có lỗi xảy ra khi tạo chu kỳ đọc" });
        }
    }

    private async Task<List<TenantDto>?> GetTenantsByOwnerAsync(string ownerId)
    {
        var client = _httpClientFactory.CreateClient("AA");
        var apiKey = _configuration["ServiceApiKey"];

        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("ServiceApiKey not configured");
            return null;
        }

        client.DefaultRequestHeaders.Add("X-Service-Api-Key", apiKey);

        try
        {
            var response = await client.GetAsync($"api/users/owner/{ownerId}/tenants");
            if (response.IsSuccessStatusCode)
            {
                var tenants = await response.Content.ReadFromJsonAsync<List<TenantDto>>();
                return tenants;
            }
            else
            {
                _logger.LogError("Failed to get tenants for owner {OwnerId}: {StatusCode}", ownerId, response.StatusCode);
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling AA service for tenants of owner {OwnerId}", ownerId);
            return null;
        }
    }

    public class TenantDto
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? OwnerId { get; set; }
    }

    // PUT: api/ReadingCycle/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReadingCycle(int id, UpdateReadingCycleDto updateDto)
    {
        // Validate month if provided
        if (updateDto.CycleMonth.HasValue && (updateDto.CycleMonth.Value < 1 || updateDto.CycleMonth.Value > 12))
        {
            return BadRequest(new { message = "Cycle month must be between 1 and 12" });
        }

        var success = await _service.UpdateAsync(id, updateDto);

        if (!success)
        {
            return NotFound(new { message = "Reading cycle not found" });
        }

        return NoContent();
    }

    // DELETE: api/ReadingCycle/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReadingCycle(int id)
    {
        var success = await _service.DeleteAsync(id);

        if (!success)
        {
            return NotFound(new { message = "Reading cycle not found" });
        }

        return NoContent();
    }
}
