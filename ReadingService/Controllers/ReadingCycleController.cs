using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using ReadingService.Features.ReadingCycle;
using ReadingService.Features.ReadingCycle.DTOs;
using ReadingService.Features.MonthlyReading; 
using ReadingService.Features.MonthlyReading.DTOs;
using ReadingService.Services;
using ReadingService.Features.User;
using ReadingService.Features.Property;
using ReadingService.Features.User.DTOs;
using ReadingService.Features.Property.DTOs;

namespace ReadingService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReadingCycleController : ControllerBase
{
    private readonly IReadingCycleService _readingCycleService;
    private readonly IMonthlyReadingService _monthlyReadingService;
    private readonly ILogger<ReadingCycleController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IMessageProducer _rabbitMqProducer; 
    private readonly IUserService _userService;  
    private readonly IPropertyService _propertyService;
    public ReadingCycleController(IReadingCycleService readingCycleService,
    IMonthlyReadingService monthlyReadingService,
    ILogger<ReadingCycleController> logger,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IMessageProducer rabbitMqProducer,
    IUserService userService,
    IPropertyService propertyService)
    {
        _readingCycleService = readingCycleService;
        _monthlyReadingService = monthlyReadingService;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _rabbitMqProducer = rabbitMqProducer;
        _userService = userService;
        _propertyService = propertyService;
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
        var cycles = await _readingCycleService.GetByUserIdAsync(userId);
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

        var cycle = await _readingCycleService.GetByIdAsync(id);

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
    public async Task<ActionResult> CreateReadingCycle([FromBody] CreateReadingCycleDto createDto) // Thêm [FromBody] để rõ ràng
    {
        // 1. LOG INPUT
        _logger.LogInformation("🟢 [START] API CreateReadingCycle Triggered. Payload: Month={Month}, Year={Year}", 
            createDto.CycleMonth, createDto.CycleYear);

        if (createDto.CycleMonth < 1 || createDto.CycleMonth > 12)
        {
            _logger.LogWarning("⚠️ [VALIDATION] Invalid Month: {Month}", createDto.CycleMonth);
            return BadRequest(new { message = "Tháng không hợp lệ (1-12)." });
        }

        var ownerId = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                    ?? User.FindFirstValue("sub") 
                    ?? User.FindFirstValue("userId");
        
        if (string.IsNullOrEmpty(ownerId)) 
        {
            _logger.LogWarning("⚠️ [AUTH] Cannot find OwnerId in Token.");
            return Unauthorized();
        }

        _logger.LogInformation("👤 Owner ID Identified: {OwnerId}", ownerId);

        try
        {
            // 2. LOG QUÁ TRÌNH LẤY TENANT
            var allTenants = await GetTenantsByOwnerAsync(ownerId);
            if (allTenants == null || !allTenants.Any())
            {
                _logger.LogWarning("⚠️ No tenants found for Owner {OwnerId}", ownerId);
                return BadRequest(new { message = "Không tìm thấy khách thuê nào." });
            }

            _logger.LogInformation("📋 Found {Count} total tenants for Owner {OwnerId}. Starting processing...", allTenants.Count, ownerId);

            var createdCount = 0;
            var skippedCount = 0;
            var customersToNotify = new List<TenantDto>(); 

            foreach (var tenant in allTenants)
            {
                _logger.LogInformation("👉 Processing Tenant: {Id} ({Name})", tenant.Id, tenant.FullName);

                // 3. LOG CHECK CONTRACT
                var activeContractId = await _propertyService.GetActiveContractIdByUserIdAsync(tenant.Id);

                if (!activeContractId.HasValue)
                {
                    _logger.LogInformation("   ⏭️ SKIPPED: Tenant {Id} has NO ACTIVE CONTRACT.", tenant.Id);
                    skippedCount++;
                    continue; 
                }
                
                _logger.LogInformation("   ✅ Contract Found: ID {ContractId}", activeContractId.Value);

                // 4. LOG CHECK EXISTS
                var exists = await _readingCycleService.ExistsAsync(tenant.Id, createDto.CycleMonth, createDto.CycleYear);
                if (exists)
                {
                    _logger.LogInformation("   ⏭️ SKIPPED: Cycle for {Month}/{Year} ALREADY EXISTS for Tenant {Id}.", createDto.CycleMonth, createDto.CycleYear, tenant.Id);
                    skippedCount++;
                    continue;
                }

                try 
                {
                    // 5. LOG TẠO CYCLE
                    _logger.LogInformation("   🔄 Creating ReadingCycle...");
                    var cycleDto = await _readingCycleService.CreateAsync(tenant.Id, createDto);
                    _logger.LogInformation("   ✅ Cycle Created. ID: {CycleId}", cycleDto.Id);

                    // 6. LOG TẠO MONTHLY READING
                    _logger.LogInformation("   🔄 Creating MonthlyReading...");
                    var readingDto = await _monthlyReadingService.CreateEmptyAsync(
                        cycleDto.Id, 
                        activeContractId.Value
                    );
                    _logger.LogInformation("   ✅ MonthlyReading Created. ID: {ReadingId}, OldElec: {EOld}, OldWater: {WOld}", 
                        readingDto.Id, readingDto.ElectricOld, readingDto.WaterOld);

                    createdCount++;
                    customersToNotify.Add(tenant);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ ERROR creating data for Tenant {TenantId}. StackTrace: {Trace}", tenant.Id, ex.StackTrace);
                }
            }

            // 7. LOG RABBITMQ
            // ReadingCycleController.cs
            if (customersToNotify.Any())
            {
                _logger.LogInformation("📧 Preparing RabbitMQ message for {Count} users...", customersToNotify.Count);
                
                var notificationMessage = new 
                {
                    Type = "NewCycle",
                    CycleMonth = createDto.CycleMonth,
                    CycleYear = createDto.CycleYear,
                    CustomersToNotify = customersToNotify.Select(t => new { t.Id, t.FullName, t.Email }).ToList() 
                };
                
                // Dòng có vấn đề:
                _rabbitMqProducer.SendMessage(notificationMessage, "notification_queue"); 
                
                _logger.LogInformation("🚀 RabbitMQ Message Sent Successfully.");
            }
            else
            {
                _logger.LogInformation("📭 No new cycles created, skipping RabbitMQ.");
            }

            _logger.LogInformation("🟢 [END] Process Completed. Created: {Created}, Skipped: {Skipped}", createdCount, skippedCount);

            return Ok(new 
            { 
                message = $"Hoàn tất. Tạo mới: {createdCount}. Bỏ qua: {skippedCount}.",
                created = createdCount,
                skipped = skippedCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ CRITICAL ERROR in CreateReadingCycle.");
            return StatusCode(500, new { message = "Lỗi nội bộ server." });
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

        var success = await _readingCycleService.UpdateAsync(id, updateDto);

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
        var success = await _readingCycleService.DeleteAsync(id);

        if (!success)
        {
            return NotFound(new { message = "Reading cycle not found" });
        }

        return NoContent();
    }
}
