using InvoiceService.Services.DTOs;
public class InvoiceReminderDTO
{
    public int InvoiceId { get; set; }
    public decimal AmountDue { get; set; }
    public DateTime DueDate { get; set; }
}

public class TenantReminderInfoDTO
{
    public UserInfo TenantInfo { get; set; } = new();
    public List<InvoiceReminderDTO> UnpaidInvoices { get; set; } = new();
}

public class InvoiceNotificationMessage 
{
    // Phải khớp với Enum trong NotificationService
    public string Type { get; set; } = "RemindPayment"; 
    
    // List các Tenant cần gửi nhắc nhở
    public List<TenantReminderInfoDTO> TenantsToNotify { get; set; } = new(); 
}