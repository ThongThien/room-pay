using ReadingService.Features.Property.DTOs;

public interface IPropertyService
{
    Task<List<PropertyDetailsDto>> GetDetailsByCycleUserIdsAsync(
        List<CycleUserIdsRequestDto> cycleUserIds);
}