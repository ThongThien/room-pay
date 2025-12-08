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

  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(initialHouseId);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // State Filter
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); 

  // Loading & UI States
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  
  // State Form Thêm Mới
  const [newRoom, setNewRoom] = useState<CreateRoomDto>({ name: "", floor: 1, status: RoomStatus.Vacant });

  // State Form Sửa
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateRoomDto>({ name: "", floor: 1, status: RoomStatus.Vacant });

  // --- EFFECTS ---
  useEffect(() => {
    const fetchHousesList = async () => {
      try {
        const data = await getHouses();
        setHouses(data);
      } catch {
        console.error("Lỗi thông tin");
      }
    };
    fetchHousesList();
  }, []);

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

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = parseInt(e.target.value);
    if (newId) {
      setSelectedHouseId(newId);
      router.push(`/owner/rooms?houseId=${newId}`);
    } else {
      setSelectedHouseId(null);
      router.push(`/owner/rooms`);
    }
  };

  // LOGIC LỌC PHÒNG
  const filteredRooms = useMemo(() => {
    if (statusFilter === "ALL") return rooms;
    return rooms.filter(room => room.status === parseInt(statusFilter));
  }, [rooms, statusFilter]);

  // --- CRUD ---
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHouseId) return;
    try {
      await createRoom(selectedHouseId, newRoom);
      setNewRoom({ name: "", floor: 1, status: RoomStatus.Vacant }); 
      loadRooms(selectedHouseId); 
      alert("Thêm phòng thành công!");
    } catch { 
      alert("Lỗi thêm phòng"); 
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!selectedHouseId) return;
    if (confirm("Xóa phòng này? Hành động không thể hoàn tác.")) {
      try {
        await deleteRoom(selectedHouseId, roomId);
        loadRooms(selectedHouseId);
      } catch { 
        alert("Lỗi xóa phòng"); 
      }
    }
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setEditFormData({
      name: room.name,
      floor: room.floor,
      status: room.status
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHouseId || !editingRoom) return;
    try {
      await updateRoom(selectedHouseId, editingRoom.id, editFormData);
      setIsEditModalOpen(false);
      setEditingRoom(null);
      loadRooms(selectedHouseId); 
    } catch {
      alert("Lỗi cập nhật phòng");
    }
  };

  // --- RENDER HELPERS ---
  // Hàm hiển thị Badge trạng thái
  const renderStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.Vacant:
        return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">Trống</span>;
      case RoomStatus.Occupied:
        return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold">Đang thuê</span>;
      case RoomStatus.ClosingSoon:
        return <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-bold">Sắp đóng</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-bold">Khác</span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Quản lý Danh sách Phòng</h1>

      {/* --- TOOLBAR FILTER --- */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex flex-wrap gap-4 items-end">
        
        {/* Filter 1: Chọn Nhà */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Nhà trọ:</label>
          <select 
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedHouseId || ""}
            onChange={handleFilterChange}
          >
            <option value="">-- Vui lòng chọn Nhà --</option>
            {houses.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        {/* Filter 2: Chọn Trạng thái */}
        {selectedHouseId && (
          <div className="w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo trạng thái:</label>
            <select 
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả</option>
              <option value={RoomStatus.Vacant}>Trống</option>
              <option value={RoomStatus.Occupied}>Đang thuê</option>
              <option value={RoomStatus.ClosingSoon}>Sắp đóng</option>
            </select>
          </div>
        )}
      </div>

      {/* --- CONTENT --- */}
      {!selectedHouseId ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed">
          <p className="text-gray-500">Hãy chọn một nhà trọ ở trên để xem danh sách phòng.</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Danh sách phòng ({filteredRooms.length})
            </h2>
            <button 
              onClick={() => setIsAddingRoom(!isAddingRoom)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow-sm font-medium"
            >
              {isAddingRoom ? "Đóng Form" : "+ Thêm Phòng Mới"}
            </button>
          </div>

          {/* Form Thêm Phòng */}
          {isAddingRoom && (
            <div className="bg-blue-50 p-5 rounded-xl mb-6 border border-blue-100 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-sm font-bold text-blue-800 mb-3 uppercase">Thêm phòng mới</h3>
              <form onSubmit={handleAddRoom} className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Tên phòng</label>
                  <input className="border p-2 rounded-md w-40 focus:ring-2 focus:ring-blue-500 outline-none" value={newRoom.name} onChange={e=>setNewRoom({...newRoom, name: e.target.value})} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Tầng</label>
                  <input type="number" className="border p-2 rounded-md w-24 focus:ring-2 focus:ring-blue-500 outline-none" value={newRoom.floor} onChange={e=>setNewRoom({...newRoom, floor: parseInt(e.target.value)})} required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Trạng thái ban đầu</label>
                  <select className="border p-2 rounded-md w-40 focus:ring-2 focus:ring-blue-500 outline-none" value={newRoom.status} onChange={e=>setNewRoom({...newRoom, status: parseInt(e.target.value)})}>
                    <option value={RoomStatus.Vacant}>Trống</option>
                    <option value={RoomStatus.Occupied}>Đang thuê</option>
                    <option value={RoomStatus.ClosingSoon}>Sắp đóng</option>
                  </select>
                </div>
                <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition">Lưu ngay</button>
              </form>
            </div>
          )}

          {/* Table */}
          {loadingRooms ? <p className="text-center py-4">Đang tải dữ liệu phòng...</p> : (
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-xs text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="p-4">Tên Phòng</th>
                    <th className="p-4">Tầng</th>
                    <th className="p-4">Trạng thái</th>
                    <th className="p-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRooms.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-500">
                      {rooms.length === 0 ? "Nhà này chưa có phòng nào." : "Không tìm thấy phòng phù hợp bộ lọc."}
                    </td></tr>
                  ) : filteredRooms.map(room => (
                    <tr key={room.id} className="hover:bg-gray-50 transition">
                      <td className="p-4 font-medium text-gray-800">{room.name}</td>
                      <td className="p-4 text-gray-600">{room.floor}</td>
                      <td className="p-4">
                        {renderStatusBadge(room.status)}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => openEditModal(room)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition"
                        >
                          Sửa
                        </button>
                        <button 
                          onClick={() => handleDeleteRoom(room.id)} 
                          className="text-red-600 hover:text-red-800 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL SỬA PHÒNG */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Cập nhật Phòng</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleUpdateRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng</label>
                <input 
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editFormData.name}
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tầng</label>
                  <input 
                    type="number"
                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editFormData.floor}
                    onChange={e => setEditFormData({...editFormData, floor: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select 
                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editFormData.status}
                    onChange={e => setEditFormData({...editFormData, status: parseInt(e.target.value)})}
                  >
                    <option value={RoomStatus.Vacant}>Trống</option>
                    <option value={RoomStatus.Occupied}>Đang thuê</option>
                    <option value={RoomStatus.ClosingSoon}>Sắp đóng</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm">Lưu thay đổi</button>
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
    <Suspense fallback={<div>Loading page...</div>}>
      <RoomManager />
    </Suspense>
  );
}