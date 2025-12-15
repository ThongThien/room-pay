using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TicketService.Features.Tickets;
using TicketService.Features.Tickets.DTOs;

namespace TicketService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TicketController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public TicketController(ITicketService ticketService)
    {
        _ticketService = ticketService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var ticket = await _ticketService.CreateTicketAsync(userId, dto);
        return CreatedAtAction(nameof(CreateTicket), new { id = ticket.Id }, ticket);
    }

    [HttpGet]
    public async Task<IActionResult> GetMyTickets()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var tickets = await _ticketService.GetTicketsByTenantIdAsync(userId);
        return Ok(tickets);
    }

    [HttpGet("owner")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> GetTicketsForOwner()
    {
        var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(ownerId))
        {
            return Unauthorized();
        }

        var tickets = await _ticketService.GetTicketsByOwnerIdAsync(ownerId);
        return Ok(tickets);
    }

    [HttpPost("{id}/close")]
    public async Task<IActionResult> CloseTicket(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var result = await _ticketService.CloseTicketAsync(id, userId);
        if (!result)
        {
            return NotFound(new { message = "Ticket not found or you don't have permission to close it." });
        }

        return Ok(new { message = "Ticket closed successfully." });
    }

    [HttpPost("{id}/accept")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> AcceptTicket(int id)
    {
        var ownerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(ownerId))
        {
            return Unauthorized();
        }

        var result = await _ticketService.AcceptTicketAsync(id, ownerId);
        if (!result)
        {
            return NotFound(new { message = "Ticket not found or cannot be accepted." });
        }

        return Ok(new { message = "Ticket accepted and status changed to InProgress." });
    }
}
