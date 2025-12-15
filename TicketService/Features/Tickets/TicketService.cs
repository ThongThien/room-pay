using TicketService.Data;
using TicketService.Features.Tickets.DTOs;
using TicketService.Models;
using TicketService.Models.Enums;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;

namespace TicketService.Features.Tickets;

public class TicketService : ITicketService
{
    private readonly ApplicationDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public TicketService(ApplicationDbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _context = context;
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
    }

    public async Task<Ticket> CreateTicketAsync(string userId, CreateTicketDto dto)
    {
        var apiKey = _configuration["ServiceApiKey"] ?? "InternalService_SecretKey_2024_ChangeMeInProduction";

        // Get OwnerId from AA service
        var aaBaseUrl = _configuration["Services:AA"];
        var ownerRequest = new HttpRequestMessage(HttpMethod.Get, $"{aaBaseUrl}/api/users/{userId}");
        ownerRequest.Headers.Add("X-Service-Api-Key", apiKey);
        var ownerResponse = await _httpClient.SendAsync(ownerRequest);
        string? ownerId = null;
        if (ownerResponse.IsSuccessStatusCode)
        {
            var ownerData = await ownerResponse.Content.ReadFromJsonAsync<UserResponse>();
            ownerId = ownerData?.OwnerId;
        }
        else if (ownerResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // User not found, ownerId remains null
        }
        else
        {
            ownerResponse.EnsureSuccessStatusCode();
        }

        // Get ContractId from PropertyService
        var propertyBaseUrl = _configuration["Services:Property"];
        var contractRequest = new HttpRequestMessage(HttpMethod.Get, $"{propertyBaseUrl}/api/tenant/contracts/active/{userId}");
        contractRequest.Headers.Add("X-Service-Api-Key", apiKey);
        var contractResponse = await _httpClient.SendAsync(contractRequest);
        int contractId = 0;
        if (contractResponse.IsSuccessStatusCode)
        {
            var contractData = await contractResponse.Content.ReadFromJsonAsync<ContractResponse>();
            contractId = contractData?.ContractId ?? 0;
        }
        else if (contractResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // No active contract, contractId remains 0
        }
        else
        {
            contractResponse.EnsureSuccessStatusCode();
        }

        var ticket = new Ticket
        {
            TenantId = userId,
            OwnerId = ownerId,
            ContractId = contractId,
            Title = dto.Title,
            Description = dto.Description,
            Status = TicketStatus.Pending,
            CreatedAt = DateTime.Now,
            UpdatedAt = DateTime.Now
        };

        _context.Tickets.Add(ticket);
        await _context.SaveChangesAsync();

        return ticket;
    }

    public async Task<IEnumerable<TicketDto>> GetTicketsByTenantIdAsync(string tenantId)
    {
        var tickets = await _context.Tickets
            .Where(t => t.TenantId == tenantId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TicketDto
            {
                Id = t.Id,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
                ClosedAt = t.ClosedAt
            })
            .ToListAsync();

        return tickets;
    }

    public async Task<IEnumerable<TicketDto>> GetTicketsByOwnerIdAsync(string ownerId)
    {
        var tickets = await _context.Tickets
            .Where(t => t.OwnerId == ownerId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var ticketDtos = new List<TicketDto>();

        var apiKey = _configuration["ServiceApiKey"] ?? "InternalService_SecretKey_2024_ChangeMeInProduction";
        var aaBaseUrl = _configuration["Services:AA"];
        var propertyBaseUrl = _configuration["Services:Property"];

        var tenantIds = tickets.Where(t => !string.IsNullOrEmpty(t.TenantId)).Select(t => t.TenantId).Distinct().ToList();
        var contractIds = tickets.Where(t => t.ContractId > 0).Select(t => t.ContractId).Distinct().ToList();

        var tenantInfos = new Dictionary<string, string?>();
        var contractInfos = new Dictionary<int, (string?, string?)>();
        var activeContractInfos = new Dictionary<string, (string?, string?)>();

        // Fetch tenant names
        var tenantTasks = tenantIds.Select(async tenantId =>
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{aaBaseUrl}/api/users/{tenantId}");
            request.Headers.Add("X-Service-Api-Key", apiKey);
            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var userData = await response.Content.ReadFromJsonAsync<UserResponse>();
                tenantInfos[tenantId!] = userData?.FullName;
            }
        });

