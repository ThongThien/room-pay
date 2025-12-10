using NotificationService.DTOs.User;

namespace NotificationService.DTOs.Invoice
{
    public class TenantUnpaidNotification
    {
        public UserInfo TenantInfo { get; set; } = new UserInfo(); // Thông tin cơ bản của người nhận
        public List<UnpaidInvoiceDetail> UnpaidInvoices { get; set; } = new List<UnpaidInvoiceDetail>(); // Danh sách hóa đơn của người đó
    }
}