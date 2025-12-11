using InvoiceService.Features.Property.DTOs;

namespace InvoiceService.Features.Property;

public interface IPropertyService
{    
    Task<int?> GetActiveContractIdByUserIdAsync(string userId);
    Task<List<PropertyDetailsDto>> GetDetailsByContractIdsAsync(List<ContractIdsRequestDto> contractIds);
    Task<TenantContractDto?> GetTenantContractByIdAsync(int contractId);
}