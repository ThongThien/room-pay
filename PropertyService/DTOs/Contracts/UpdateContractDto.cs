using PropertyService.Models.Enums;
using System.ComponentModel.DataAnnotations;
using System;

namespace PropertyService.DTOs.Contracts
{
    public class UpdateContractDto 
    {
        public int? RoomId { get; set; }
        public DateOnly StartDate { get; set; }

        public DateOnly? EndDate { get; set; } 

        [Range(0.01, (double)decimal.MaxValue)]
        public decimal Price { get; set; }

        public ContractStatus Status { get; set; } 

        public string? FileUrl { get; set; }
    }
}