// PropertyService/Models/TenantContract.cs (SỬA ĐỔI)
using PropertyService.Models.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PropertyService.Models
{
    public class TenantContracts
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int RoomId { get; set; }
        
        [Required]
        public string TenantId { get; set; } = string.Empty; 

        [Required]
        public DateOnly StartDate { get; set; }

        public DateOnly? EndDate { get; set; } 

        [Column(TypeName = "decimal(18, 2)")]
        public decimal Price { get; set; }

        [Required]
        public ContractStatus Status { get; set; } = ContractStatus.Active;

        public string? FileUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(RoomId))]
        public Room? Room { get; set; }
    }
}