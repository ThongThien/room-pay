using Microsoft.AspNetCore.Mvc;
using System.Net.WebSockets;

namespace InvoiceService.Controllers;

[ApiController]
[Route("ws")]
public class WebSocketController : ControllerBase
{
    private readonly Services.PaymentWebSocketHandler _wsHandler;
    private readonly ILogger<WebSocketController> _logger;

    public WebSocketController(
        Services.PaymentWebSocketHandler wsHandler,
        ILogger<WebSocketController> logger)
    {
        _wsHandler = wsHandler;
        _logger = logger;
    }

    /// <summary>
    /// WebSocket endpoint for real-time payment status updates
    /// </summary>
    [HttpGet("payment-status/{invoiceId:int}")]
    public async Task<IActionResult> PaymentStatus(int invoiceId)
    {
        if (HttpContext.WebSockets.IsWebSocketRequest)
        {
            var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
            _logger.LogInformation("WebSocket connection accepted for invoice {InvoiceId}", invoiceId);
            
            await _wsHandler.HandleWebSocketAsync(webSocket, invoiceId);
            
            return new EmptyResult();
        }
        else
        {
            _logger.LogWarning("Non-WebSocket request to WebSocket endpoint for invoice {InvoiceId}", invoiceId);
            return BadRequest(new { error = "This endpoint only accepts WebSocket connections" });
        }
    }
}
