// InvoiceService.Services.IInvoiceReminderService.cs

namespace InvoiceService.Features.Invoice
{
    public interface IInvoiceReminderService
    {
       Task SendPaymentRemindersAsync(string ownerId);
    }
}