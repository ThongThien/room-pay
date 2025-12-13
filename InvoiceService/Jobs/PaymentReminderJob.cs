using Quartz;
using System;
using System.Threading.Tasks;
// Thay thế bằng namespace của IInvoiceReminderService và ILogger trong dự án của bạn
using InvoiceService.Features.Invoice; // Chứa IInvoiceReminderService

namespace InvoiceService.Jobs; // Đã đổi namespace sang InvoiceService

// Job Child PaymentReminderJob
[DisallowConcurrentExecution] 
[PersistJobDataAfterExecution] 
public class PaymentReminderJob : IJob
{
    // ⭐️ SỬ DỤNG TÊN SERVICE CHÍNH XÁC
    private readonly IInvoiceReminderService _reminderService; 
    private readonly ILogger<PaymentReminderJob> _logger;

    public PaymentReminderJob(
        IInvoiceReminderService reminderService, // ⭐️ Tên chính xác
        ILogger<PaymentReminderJob> logger)
    {
        _reminderService = reminderService;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        // 1. Lấy OwnerId từ Job Data Map
        string ownerId = context.MergedJobDataMap.GetString("OwnerId");
        
        if (string.IsNullOrEmpty(ownerId))
        {
            _logger.LogWarning("⚠️ Payment Reminder Job skipped: OwnerId not found in JobDataMap.");
            return;
        }

        _logger.LogInformation("🟣 [START] Payment Reminder Job for Owner: {OwnerId}", ownerId);

        try
        {
            // 2. GỌI SERVICE XỬ LÝ NHẮC NHỞ THANH TOÁN (Logic gửi RabbitMQ nằm trong hàm này)
            await _reminderService.SendPaymentRemindersAsync(ownerId);
            
            // Log thông báo đồng bộ với logic Controller: "Hệ thống đang xử lý"
            _logger.LogInformation("🟣 [END] Payment Reminder successfully processed for Owner {OwnerId}.", ownerId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ ERROR processing payment reminder for Owner {OwnerId}.", ownerId);
        }
    }
}