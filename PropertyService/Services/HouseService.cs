using AutoMapper;
using PropertyService.Data;
using PropertyService.DTOs.Houses;
using PropertyService.Models;
using PropertyService.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PropertyService.Repositories;
namespace PropertyService.Services;

public class HouseService : IHouseService
{
	private readonly IGenericRepository<House> _repo;
	private readonly IMapper _mapper;

	public HouseService(IGenericRepository<House> repo, IMapper mapper)
	{
		_repo = repo;
		_mapper = mapper;
	}

	public async Task<HouseDto> CreateAsync(CreateHouseDto dto, Guid ownerId)
	{
		var house = new House
		{
			OwnerId = ownerId,
			Name = dto.Name,
			Address = dto.Address
		};

		await _repo.AddAsync(house);
		return _mapper.Map<HouseDto>(house);
	}

    public async Task<IEnumerable<HouseDto>> GetAllAsync(Guid ownerId)
    {
        var houses = await _repo.FindAsync(h => h.OwnerId == ownerId);

        return _mapper.Map<IEnumerable<HouseDto>>(houses);
    }


    public async Task<HouseDto?> GetByIdAsync(int id)
	{
		var house = await _repo.GetByIdAsync(id);
		return _mapper.Map<HouseDto>(house);
	}

	public async Task UpdateAsync(int id, UpdateHouseDto dto)
	{
		var house = await _repo.GetByIdAsync(id);
		if (house == null)
			throw new Exception("House not found");

		house.Name = dto.Name;
		house.Address = dto.Address;

		await _repo.UpdateAsync(house);
	}

	public async Task DeleteAsync(int id)
	{
		var house = await _repo.GetByIdAsync(id);
		if (house == null)
			throw new Exception("House not found");

		await _repo.DeleteAsync(house);
	}

}
