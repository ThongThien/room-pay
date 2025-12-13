using InvoiceService.Data;
using InvoiceService.Models;
using Microsoft.EntityFrameworkCore;
using InvoiceService.Features.Invoice.DTOs.Invoice;
using InvoiceService.Models.Enums;
using InvoiceService.Repositories.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using InvoiceService.Features.Property.DTOs;
using InvoiceService.Features.Property;
using InvoiceService.Features.Invoice.DTOs;

namespace InvoiceService.Features.Invoice;

public class InvoiceServiceImpl : IInvoiceService
{
    //  Đã thay thế ApplicationDbContext bằng IInvoiceRepository
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly ILogger<InvoiceServiceImpl> _logger;
    private readonly Pricing.IPricingService _pricingService;

    private readonly IPropertyService _propertyService;
    private readonly Services.IUserServiceClient _userServiceClient;
    // private readonly ApplicationDbContext _context;
    
    // [ActivatorUtilitiesConstructor] chỉ cần thiết nếu có nhiều constructors,
    // nhưng ta giữ nó để đảm bảo DI Container dùng Constructor này.
    [ActivatorUtilitiesConstructor]
    public InvoiceServiceImpl(
        IInvoiceRepository invoiceRepo, 
        ILogger<InvoiceServiceImpl> logger,
        Pricing.IPricingService pricingService,
        IPropertyService propertyService,
        Services.IUserServiceClient userServiceClient
    )
    {
        _invoiceRepo = invoiceRepo;
        _logger = logger;
        _pricingService = pricingService;
        _propertyService = propertyService;
        _userServiceClient = userServiceClient;
    }

    private async Task<List<InvoiceResponse>> EnrichInvoicesWithPropertyDetails(IEnumerable<Models.Invoice> invoices)
    {
        // Check for null/empty input
        if (invoices == null || !invoices.Any())
        {
            return new List<InvoiceResponse>();
        }

        // --- 1. Collect unique TenantContractId (Fix CS0117 error and type conversion) ---
        
        // Filter valid IDs (not null) and convert to List<ContractIdsRequestDto>
        var contractIdsRequest = invoices
            // Check for null (since it's int?)
            .Where(i => i.TenantContractId.HasValue) 
            // Create DTO request. Ensure ContractIdsRequestDto.ContractId is int type
            .Select(i => new ContractIdsRequestDto 
            {
                ContractId = i.TenantContractId!.Value // Get int value from int?
            })
            .DistinctBy(d => d.ContractId)
            .ToList();
        
        // Initialize mapping dictionary with INT/LONG key
        var propertyDetailsMap = new Dictionary<int, PropertyDetailsDto>(); // Changed from string to int
        
        if (contractIdsRequest.Any())
        {
            try
            {
                // --- 2. Call Property Service Client with Contract IDs ---
                
                // Đảm bảo GetDetailsByContractIdsAsync nhận List<ContractIdsRequestDto> kiểu số
                var detailsList = await _propertyService.GetDetailsByContractIdsAsync(contractIdsRequest); 
                
                // --- 3. Tạo Dictionary để ánh xạ nhanh chóng bằng TenantContractId ---
                if (detailsList != null)
                {
                    propertyDetailsMap = detailsList
                        // 1. Chỉ lấy những DTO có ContractId
                        .Where(d => d.ContractId.HasValue) 
                        // 2. Nhóm theo Key là giá trị int
                        .GroupBy(d => d.ContractId!.Value) 
                        // 3. Tạo Dictionary với Key là int (g.Key)
                        .ToDictionary(g => g.Key, g => g.First()); 
                }
            }
            catch (Exception ex)
            {
                // Logging lỗi
                _logger.LogError(ex, "Lỗi khi gọi PropertyService để làm giàu dữ liệu bằng TenantContractId.");
            }
        }
        
        // --- 4. Ánh xạ (Map) Model và Property Details vào InvoiceResponse DTO ---
        var responseList = new List<InvoiceResponse>();
        
        foreach (var invoice in invoices)
        {
            var dto = MapToResponse(invoice);
            
            //  LOGIC ĐÚNG VÀ GỌN GÀNG (Thay thế toàn bộ khối IF bị lỗi của bạn):
            // 1. Kiểm tra nếu Contract ID có giá trị (HasValue)
            // 2. VÀ tìm thấy Contract ID đó trong Dictionary (TryGetValue)
            if (invoice.TenantContractId.HasValue && 
                propertyDetailsMap.TryGetValue(invoice.TenantContractId.Value, out var details)) 
            {
                // Biến 'details' bây giờ có sẵn (từ điều kiện IF) và có thể sử dụng
                dto.HouseName = details.HouseName;
                dto.RoomName = details.RoomName;
                dto.Floor = details.Floor;
            }
            
            responseList.Add(dto);
        }

        return responseList;
    }

