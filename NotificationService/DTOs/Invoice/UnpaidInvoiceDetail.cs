namespace NotificationService.DTOs.Invoice
{
    public class UnpaidInvoiceDetail
    {
        public int InvoiceId { get; set; }
        public decimal AmountDue { get; set; }
        public DateTime DueDate { get; set; }
        public string Description { get; set; } = string.Empty;
    }
}