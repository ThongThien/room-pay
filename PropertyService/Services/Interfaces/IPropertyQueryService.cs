public interface IPropertyQueryService
{
    Task<List<PropertyDetailsDto>> GetDetailsByCycleUserIdsAsync(
        List<(int CycleId, string UserId)> cycleUserIds);
}