        // Fetch contract infos for existing contractIds
        var contractTasks = contractIds.Select(async contractId =>
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{propertyBaseUrl}/api/property/contracts/{contractId}");
            request.Headers.Add("X-Service-Api-Key", apiKey);
            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var contractData = await response.Content.ReadFromJsonAsync<ContractInfoResponse>();
                contractInfos[contractId] = (contractData?.HouseName, contractData?.RoomName);
            }
        });

        // Fetch active contracts for tenants
        var activeContractTasks = tenantIds.Select(async tenantId =>
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{propertyBaseUrl}/api/tenant/contracts/active/{tenantId}");
            request.Headers.Add("X-Service-Api-Key", apiKey);
            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var contractData = await response.Content.ReadFromJsonAsync<ContractResponse>();
                if (contractData?.ContractId > 0)
                {
                    // Fetch the contract details
                    var detailRequest = new HttpRequestMessage(HttpMethod.Get, $"{propertyBaseUrl}/api/property/contracts/{contractData.ContractId}");
                    detailRequest.Headers.Add("X-Service-Api-Key", apiKey);
                    var detailResponse = await _httpClient.SendAsync(detailRequest);
                    if (detailResponse.IsSuccessStatusCode)
                    {
                        var detailData = await detailResponse.Content.ReadFromJsonAsync<ContractInfoResponse>();
                        activeContractInfos[tenantId!] = (detailData?.HouseName, detailData?.RoomName);
                    }
                }
            }
        });

        await Task.WhenAll(tenantTasks.Concat(contractTasks).Concat(activeContractTasks));

        foreach (var ticket in tickets)
        {
            var dto = new TicketDto
            {
                Id = ticket.Id,
                Title = ticket.Title,
                Description = ticket.Description,
                Status = ticket.Status,
                CreatedAt = ticket.CreatedAt,
                UpdatedAt = ticket.UpdatedAt,
                ClosedAt = ticket.ClosedAt,
                ContractId = ticket.ContractId,
                TenantName = ticket.TenantId != null && tenantInfos.ContainsKey(ticket.TenantId) ? tenantInfos[ticket.TenantId] : null,
                HouseName = ticket.ContractId > 0 && contractInfos.ContainsKey(ticket.ContractId) 
                    ? contractInfos[ticket.ContractId].Item1 
                    : (ticket.TenantId != null && activeContractInfos.ContainsKey(ticket.TenantId) 
                        ? activeContractInfos[ticket.TenantId].Item1 
                        : null),
                RoomName = ticket.ContractId > 0 && contractInfos.ContainsKey(ticket.ContractId) 
                    ? contractInfos[ticket.ContractId].Item2 
                    : (ticket.TenantId != null && activeContractInfos.ContainsKey(ticket.TenantId) 
                        ? activeContractInfos[ticket.TenantId].Item2 
                        : null)
            };
            ticketDtos.Add(dto);
        }

        return ticketDtos;
    }
    public async Task<bool> CloseTicketAsync(int ticketId, string userId)
    {
        var ticket = await _context.Tickets.FindAsync(ticketId);
        if (ticket == null)
        {
            return false;
        }

        // Check if user is the tenant or owner
        if (ticket.TenantId != userId && ticket.OwnerId != userId)
        {
            return false;
        }

        ticket.Status = TicketStatus.Done;
        ticket.ClosedAt = DateTime.Now;
        ticket.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AcceptTicketAsync(int ticketId, string ownerId)
    {
        var ticket = await _context.Tickets.FindAsync(ticketId);
        if (ticket == null || ticket.OwnerId != ownerId || ticket.Status != TicketStatus.Pending)
        {
            return false;
        }

        ticket.Status = TicketStatus.InProgress;
        ticket.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        return true;
    }
}

public class UserResponse
{
    public string? Id { get; set; }
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? OwnerId { get; set; }
}

public class ContractResponse
{
    public int ContractId { get; set; }
}

public class ContractInfoResponse
{
    public int Id { get; set; }
    public string? HouseName { get; set; }
    public string? RoomName { get; set; }
}