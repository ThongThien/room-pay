// PropertyService/Models/House.cs (KHUYẾN NGHỊ)
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations; // Thêm
using System.ComponentModel.DataAnnotations.Schema; // Thêm (nếu bạn sử dụng nó)

namespace PropertyService.Models;

public class House
{
    // PRIMARY KEY: Mặc định EF Core đã nhận ra, nhưng thêm [Key] để rõ ràng
    [Key]
    public int Id { get; set; }

    // OWNER ID: Bắt buộc (Non-nullable)
    [Required] // Khuyến nghị: OwnerId luôn phải có giá trị
    public Guid OwnerId { get; set; }      // From User Service (GUID)
    
    // NAME: Bắt buộc
    [Required] // Khuyến nghị: Tên nhà không được null
    public string Name { get; set; } = null!;

    // ADDRESS: Bắt buộc
    [Required] // Khuyến nghị: Địa chỉ không được null
    public string Address { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property: Mối quan hệ 1-N với Room
    public List<Room> Rooms { get; set; } = new();
}