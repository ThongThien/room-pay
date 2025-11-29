using Microsoft.AspNetCore.Mvc;
using PropertyService.Services.Interfaces;
using PropertyService.DTOs.Houses;
using System.Security.Claims;

namespace PropertyService.Controllers;

[ApiController]
[Route("api/houses")]
public class HouseController : ControllerBase
{
    private readonly IHouseService _service;

    public HouseController(IHouseService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateHouseDto dto)
    {
        Guid ownerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var createdHouse = await _service.CreateAsync(dto, ownerId);

        return Ok(new
        {
            success = true,
            message = "House created successfully",
            data = createdHouse
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        Guid ownerId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var houses = await _service.GetAllAsync(ownerId);

        return Ok(new
        {
            success = true,
            message = "Houses retrieved successfully",
            data = houses
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var house = await _service.GetByIdAsync(id);
        if (house == null)
        {
            return NotFound(new
            {
                success = false,
                message = "House not found"
            });
        }

        return Ok(new
        {
            success = true,
            message = "House retrieved successfully",
            data = house
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, UpdateHouseDto dto)
    {
        var house = await _service.GetByIdAsync(id);
        if (house == null)
        {
            return NotFound(new
            {
                success = false,
                message = "House not found"
            });
        }

        await _service.UpdateAsync(id, dto);

        return Ok(new
        {
            success = true,
            message = "House updated successfully"
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var house = await _service.GetByIdAsync(id);
        if (house == null)
        {
            return NotFound(new
            {
                success = false,
                message = "House not found"
            });
        }

        await _service.DeleteAsync(id);

        return Ok(new
        {
            success = true,
            message = "House deleted successfully"
        });
    }
}
