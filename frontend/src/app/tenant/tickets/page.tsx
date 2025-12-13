"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// Đảm bảo bạn đã có file types/ticket.ts định nghĩa tenantId là string
import { Ticket, CreateTicketDto } from "@/types/ticket"; 
import { ticketService } from "@/services/ticket.service";
import {
  Loader2, CalendarDays, Plus, LogOut, Pencil, X
} from "lucide-react";

// Định nghĩa lại User cho khớp với Backend mới
interface CurrentUser {
  id: string; // User Id thường là GUID string
  fullName: string;
  tenantId: string; // [QUAN TRỌNG] Đã đổi thành string
  roomId: number;
}

export default function TenantTicketPage() {
  const router = useRouter();

  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  // Pagination & Filter
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 10;
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "DONE">("ALL");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<CreateTicketDto>({
    tenantId: "", // Khởi tạo là chuỗi rỗng
    roomId: 0,   
    title: "",
    description: "",
  });

  // --- 1. CHECK LOGIN & LOAD DATA ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("currentUser");

    if (!token || !storedUser) {
        router.push("/login");
        return;
    }

    try {
        const userObj: CurrentUser = JSON.parse(storedUser);
        setCurrentUser(userObj);
        fetchMyTickets(userObj.tenantId);
    } catch (e) {
        localStorage.clear();
        router.push("/login");
    }
  }, []);

  const fetchMyTickets = async (myTenantId: string) => {
    try {
      const allTickets = await ticketService.getAll();
      // Lọc theo String ID
      const myTickets = allTickets.filter((t: Ticket) => t.tenantId === myTenantId);
      setTickets(myTickets.reverse()); // Mới nhất lên đầu
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    }
  };

  // --- 2. XỬ LÝ FORM ---
  const openCreateForm = () => {
    if (!currentUser) return;
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      tenantId: currentUser.tenantId, // Gán ID string
      roomId: currentUser.roomId,
      title: "",
      description: "",
    });
    setShowModal(true);
  };

  const openEditForm = (ticket: Ticket) => {
    if (ticket.status === "done") return alert("Không thể sửa phiếu đã hoàn thành");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      if (isEditing && editingId) {
        await ticketService.updateContent(editingId, formData);
        alert("Cập nhật thành công!");
      } else {
        await ticketService.create(formData);
        alert("Gửi yêu cầu thành công!");
        setFilter("ALL");
        setCurrentPage(1);
      }
      setShowModal(false);
      await fetchMyTickets(currentUser.tenantId);
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra (Kiểm tra lại Backend)!");
    }
  };

  const handleLogout = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      router.push("/login");
  };

  // --- 3. RENDER UI ---
  const filteredTickets = tickets.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "PENDING") return !t.status || t.status === "pending";
    if (filter === "DONE") return t.status === "done";
    return true;
  });
  
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, startIndex + ticketsPerPage);
  const formatDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

  if (!currentUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-blue-600"/></div>;

  return (
    <div className="space-y-6 p-6 min-h-screen bg-slate-50 text-slate-800">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Xin chào, {currentUser.fullName}</h2>
          <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
             <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-200">
                Phòng {currentUser.roomId}
             </span>
          </div>
        </div>

        <div className="flex gap-2">
            <button onClick={openCreateForm} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-all">
                <Plus className="w-4 h-4" /> Báo hỏng mới
            </button>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-all" title="Đăng xuất">
                <LogOut className="w-4 h-4" /> Thoát
            </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* Tab Filter */}
        <div className="flex border-b border-slate-100 p-2 gap-2">
            {["ALL", "PENDING", "DONE"].map(type => (
                <button 
                    key={type}
                    onClick={() => {setFilter(type as any); setCurrentPage(1)}} 
                    className={`px-4 py-2 rounded-md text-sm font-medium ${filter === type ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}>
                    {type === "ALL" ? "Tất cả" : type === "PENDING" ? "Chờ xử lý" : "Đã xong"}
                </button>
            ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
               <tr>
                 <th className="p-4 border-b w-16">ID</th>
                 <th className="p-4 border-b">Nội dung</th>
                 <th className="p-4 border-b w-40">Ngày gửi</th>
                 <th className="p-4 border-b w-32 text-center">Trạng thái</th>
                 <th className="p-4 border-b w-20 text-center"></th>
               </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
               {paginatedTickets.length > 0 ? paginatedTickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                     <td className="p-4 font-bold text-slate-700">#{t.id}</td>
                     <td className="p-4">
                        <div className="font-bold text-slate-900">{t.title}</div>
                        <div className="text-slate-500 text-xs mt-1">{t.description}</div>
                     </td>
                     <td className="p-4 text-slate-600">
                        <div className="flex items-center gap-1"><CalendarDays className="w-3 h-3"/> {formatDate(t.createdAt)}</div>
                     </td>
                     <td className="p-4 text-center">
                        {t.status === "done" 
                            ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Đã xong</span> 
                            : <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Chờ xử lý</span>}
                     </td>
                     <td className="p-4 text-center">
                        {t.status !== "done" && (
                            <button onClick={() => openEditForm(t)} className="text-slate-400 hover:text-blue-600 p-2">
                                <Pencil className="w-4 h-4"/>
                            </button>
                        )}
                     </td>
                  </tr>
               )) : (
                 <tr><td colSpan={5} className="p-10 text-center text-slate-500">Chưa có phiếu nào</td></tr>
               )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end gap-2 text-sm">
            <button disabled={currentPage===1} onClick={()=>setCurrentPage(c=>c-1)} className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50">Trước</button>
            <span className="px-3 py-1 text-gray-500 self-center">Trang {currentPage} / {totalPages}</span>
            <button disabled={currentPage===totalPages} onClick={()=>setCurrentPage(c=>c+1)} className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50">Sau</button>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">{isEditing ? "Sửa nội dung" : "Báo hỏng mới"}</h3>
                    <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-500 hover:text-red-500"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Tiêu đề</label>
                        <input className="w-full border border-gray-300 p-2 rounded mt-1 focus:border-blue-500 outline-none" 
                            placeholder="Vd: Điều hòa không mát..." required 
                            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Chi tiết</label>
                        <textarea className="w-full border border-gray-300 p-2 rounded mt-1 h-32 focus:border-blue-500 outline-none resize-none" 
                            placeholder="Mô tả kỹ hơn về vấn đề..." required 
                            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                    
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition shadow-md">
                        {isEditing ? "Lưu thay đổi" : "Gửi ngay"}
                    </button>
                </form>
           </div>
        </div>
      )}
    </div>
  );
}