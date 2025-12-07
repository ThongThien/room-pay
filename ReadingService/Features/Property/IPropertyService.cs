using ReadingService.Features.Property.DTOs;

public interface IPropertyService
{
    Task<Dictionary<int, PropertyDetailsDto>> GetDetailsByCycleIdsAsync(List<int> cycleIds);
}