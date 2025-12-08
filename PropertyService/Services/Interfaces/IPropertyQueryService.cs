using PropertyService.DTOs;

public interface IPropertyQueryService
{
    Task<List<PropertyDetailsDto>> GetDetailsByContractIdsAsync(List<int> contractIds);
}