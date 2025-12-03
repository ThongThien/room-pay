using AA.Features.Users;
using AA.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AA.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        IUserService userService,
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        ILogger<UsersController> logger)
    {
        _userService = userService;
        _userManager = userManager;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Check if Tenant exists by ID (Service-to-service)
    /// </summary>
    /// <param name="tenantId">ID của người thuê</param>
    /// <returns>200 OK nếu tenant hợp lệ, 404 Not Found nếu không tồn tại</returns>
    [HttpGet("{tenantId}/exists")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckTenantExists(string tenantId)
    {
        if (string.IsNullOrEmpty(tenantId))
        {
            return BadRequest(new { error = "Tenant ID is required" });
        }

        try
        {
            var exists = await _userService.CheckTenantExistenceAndRoleAsync(tenantId);

            if (!exists)
            {
                _logger.LogWarning($"Tenant ID {tenantId} not found or is not a valid tenant");
                return NotFound(new { error = "Tenant not found or invalid" });
            }

            return Ok(new { message = "Tenant exists", tenantId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error checking tenant ID {tenantId}");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Get user information by ID (Service-to-service)
    /// </summary>
    [HttpGet("{userId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetUserById(string userId)
    {
        // Validate service API key
        var apiKey = Request.Headers["X-Service-Api-Key"].FirstOrDefault();
        var configuredApiKey = _configuration["ServiceApiKey"];
        
        if (string.IsNullOrEmpty(apiKey) || apiKey != configuredApiKey)
        {
            _logger.LogWarning("Invalid or missing API key for GetUserById");
            return Unauthorized(new { error = "Invalid or missing authentication" });
        }

        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
        {
            return NotFound(new { error = $"User with ID {userId} not found" });
        }

        return Ok(new
        {
            id = user.Id,
            fullName = user.FullName,
            email = user.Email,
            ownerId = user.OwnerId
        });
    }

    /// <summary>
    /// Get all users (tenants) owned by a specific owner (Service-to-service)
    /// </summary>
    [HttpGet("owner/{ownerId}/tenants")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTenantsByOwner(string ownerId)
    {
        // Validate service API key
        var apiKey = Request.Headers["X-Service-Api-Key"].FirstOrDefault();
        var configuredApiKey = _configuration["ServiceApiKey"];
        
        if (string.IsNullOrEmpty(apiKey) || apiKey != configuredApiKey)
        {
            _logger.LogWarning("Invalid or missing API key for GetTenantsByOwner");
            return Unauthorized(new { error = "Invalid or missing authentication" });
        }

        // Verify the owner exists
        var owner = await _userManager.FindByIdAsync(ownerId);
        if (owner == null)
        {
            return NotFound(new { error = $"Owner with ID {ownerId} not found" });
        }

        // Get all users where OwnerId = ownerId
        var tenants = await _userManager.Users
            .Where(u => u.OwnerId == ownerId)
            .Select(u => new
            {
                id = u.Id,
                fullName = u.FullName,
                email = u.Email,
                ownerId = u.OwnerId
            })
            .ToListAsync();

        return Ok(tenants);
    }
}