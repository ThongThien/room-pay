"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { House, CreateHouseDto, UpdateHouseDto } from "@/types/property"; 
import { getHouses, createHouse, updateHouse, deleteHouse } from "@/services/propertyService";

export default function HousesPage() {
  const [houses, setHouses] = useState<House[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [formData, setFormData] = useState<CreateHouseDto>({ name: "", address: "" });

  useEffect(() => {
    loadHouses();
  }, []);

  const loadHouses = async () => {
    setLoading(true);
    try {
      const data = await getHouses();
      setHouses(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC LỌC DỮ LIỆU ---
  const filteredHouses = useMemo(() => {
      return houses.filter(h => 
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        h.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [houses, searchTerm]);

  // --- FORM HANDLING ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingHouse) {
        const updateData: UpdateHouseDto = {
            name: formData.name,
            address: formData.address
        };
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
        alert("Không thể xóa nhà này");
      }
    }
  };

  const resetForm = () => {
    setEditingHouse(null);
    setFormData({ name: "", address: "" });
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen text-gray-800"> 
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Danh sách Nhà Trọ</h2>
                <p className="text-gray-500 text-sm">Quản lý các tòa nhà và địa chỉ kinh doanh</p>
            </div>
             <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium text-sm"
            >
                 + Thêm Nhà Mới
            </button>
        </div>
      </div>

      {/* --- TOOLBAR / FILTER --- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-96">
              <input 
                  type="text"
                  placeholder="Tìm kiếm theo tên nhà hoặc địa chỉ..."
                  className="px-4 py-2 border rounded-md text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="text-sm text-gray-500">
              Hiển thị {filteredHouses.length} kết quả
          </div>
      </div>

      {/* --- TABLE VIEW --- */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                        <tr>
                            <th className="p-4 border-b w-16 text-center">STT</th>
                            <th className="p-4 border-b">Tên Nhà</th>
                            <th className="p-4 border-b">Địa chỉ</th>
                            <th className="p-4 border-b text-center">Quản lý</th>
                            <th className="p-4 border-b text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                        {filteredHouses.length > 0 ? filteredHouses.map((house, index) => (
                            <tr key={house.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 text-center font-mono text-gray-500">{index + 1}</td>
                                <td className="p-4 font-bold text-gray-800">
                                    {house.name}
                                </td>
                                <td className="p-4 text-gray-600">{house.address}</td>
                                <td className="p-4 text-center">
                                     <Link 
                                        href={`/owner/rooms?houseId=${house.id}`}
                                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition"
                                    >
                                        Xem danh sách phòng
                                    </Link>
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button 
                                            onClick={() => handleEdit(house)} 
                                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition"
                                        >
                                            Sửa
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(house.id)} 
                                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="p-10 text-center text-gray-400">
                                    Không tìm thấy nhà trọ nào phù hợp.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">{editingHouse ? "Cập nhật thông tin" : "Thêm Nhà Mới"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên nhà trọ <span className="text-red-500">*</span></label>
                <input 
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ví dụ: Nhà trọ Hạnh Phúc 1"
                  required 
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Địa chỉ <span className="text-red-500">*</span></label>
                <input 
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  placeholder="Ví dụ: 123 đường ABC, Quận XYZ..."
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
                  className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition"
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