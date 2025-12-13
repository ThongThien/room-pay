using System;
using System.ComponentModel.DataAnnotations; 
using PropertyService.Models.Enums; 
namespace PropertyService.DTOs.Contracts
{
    public class ContractDto
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        [Required]
        public required string TenantId { get; set; }
        public string? TenantName { get; set; }
        public DateOnly StartDate { get; set; }
        public DateOnly? EndDate { get; set; } 
        public decimal Price { get; set; }
        public ContractStatus Status { get; set; }
        public string? FileUrl { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? HouseName { get; set; } 
        public string? RoomNumber { get; set; } 
    }
}