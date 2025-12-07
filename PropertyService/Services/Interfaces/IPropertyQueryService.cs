using PropertyService.DTOs;

public interface IPropertyQueryService
{
    Task<List<PropertyDetailsDto>> GetDetailsByCycleUserIdsAsync(
        List<CycleUserIdsRequestDto> cycleUserIds);
}