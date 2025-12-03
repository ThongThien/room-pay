using AutoMapper;
using PropertyService.DTOs.Houses;
using PropertyService.DTOs.Rooms;
using PropertyService.Models;
using PropertyService.DTOs.Contracts; 

namespace PropertyService.Mappings;

public class AutoMapperProfile : Profile
{
    public AutoMapperProfile()
    {
        CreateMap<House, HouseDto>();
        CreateMap<CreateHouseDto, House>();
        CreateMap<UpdateHouseDto, House>();

        CreateMap<Room, RoomDto>();
        CreateMap<CreateRoomDto, Room>();
        CreateMap<UpdateRoomDto, Room>();

        CreateMap<CreateContractDto, TenantContracts>().ForMember(dest => dest.Status, opt => opt.Ignore());;
        CreateMap<TenantContracts, ContractDto>();
        CreateMap<UpdateContractDto, TenantContracts>();
    }
}
