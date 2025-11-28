namespace InvoiceService.Models;

public class InvoiceItem
{
    public int Id { get; set; }

    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;

    public string Name { get; set; } = null!;
    public decimal Amount { get; set; }
}
