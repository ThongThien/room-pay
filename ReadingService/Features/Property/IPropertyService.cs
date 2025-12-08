using ReadingService.Features.Property.DTOs;

public interface IPropertyService
{
Task<List<PropertyDetailsDto>> GetDetailsByContractIdsAsync(List<int> contractIds);
}