using System.Text.Json.Serialization;

namespace InvoiceService.Features.Property.DTOs;

public class TenantContractDto
{
    public int Id { get; set; }
    public string UserId { get; set; }
    public decimal Price { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; }
}