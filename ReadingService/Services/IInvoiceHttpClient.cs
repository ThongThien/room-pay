namespace ReadingService.Services;

public interface IInvoiceHttpClient
{
    Task<bool> CreateInvoiceForMonthlyReadingAsync(string userId, int cycleId, int electricUsage, int waterUsage);
}
