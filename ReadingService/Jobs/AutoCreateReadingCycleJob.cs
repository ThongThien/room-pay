using Quartz;
using ReadingService.Features.ReadingCycle;
using ReadingService.Features.ReadingCycle.DTOs;
using ReadingService.Features.MonthlyReading;
using ReadingService.Features.User;
using ReadingService.Features.Property;
using ReadingService.Services; // Giả định IMessageProducer ở đây
using System.Linq; 

namespace ReadingService.Jobs;

[DisallowConcurrentExecution] 
public class AutoCreateReadingCycleJob : IJob
{
    private readonly IReadingCycleService _readingCycleService;
    private readonly IMonthlyReadingService _monthlyReadingService; 
    private readonly IPropertyService _propertyService; 
    private readonly IUserService _userService; 
    private readonly IMessageProducer _rabbitMqProducer; // Đã Inject
    private readonly ILogger<AutoCreateReadingCycleJob> _logger;

    public AutoCreateReadingCycleJob(
        IReadingCycleService readingCycleService,
        IMonthlyReadingService monthlyReadingService, 
        IPropertyService propertyService, 
        IUserService userService, 
        IMessageProducer rabbitMqProducer, // Đã Inject
        ILogger<AutoCreateReadingCycleJob> logger)
    {
        _readingCycleService = readingCycleService;
        _monthlyReadingService = monthlyReadingService;
        _propertyService = propertyService;
        _userService = userService;
        _rabbitMqProducer = rabbitMqProducer;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("🟢 [START] Auto Cycle Creation Job (Ngày 20). Start Time: {Date}", DateTime.Now);

        var now = DateTime.UtcNow; 
        var createDto = new CreateReadingCycleDto { CycleMonth = now.Month, CycleYear = now.Year };
        var totalCreatedCount = 0;

        try
        {
            var ownerIds = await _userService.GetAllOwnerIdsAsync(); 
            
            if (ownerIds == null || !ownerIds.Any())
            {
                _logger.LogWarning("⚠️ No active Owner IDs found for cycle creation.");
                return;
            }

            foreach (var ownerId in ownerIds)
            {
                // Danh sách Tenants đã được tạo Cycle trong lần chạy này của Owner
                var createdCyclesTenants = new List<ReadingService.Features.User.DTOs.UserInfo>(); 
                
                try
                {
                    var tenantIds = await _userService.GetTenantIdsByOwnerAsync(ownerId);
                    if (tenantIds == null || !tenantIds.Any()) continue;
                    
                    var allTenants = await _userService.GetUsersByIdsAsync(tenantIds);
                    
                    foreach (var tenant in allTenants)
                    {
                        var activeContractId = await _propertyService.GetActiveContractIdByUserIdAsync(tenant.Id); 
                        if (!activeContractId.HasValue) continue; 

                        var exists = await _readingCycleService.ExistsAsync(tenant.Id, createDto.CycleMonth, createDto.CycleYear);
                        if (exists) continue;
                        
                        try 
                        {
                            // 5. LOGIC TẠO CYCLE VÀ MONTHLY READING
                            var cycleDto = await _readingCycleService.CreateAsync(tenant.Id, createDto);
                            await _monthlyReadingService.CreateEmptyAsync(cycleDto.Id, activeContractId.Value); 

                            createdCyclesTenants.Add(tenant);
                            totalCreatedCount++;
                        }
                        catch (Exception innerEx)
                        {
                            _logger.LogError(innerEx, "❌ ERROR creating data for Tenant {TenantId} of Owner {OwnerId}", tenant.Id, ownerId);
                        }
                    }

                    // 6. GỬI THÔNG BÁO NEW CYCLE
                    if (createdCyclesTenants.Any())
                    {
                        // Đảm bảo createdCyclesTenants là List<UserInfo>
                        _logger.LogInformation("📧 Preparing RabbitMQ message for {Count} users...", createdCyclesTenants.Count);
                        
                        // Cấu trúc message đồng bộ với Controller
                        var notificationMessage = new 
                        {
                            Type = "NewCycle",
                            CycleMonth = createDto.CycleMonth,
                            CycleYear = createDto.CycleYear,
                            CustomersToNotify = createdCyclesTenants.Select(t => new { t.Id, t.FullName, t.Email }).ToList() 
                        };
                        
                        _rabbitMqProducer.SendMessage(notificationMessage, "notification_queue"); 
                        
                        _logger.LogInformation("   🚀 RabbitMQ NewCycle Message Sent for {Count} tenants of Owner {OwnerId}.", createdCyclesTenants.Count, ownerId);
                    }
                }
                catch (Exception ownerEx)
                {
                    _logger.LogError(ownerEx, "❌ ERROR processing Owner {OwnerId} during cycle creation.", ownerId);
                }
            }
            
            _logger.LogInformation("🟢 [END] Process Completed. Total Cycles Created: {Created}", totalCreatedCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ CRITICAL ERROR in auto creation job.");
        }
    }
}