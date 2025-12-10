"use client";

import React, { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { House, Room, RoomStatus, CreateRoomDto, UpdateRoomDto } from "@/types/property";
import { getHouses, getRooms, createRoom, updateRoom, deleteRoom } from "@/services/propertyService";

function RoomManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const houseIdParam = searchParams.get("houseId");
  const initialHouseId = houseIdParam ? parseInt(houseIdParam) : null;

  // --- STATE DATA ---
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(initialHouseId);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // --- STATE UI & FILTER ---
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); 
  const [searchTerm, setSearchTerm] = useState("");

  // --- STATE MODAL (CREATE/EDIT) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  // Form Data mặc định
  const defaultFormData: CreateRoomDto = { name: "", floor: 1, status: RoomStatus.Vacant };
  const [formData, setFormData] = useState<CreateRoomDto>(defaultFormData);

  // --- EFFECTS ---
  // Load danh sách nhà
  useEffect(() => {
    const fetchHousesList = async () => {
      try {
        const data = await getHouses();
        setHouses(data);
        // Nếu chưa chọn nhà và có danh sách nhà, có thể auto chọn nhà đầu tiên (tuỳ chọn)
        // if (!selectedHouseId && data.length > 0) setSelectedHouseId(data[0].id);
      } catch {
        console.error("Lỗi tải danh sách nhà");
      }
    };
    fetchHousesList();
  }, []);

  // Load danh sách phòng khi chọn nhà
  useEffect(() => {
    if (selectedHouseId) {
      loadRooms(selectedHouseId);
    } else {
      setRooms([]);
    }
  }, [selectedHouseId]);

  // --- FUNCTIONS ---
  const loadRooms = async (houseId: number) => {
    setLoadingRooms(true);
    try {
      const data = await getRooms(houseId);
      setRooms(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleHouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = parseInt(e.target.value);
    if (newId) {
      setSelectedHouseId(newId);
      router.push(`/owner/rooms?houseId=${newId}`);
    } else {
      setSelectedHouseId(null);
      router.push(`/owner/rooms`);
    }
  };

  // --- LOGIC LỌC & THỐNG KÊ ---
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // 1. Lọc theo trạng thái
      const matchStatus = statusFilter === "ALL" || room.status === parseInt(statusFilter);
      // 2. Lọc theo tên tìm kiếm
      const matchSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchStatus && matchSearch;
    });
  }, [rooms, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: rooms.length,
      vacant: rooms.filter(r => r.status === RoomStatus.Vacant).length,
      occupied: rooms.filter(r => r.status === RoomStatus.Occupied).length
    };
  }, [rooms]);

  // --- CRUD HANDLERS ---
  const openModal = (room?: Room) => {
    if (room) {
      // Edit Mode
      setEditingRoom(room);
      setFormData({
        name: room.name,
        floor: room.floor,
        status: room.status
      });
    } else {
      // Create Mode
      setEditingRoom(null);
      setFormData(defaultFormData);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHouseId) return alert("Vui lòng chọn nhà trọ trước.");

    try {
      if (editingRoom) {
        // Update
        const updateDto: UpdateRoomDto = { ...formData };
        await updateRoom(selectedHouseId, editingRoom.id, updateDto);
      } else {
        // Create
        await createRoom(selectedHouseId, formData);
      }
      setIsModalOpen(false);
      loadRooms(selectedHouseId);
    } catch {
      alert("Đã có lỗi xảy ra, vui lòng thử lại.");
    }
  };

  const handleDelete = async (roomId: number) => {
    if (!selectedHouseId) return;
    if (confirm("Bạn có chắc muốn xóa phòng này không?")) {
      try {
        await deleteRoom(selectedHouseId, roomId);
        loadRooms(selectedHouseId);
      } catch {
        alert("Không thể xóa phòng (có thể đang có hợp đồng).");
      }
    }
  };

  // --- RENDER HELPERS ---
  const renderStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.Vacant:
        return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">Trống</span>;
      case RoomStatus.Occupied:
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold">Đang thuê</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-bold">Khác</span>;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen text-gray-800">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Quản lý Danh sách Phòng</h2>
                <p className="text-gray-500 text-sm">Quản lý phòng trọ theo từng tòa nhà</p>
            </div>
            {selectedHouseId && (
              <button 
                  onClick={() => openModal()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium text-sm"
              >
                  + Thêm Phòng Mới
              </button>
            )}
        </div>

        {/* --- STATS CARDS --- */}
        {selectedHouseId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                  <p className="text-gray-500 text-xs uppercase font-semibold">TỔNG SỐ PHÒNG</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                  <p className="text-gray-500 text-xs uppercase font-semibold">PHÒNG TRỐNG</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.vacant}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                  <p className="text-gray-500 text-xs uppercase font-semibold">ĐANG THUÊ</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{stats.occupied}</p>
              </div>
          </div>
        )}
      </div>

      {/* --- TOOLBAR / FILTER --- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
              {/* Chọn Nhà */}
              <div className="w-full md:w-64">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Chọn Nhà trọ</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={selectedHouseId || ""}
                  onChange={handleHouseChange}
                >
                  <option value="">-- Chọn Nhà --</option>
                  {houses.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="w-full md:w-64">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tìm kiếm phòng</label>
                <input 
                    type="text"
                    placeholder="Nhập tên phòng..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={!selectedHouseId}
                />
              </div>

              {/* Filter Status */}
              <div className="w-full md:w-48">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Trạng thái</label>
                <select 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  disabled={!selectedHouseId}
                >
                  <option value="ALL">Tất cả</option>
                  <option value={RoomStatus.Vacant}>Trống</option>
                  <option value={RoomStatus.Occupied}>Đang thuê</option>
                </select>
              </div>
          </div>
      </div>

      {/* --- TABLE VIEW --- */}
      {!selectedHouseId ? (
         <div className="bg-white border border-dashed rounded-lg p-10 text-center text-gray-500">
            Vui lòng chọn một nhà trọ để xem danh sách phòng.
         </div>
      ) : loadingRooms ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                        <tr>
                            <th className="p-4 border-b w-16 text-center">STT</th>
                            <th className="p-4 border-b">Tên Phòng</th>
                            <th className="p-4 border-b text-center">Tầng</th>
                            <th className="p-4 border-b text-center">Trạng thái</th>
                            <th className="p-4 border-b text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                        {filteredRooms.length > 0 ? filteredRooms.map((room, index) => (
                            <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 text-center font-mono text-gray-500">{index + 1}</td>
                                <td className="p-4 font-bold text-gray-800">
                                    {room.name}
                                </td>
                                <td className="p-4 text-center text-gray-600">{room.floor}</td>
                                <td className="p-4 text-center">
                                     {renderStatusBadge(room.status)}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button 
                                            onClick={() => openModal(room)} 
                                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition"
                                        >
                                            Sửa
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(room.id)} 
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
                                    Không tìm thấy phòng nào phù hợp.
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
              <h2 className="text-lg font-bold text-gray-800">{editingRoom ? "Cập nhật Phòng" : "Thêm Phòng Mới"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tên phòng <span className="text-red-500">*</span></label>
                <input 
                  className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ví dụ: P.101"
                  required 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tầng <span className="text-red-500">*</span></label>
                    <input 
                        type="number"
                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" 
                        value={formData.floor} 
                        onChange={e => setFormData({...formData, floor: parseInt(e.target.value)})} 
                        required 
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Trạng thái</label>
                    <select 
                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                        value={formData.status} 
                        onChange={e => setFormData({...formData, status: parseInt(e.target.value)})} 
                    >
                        <option value={RoomStatus.Vacant}>Trống</option>
                        <option value={RoomStatus.Occupied}>Đang thuê</option>
                    </select>
                </div>
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
                  {editingRoom ? "Lưu thay đổi" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoomsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500">Đang tải trang...</div>}>
      <RoomManager />
    </Suspense>
  );
}