    // Helper method to enrich invoices with user names
    private async Task<List<InvoiceResponse>> EnrichInvoicesWithUserNamesAsync(IEnumerable<InvoiceResponse> invoices)
    {
        var response = invoices.ToList();

        // Collect unique User IDs
        var userIds = response.Where(r => !string.IsNullOrEmpty(r.UserId)).Select(r => r.UserId).Distinct().ToList();

        // Call User Service for each user
        foreach (var invoiceResponse in response)
        {
            if (!string.IsNullOrEmpty(invoiceResponse.UserId))
            {
                try
                {
                    var userInfo = await _userServiceClient.GetUserInfoAsync(invoiceResponse.UserId);
                    if (userInfo != null)
                    {
                        invoiceResponse.UserName = userInfo.FullName;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get user info for {UserId}", invoiceResponse.UserId);
                }
            }
        }

        return response;
    }

    //===============================================
    // ⚙️ PRIVATE HELPER: Ánh xạ từ Model sang Response DTO cơ bản
    // =========================================================
    
    // Cần hàm này để chuyển Models.Invoice sang InvoiceResponse DTO (không bao gồm UserName/Property)
    private InvoiceResponse MapToResponse(Models.Invoice invoice)
    {
        return new InvoiceResponse
        {
            Id = invoice.Id,
            UserId = invoice.UserId,
            UserName = string.Empty, 
            TenantContractId = invoice.TenantContractId,
            InvoiceDate = invoice.InvoiceDate,
            DueDate = invoice.DueDate,
            DisplayStatus = invoice.DisplayStatus,
            TotalAmount = invoice.TotalAmount,
            Status = invoice.Status,
            PaidDate = invoice.PaidDate,
            CreatedAt = invoice.CreatedAt,
            UpdatedAt = invoice.UpdatedAt,
            Items = invoice.Items.Select(item => new InvoiceItemResponse
            {
                Id = item.Id,
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Amount = item.Amount,
                ProductCode = item.ProductCode
            }).ToList()
        };
    }
    public async Task<IEnumerable<InvoiceResponse>> GetAllInvoicesByUserAsync(string userId)
    {
        // 1. Lấy Hóa đơn từ DB
        var invoices = await _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
            
        return await EnrichInvoicesWithPropertyDetails(invoices);
    }

    public async Task<IEnumerable<InvoiceResponse>> GetAllInvoicesByOwnerAsync(string ownerId, List<string> tenantUserIds)
    {
        // 1. Lấy Hóa đơn từ DB
        var invoices = await _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => tenantUserIds.Contains(i.UserId))
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
            
        return await EnrichInvoicesWithPropertyDetails(invoices);
    }

    public async Task<IEnumerable<InvoiceResponse>> GetAllInvoicesByOwnerAsync(string ownerId, List<string> tenantUserIds, int page, int pageSize, string? status, int? year, int? month)
    {
        // 1. Tạo query cơ bản
        var query = _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => tenantUserIds.Contains(i.UserId));

