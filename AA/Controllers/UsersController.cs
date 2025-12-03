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
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        UserManager<ApplicationUser> userManager,
        IConfiguration configuration,
        ILogger<UsersController> logger)
    {
        _userManager = userManager;
        _configuration = configuration;
        _logger = logger;
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