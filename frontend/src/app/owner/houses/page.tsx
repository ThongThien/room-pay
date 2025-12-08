"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { House, CreateHouseDto, UpdateHouseDto } from "@/types/property"; 
import { getHouses, createHouse, updateHouse, deleteHouse } from "@/services/propertyService";

// --- ICONS COMPONENTS
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const MapPinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default function HousesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  
  // State formData dùng chung, kiểu mặc định là CreateHouseDto
  // (Vì UpdateHouseDto và CreateHouseDto giống nhau về field nên có thể dùng chung ở đây)
  const [formData, setFormData] = useState<CreateHouseDto>({ name: "", address: "" });

  useEffect(() => {
    loadHouses();
  }, []);

  const loadHouses = async () => {
    try {
      const data = await getHouses();
      setHouses(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHouse) {
        // Ép kiểu formData sang UpdateHouseDto để đúng chuẩn khi gọi hàm update
        const updateData: UpdateHouseDto = {
            name: formData.name,
            address: formData.address
        };
        // Hàm updateHouse
        await updateHouse(editingHouse.id, updateData);
      } else {
        await createHouse(formData);
      }
      setIsModalOpen(false);
      resetForm();
      loadHouses();
    } catch { 
      alert("Đã có lỗi xảy ra");
    }
  };

  const handleEdit = (house: House) => {
    setEditingHouse(house);
    setFormData({ name: house.name, address: house.address });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn chắc chắn muốn xóa nhà này? Hành động này không thể hoàn tác.")) {
      try {
        await deleteHouse(id);
        loadHouses();
      } catch {
        alert("Không thể xóa nhà này (có thể do đang chứa phòng/hợp đồng)");
      }
    }
  };

  const resetForm = () => {
    setEditingHouse(null);
    setFormData({ name: "", address: "" });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen"> 
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Danh sách Nhà Trọ</h1>
          <p className="text-gray-500 mt-1 text-sm">Quản lý các tòa nhà và địa chỉ kinh doanh của bạn</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition shadow-sm font-medium"
        >
          <PlusIcon />
          Thêm Nhà Mới
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Đang tải dữ liệu...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {houses.map((house) => (
            <div key={house.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between h-full group">
              {/* Card Header */}
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-blue-50 text-blue-700 p-3 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11H9V10z"/></svg>
                  </div>
                  
                  {/* Action Buttons (Sửa/Xóa) */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEdit(house)} 
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
                      title="Sửa thông tin"
                    >
                      <EditIcon />
                    </button>
                    <button 
                      onClick={() => handleDelete(house.id)} 
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                      title="Xóa nhà"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-gray-800 mb-1">{house.name}</h2>
                <div className="flex items-start gap-2 text-gray-500 text-sm mb-6">
                  <div className="mt-0.5"><MapPinIcon /></div>
                  <span className="line-clamp-2">{house.address}</span>
                </div>
              </div>

              {/* Card Footer: Nút Xem phòng */}
              <div className="mt-auto border-t pt-4">
                <Link 
                  href={`/owner/rooms?houseId=${house.id}`}
                  className="block w-full text-center py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition"
                >
                  Quản lý Phòng &rarr;
                </Link>
              </div>
            </div>
          ))}
          
          {/* Empty State nếu chưa có nhà */}
          {houses.length === 0 && (
             <div className="col-span-full text-center py-12 bg-white border border-dashed border-gray-300 rounded-xl">
                <p className="text-gray-500">Bạn chưa có nhà trọ nào.</p>
                <button onClick={() => setIsModalOpen(true)} className="text-green-600 font-medium mt-2 hover:underline">
                  Tạo nhà trọ đầu tiên
                </button>
             </div>
          )}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">{editingHouse ? "Cập nhật thông tin" : "Thêm Nhà Mới"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên nhà trọ <span className="text-red-500">*</span></label>
                <input 
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Địa chỉ <span className="text-red-500">*</span></label>
                <input 
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  required 
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-sm transition"
                >
                  {editingHouse ? "Lưu thay đổi" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}