        // 2. Áp dụng filters
        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(i => i.Status == status);
        }

        if (year.HasValue)
        {
            query = query.Where(i => i.InvoiceDate.Year == year.Value);
        }

        if (month.HasValue)
        {
            query = query.Where(i => i.InvoiceDate.Month == month.Value);
        }

        // 3. Áp dụng pagination
        var invoices = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            
        return await EnrichInvoicesWithPropertyDetails(invoices);
    }

    public async Task<IEnumerable<InvoiceResponse>> GetInvoicesByTenantAsync(string tenantId, int page, int pageSize, string? status, int? year, int? month)
    {
        // 1. Tạo query cơ bản
        var query = _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => i.UserId == tenantId);

        // 2. Áp dụng filters
        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(i => i.Status == status);
        }

        if (year.HasValue)
        {
            query = query.Where(i => i.InvoiceDate.Year == year.Value);
        }

        if (month.HasValue)
        {
            query = query.Where(i => i.InvoiceDate.Month == month.Value);
        }

        // 3. Áp dụng pagination
        var invoices = await query
            .OrderByDescending(i => i.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            
        return await EnrichInvoicesWithPropertyDetails(invoices);
    }

    public async Task<InvoiceResponse?> GetInvoiceByIdAsync(int id, string userId)
    {
        var invoice = await _invoiceRepo.Query()
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
            
        if (invoice == null) return null;
        
        //  Call data enrichment function and return result
        return (await EnrichInvoicesWithPropertyDetails(new List<Models.Invoice> { invoice })).FirstOrDefault();
    }

    // Fix GetInvoiceByIdAsync function (service-to-service)
    public async Task<InvoiceResponse?> GetInvoiceByIdAsync(int id)
    {
        var invoice = await _invoiceRepo.Query()
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id);
            
        if (invoice == null) return null;

        //  Gọi hàm làm giàu dữ liệu và trả về kết quả
        return (await EnrichInvoicesWithPropertyDetails(new List<Models.Invoice> { invoice })).FirstOrDefault();
    }

    public async Task<InvoiceResponse?> GetInvoiceByIdForOwnerAsync(int id, string ownerId, List<string> tenantUserIds)
    {
        var invoice = await _invoiceRepo.Query()
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && tenantUserIds.Contains(i.UserId));
            
        if (invoice == null) return null;
        
        //  Call data enrichment function and return result
        return (await EnrichInvoicesWithPropertyDetails(new List<Models.Invoice> { invoice })).FirstOrDefault();
    }

    public async Task<Models.Invoice> CreateInvoiceAsync(Models.Invoice invoice)
    {
        invoice.CreatedAt = DateTime.UtcNow;
        invoice.TotalAmount = invoice.Items.Sum(item => item.Amount);
        
        //  Sử dụng Repository để thêm và lưu
        await _invoiceRepo.AddAsync(invoice);
        
        _logger.LogInformation("Created invoice {InvoiceId} for user {UserId}", 
            invoice.Id, invoice.UserId);
        
        return invoice;
    }

    public async Task<Models.Invoice?> UpdateInvoiceAsync(int id, Models.Invoice invoice, string userId)
    {
        var existingInvoice = await _invoiceRepo.Query()
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        
        if (existingInvoice == null)
            return null;

        existingInvoice.InvoiceDate = invoice.InvoiceDate;
        existingInvoice.DueDate = invoice.DueDate;
        existingInvoice.Status = invoice.Status;
        existingInvoice.UpdatedAt = DateTime.UtcNow;
        
        // Need method to delete/update Items (Assuming you have Update function in Repo)
        // Note: If Repo doesn't have built-in logic to delete items, need to use DbContext or modify Repo
        // Assuming Repository can handle updating
        existingInvoice.Items.Clear(); // Clear old items
        foreach (var item in invoice.Items)
        {
            existingInvoice.Items.Add(item); // Thêm mới
        }

        existingInvoice.TotalAmount = existingInvoice.Items.Sum(item => item.Amount);
        
        await _invoiceRepo.UpdateAsync(existingInvoice);
        
        _logger.LogInformation("Updated invoice {InvoiceId} for user {UserId}", 
            existingInvoice.Id, userId);
        
        return existingInvoice;
    }

    public async Task<bool> DeleteInvoiceAsync(int id, string userId)
    {
        var invoice = await _invoiceRepo.Query()
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        
        if (invoice == null)
            return false;

        // Sử dụng Repository để xóa
        await _invoiceRepo.DeleteAsync(invoice);
        
        _logger.LogInformation("Deleted invoice {InvoiceId} for user {UserId}", 
            id, userId);
        
        return true;
    }

    public async Task<Models.Invoice?> MarkInvoiceAsPaidAsync(int id, string userId)
    {
        var invoice = await _invoiceRepo.Query()
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        
        if (invoice == null) return null;

        invoice.Status = "Paid";
        invoice.PaidDate = DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;
        
        await _invoiceRepo.UpdateAsync(invoice);
        
        _logger.LogInformation("Marked invoice {InvoiceId} as paid for user {UserId}", id, userId);
        
        return invoice;
    }

    public async Task<Models.Invoice?> MarkInvoiceAsPaidAsync(int id)
    {
        var invoice = await _invoiceRepo.Query()
            .FirstOrDefaultAsync(i => i.Id == id);
        
        if (invoice == null) return null;

        invoice.Status = "Paid";
        invoice.PaidDate = DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;
        
        await _invoiceRepo.UpdateAsync(invoice);
        
        _logger.LogInformation("Marked invoice {InvoiceId} as paid (service-to-service)", id);
        
        return invoice;
    }

    public async Task<IEnumerable<InvoiceResponse>> GetInvoicesByStatusAsync(string userId, string status)
    {
        // 1. Truy vấn DB lấy Models.Invoice (giữ nguyên)
        var invoices = await _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => i.UserId == userId && i.Status == status)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
        
        // 2.  Gọi hàm làm giàu dữ liệu và trả về IEnumerable<InvoiceResponse>
        return await EnrichInvoicesWithPropertyDetails(invoices);
    }

    public async Task<IEnumerable<InvoiceResponse>> GetInvoicesByStatusForOwnerAsync(string ownerId, List<string> tenantUserIds, string status)
    {
        // 1. Truy vấn DB lấy Models.Invoice (giữ nguyên)
        var invoices = await _invoiceRepo.Query()
            .Include(i => i.Items)
            .Where(i => tenantUserIds.Contains(i.UserId) && i.Status == status)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();
        
        // 2.  Gọi hàm làm giàu dữ liệu và trả về IEnumerable<InvoiceResponse>
        return await EnrichInvoicesWithPropertyDetails(invoices);
    }
    // InvoiceService/Features/Invoice/InvoiceServiceImpl.cs
    public async Task<UnpaidInvoicesResponseDto> GetUnpaidInvoicesByTenantIdAsync(Guid tenantId)
    {
        try
        {
            string tenantIdString = tenantId.ToString();
            DateOnly today = DateOnly.FromDateTime(DateTime.Today); 
            
            //  SỬA LỌC TRẠNG THÁI: Chỉ tìm kiếm UNPAID (theo Enum mới)
            string unpaidStatus = InvoiceStatus.Unpaid.ToString(); 

            // 1. Định nghĩa truy vấn cơ sở
            var unpaidInvoicesQuery = _invoiceRepo.Query()
                .Where(i => i.UserId == tenantIdString) 
                // Chỉ lọc theo trạng thái Unpaid (như trong DB)
                .Where(i => i.Status == unpaidStatus)
                .Where(i => i.DisplayStatus == "Visible"); // Chỉ lấy hóa đơn có DisplayStatus là Visible 

            // 2. Calculate total unpaid amount (Server-side)
            decimal totalAmount = await unpaidInvoicesQuery.SumAsync(i => i.TotalAmount);
            
            // 3. Get details and map (Client-side to avoid EF Core errors)
            var unpaidInvoices = unpaidInvoicesQuery
                .OrderBy(i => i.DueDate)
                .AsEnumerable() // REQUIRED: Force EF Core to load data before using Enum.Parse and DateOnly.FromDateTime
                .Select(i => new UnpaidInvoiceDetailDto
                {
                    InvoiceId = i.Id,
                    
                    // Chuyển đổi an toàn trên Client-side
                    Month = $"Tháng {DateOnly.FromDateTime(i.InvoiceDate).Month}/{DateOnly.FromDateTime(i.InvoiceDate).Year}", 
                    
                    Amount = i.TotalAmount,
                    
                    DueDate = DateOnly.FromDateTime(i.DueDate), 
                    
                    //  LOGIC OVERDUE: Tính toán dựa trên DueDate và ngày hiện tại
                    IsOverdue = DateOnly.FromDateTime(i.DueDate) < today, 
                    
                    // Trạng thái luôn là Unpaid khi truy vấn
                    Status = (InvoiceStatus)Enum.Parse(typeof(InvoiceStatus), i.Status, true) 
                })
                .ToList(); // Dùng ToList() vì AsEnumerable() đã tải dữ liệu vào bộ nhớ

            return new UnpaidInvoicesResponseDto
            {
                TotalUnpaidAmount = totalAmount,
                UnpaidInvoices = unpaidInvoices
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xử lý dữ liệu hóa đơn chưa thanh toán cho Tenant {TenantId}. Chi tiết: {Message}", tenantId, ex.Message);
            throw; 
        }
    }
    public Task<TotalPaidLastMonthDto> GetTotalPaidAmountLastMonthAsync(Guid tenantId)
    {
        return Task.FromResult(new TotalPaidLastMonthDto 
        { 
            TotalAmount = 0m, 
            MonthYear = "N/A" 
        });
    }

    public async Task<IEnumerable<PendingInvoiceDto>> GetPendingInvoicesThisMonthAsync(string ownerId)
    {
        try
        {
            var currentMonth = DateTime.Now.Month;
            var currentYear = DateTime.Now.Year;

            // Get all invoices (TODO: filter by owner properly)
            var allInvoices = await _invoiceRepo.Query()
                .Include(i => i.Items)
                .ToListAsync();

            // Filter pending invoices this month
            var pendingInvoices = allInvoices
                .Where(i => i.Status == "Unpaid" &&
                           i.CreatedAt.Month == currentMonth &&
                           i.CreatedAt.Year == currentYear)
                .ToList();

            // Enrich with property details
            var enrichedInvoices = await EnrichInvoicesWithPropertyDetails(pendingInvoices);

            // Enrich with user names
            var enrichedWithUsers = await EnrichInvoicesWithUserNamesAsync(enrichedInvoices);

            // Convert to PendingInvoiceDto
            var result = new List<PendingInvoiceDto>();
            foreach (var invoice in enrichedWithUsers)
            {
                result.Add(new PendingInvoiceDto
                {
                    Id = invoice.Id,
                    TenantName = invoice.UserName ?? "Unknown",
                    RoomName = $"{invoice.HouseName ?? "Unknown"} - {invoice.RoomName ?? "Unknown"}",
                    Amount = invoice.TotalAmount,
                    InvoiceDate = invoice.CreatedAt,
                    DueDate = invoice.DueDate,
                    Status = invoice.Status
                });
            }

            _logger.LogInformation("Found {Count} pending invoices for owner {OwnerId} this month", result.Count, ownerId);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError("Error getting pending invoices for owner {OwnerId}: {Error}", ownerId, ex.Message);
            return new List<PendingInvoiceDto>();
        }
    }
}
