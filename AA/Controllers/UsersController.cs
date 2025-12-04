using Microsoft.AspNetCore.Mvc;
using AA.Features.Users;
using Microsoft.Extensions.Logging;

namespace AA.Controllers;

[ApiController]
[Route("api/[controller]")] 
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserService userService, ILogger<UsersController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    /// <summary>
    /// Kiểm tra User ID có tồn tại và có là Tenant hợp lệ không.
    /// </summary>
    /// <param name="tenantId">ID của người thuê (kiểu string trong Identity)</param>
    /// <returns>200 OK nếu hợp lệ, 404 Not Found nếu không</returns>
    // Endpoint: GET /api/users/{tenantId}/exists
    [HttpGet("{tenantId}/exists")]
    public async Task<IActionResult> CheckTenantExists(string tenantId) 
    {
        if (string.IsNullOrEmpty(tenantId))
        {
            return BadRequest("Tenant ID is required.");
        }

        try
        {
            var exists = await _userService.CheckTenantExistenceAndRoleAsync(tenantId);
            
            if (!exists)
            {
                _logger.LogWarning($"User ID {tenantId} not found or is not a designated Tenant.");
                return NotFound();
            }

            return Ok(); 
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Lỗi khi kiểm tra Tenant ID {tenantId}.");
            return StatusCode(500, "Internal Server Error");
        }
    }
    [HttpGet("{userId}")]
    [ProducesResponseType(typeof(object), 200)] 
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetUserById(string userId)
    {
        var user = await _userService.GetUserByIdAsync(userId);
        
        if (user == null)
        {
            return NotFound();
        }

        return Ok(user); 
    }
}