using System.ComponentModel.DataAnnotations;
using System;
using PropertyService.Models.Enums;

namespace PropertyService.DTOs.Contracts
{
    public class CreateContractDto 
    {
        [Required]
        public int RoomId { get; set; }

        [Required]
        public required string TenantId { get; set; }

        [Required]
        public DateOnly StartDate { get; set; }

        public DateOnly? EndDate { get; set; } 

        [Required]
        [Range(0.01, (double)decimal.MaxValue)]
        public decimal Price { get; set; }
        
        public string? FileUrl { get; set; }
    }
}