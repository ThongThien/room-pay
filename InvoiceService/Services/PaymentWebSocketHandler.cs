using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace InvoiceService.Services;

public class PaymentWebSocketHandler
{
    private readonly ConcurrentDictionary<int, List<WebSocket>> _connections = new();
    private readonly ILogger<PaymentWebSocketHandler> _logger;

    public PaymentWebSocketHandler(ILogger<PaymentWebSocketHandler> logger)
    {
        _logger = logger;
    }

    public async Task HandleWebSocketAsync(WebSocket webSocket, int invoiceId)
    {
        // Add connection to the list for this invoice
        var connections = _connections.GetOrAdd(invoiceId, _ => new List<WebSocket>());
        lock (connections)
        {
            connections.Add(webSocket);
        }

        _logger.LogInformation("WebSocket connected for invoice {InvoiceId}. Total connections: {Count}", 
            invoiceId, connections.Count);

        try
        {
            var buffer = new byte[1024 * 4];
            var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

            while (!result.CloseStatus.HasValue)
            {
                // Keep connection alive, wait for close
                result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }

            await webSocket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "WebSocket error for invoice {InvoiceId}", invoiceId);
        }
        finally
        {
            // Remove connection from the list
            lock (connections)
            {
                connections.Remove(webSocket);
                if (connections.Count == 0)
                {
                    _connections.TryRemove(invoiceId, out _);
                }
            }

            _logger.LogInformation("WebSocket disconnected for invoice {InvoiceId}", invoiceId);
        }
    }

    public async Task NotifyPaymentStatusAsync(int invoiceId, string status)
    {
        if (!_connections.TryGetValue(invoiceId, out var connections))
        {
            _logger.LogInformation("No active WebSocket connections for invoice {InvoiceId}", invoiceId);
            return;
        }

        var message = JsonSerializer.Serialize(new
        {
            invoiceId,
            invoiceStatus = status,
            timestamp = DateTime.UtcNow
        });

        var messageBytes = Encoding.UTF8.GetBytes(message);
        var segment = new ArraySegment<byte>(messageBytes);

        var disconnectedSockets = new List<WebSocket>();

        foreach (var socket in connections.ToList())
        {
            try
            {
                if (socket.State == WebSocketState.Open)
                {
                    await socket.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
                    _logger.LogInformation("Sent payment status update to client for invoice {InvoiceId}: {Status}", 
                        invoiceId, status);
                }
                else
                {
                    disconnectedSockets.Add(socket);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending WebSocket message for invoice {InvoiceId}", invoiceId);
                disconnectedSockets.Add(socket);
            }
        }

        // Clean up disconnected sockets
        lock (connections)
        {
            foreach (var socket in disconnectedSockets)
            {
                connections.Remove(socket);
            }

            if (connections.Count == 0)
            {
                _connections.TryRemove(invoiceId, out _);
            }
        }
    }
}
