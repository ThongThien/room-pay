"use client";

import { useEffect, useState } from "react";
import { Ticket, CreateTicketDto } from "@/types/ticket";
import { ticketService } from "@/services/ticket.service";
import {
  CheckCircle, AlertCircle, Loader2, CalendarDays, Plus, Search, MapPin, X, Pencil
} from "lucide-react";

// GIỮ NGUYÊN ID GIẢ LẬP
const CURRENT_TENANT_ID = 101;

export default function TenantTicketPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // [FIX 1] Thêm state check mount
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 10;
  
  // Filter
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "DONE">("ALL");
  
  // State Modal & Edit
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Data
  const [formData, setFormData] = useState<CreateTicketDto>({
    tenantId: CURRENT_TENANT_ID,
    roomId: 205,
    title: "",
    description: "",
  });

  const fetchMyTickets = async () => {
    try {
      const allTickets = await ticketService.getAll();
      const myTickets = allTickets.filter((t: Ticket) => t.tenantId === CURRENT_TENANT_ID);
      setTickets(myTickets.reverse());
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
      setIsMounted(true); // [FIX 1] Đánh dấu đã mount
      fetchMyTickets(); 
  }, []);

  // --- LOGIC LỌC ---
  const filteredTickets = tickets.filter(t => {
    if (filter === "ALL") return true;
    if (filter === "PENDING") return !t.status || t.status === "pending"; 
    if (filter === "DONE") return t.status === "done";
    return true;
  });

  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + ticketsPerPage);

  const handleFilterChange = (newFilter: "ALL" | "PENDING" | "DONE") => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  // --- 1. MỞ FORM TẠO MỚI ---
  const openCreateForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ 
        tenantId: CURRENT_TENANT_ID, 
        roomId: 205, 
        title: "", 
        description: "" 
    });
    setShowModal(true);
  };

  // --- 2. MỞ FORM SỬA ---
  const openEditForm = (ticket: Ticket) => {
    if (ticket.status === 'done') {
        alert("Không thể sửa yêu cầu đã hoàn thành!");
        return;
    }
    setIsEditing(true);
    setEditingId(ticket.id);
    setFormData({
        tenantId: ticket.tenantId,
        roomId: ticket.roomId,
        title: ticket.title,
        description: ticket.description
    });
    setShowModal(true);
  };

  // --- 3. XỬ LÝ SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await ticketService.updateContent(editingId, formData);
        alert("Cập nhật thành công!");
      } else {
        await ticketService.create(formData);
        alert("Gửi yêu cầu thành công!");
      }
      
      setShowModal(false);
      fetchMyTickets();
    } catch (error) { alert("Có lỗi xảy ra!"); }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN');

  // [FIX 1] Trả về null nếu chưa mount để tránh lỗi Hydration
  if (!isMounted) return null;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-slate-50 text-slate-800">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Yêu cầu sửa chữa</h2>
          <p className="text-gray-500 text-sm">Quản lý và theo dõi các sự cố tại phòng của bạn</p>
        </div>
        
        <button 
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Báo hỏng mới
        </button>
      </div>

      {/* 2. FILTER TABS */}
      <div className="flex bg-white p-1 rounded-lg shadow-sm border border-slate-200 overflow-x-auto w-full md:w-fit">
        <button 
            onClick={() => handleFilterChange("ALL")} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "ALL" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
        >
            Tất cả
        </button>
        <button 
            onClick={() => handleFilterChange("PENDING")} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "PENDING" ? "bg-orange-100 text-orange-700" : "text-gray-600 hover:bg-gray-50"}`}
        >
            Chờ tiếp nhận
        </button>
        <button 
            onClick={() => handleFilterChange("DONE")} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "DONE" ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-50"}`}
        >
            Đã xong
        </button>
      </div>

      {/* 3. TABLE DATA */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500"/></div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="p-4 border-b w-20">Mã</th>
                  <th className="p-4 border-b w-24">Phòng</th> 
                  <th className="p-4 border-b">Vấn đề & Mô tả</th>
                  <th className="p-4 border-b w-40">Ngày tạo</th>
                  <th className="p-4 border-b w-32 text-center">Trạng thái</th>
                  <th className="p-4 border-b w-20 text-center">Sửa</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {paginatedTickets.length > 0 ? paginatedTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                        <span className="font-bold text-slate-700">#{t.id}</span>
                    </td>
                    
                    <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <MapPin className="w-3 h-3" />
                            {t.roomId}
                        </span>
                    </td>

                    <td className="p-4">
                        <div className="max-w-md">
                            <div className="font-bold text-slate-900 mb-1">{t.title}</div>
                            <div className="text-slate-500 text-xs line-clamp-1" title={t.description}>{t.description}</div>
                        </div>
                    </td>
                    <td className="p-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(t.createdAt)}
                        </div>
                    </td>
                    <td className="p-4 text-center">
                        {t.status === "done" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                Đã xong
                            </span>
                        )}
                        {t.status === "processing" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                Đang xử lý
                            </span>
                        )}
                        {(!t.status || t.status === "pending") && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                Chờ tiếp nhận
                            </span>
                        )}
                    </td>

                    <td className="p-4 text-center">
                        {t.status !== 'done' && (
                            <button 
                                onClick={() => openEditForm(t)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                                title="Chỉnh sửa nội dung"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}
                    </td>
                  </tr>
                )) : (
                  // [FIX 2] Đảm bảo cấu trúc tr > td hợp lệ khi không có dữ liệu
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                            <Search className="w-8 h-8 text-slate-300 mb-2" />
                            <p>Không tìm thấy yêu cầu nào.</p>
                        </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PHÂN TRANG */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-slate-500">
                Hiển thị {startIndex + 1}-{Math.min(startIndex + ticketsPerPage, filteredTickets.length)} của {filteredTickets.length} yêu cầu
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Trước
                </button>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Sau
                </button>
            </div>
        </div>
      )}

      {/* 5. MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 px-6 py-4">
                    <h3 className="text-lg font-bold text-slate-800">
                        {isEditing ? `Sửa yêu cầu #${editingId}` : "Báo hỏng thiết bị"}
                    </h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tiêu đề sự cố <span className="text-red-500">*</span></label>
                        <input 
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder="Ví dụ: Điều hòa chảy nước..."
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mô tả chi tiết <span className="text-red-500">*</span></label>
                        <textarea 
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm h-32 resize-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder="Mô tả kỹ tình trạng để BQL hỗ trợ nhanh nhất..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2 text-xs text-blue-700 border border-blue-100">
                        <MapPin className="w-4 h-4" />
                        <span>Yêu cầu từ: <b>Phòng {formData.roomId}</b> (Tenant #{CURRENT_TENANT_ID})</span>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowModal(false)}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition"
                        >
                            {isEditing ? "Lưu thay đổi" : "Gửi yêu cầu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}