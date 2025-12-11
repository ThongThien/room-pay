"use client";
import { useEffect, useState } from "react";
import { Ticket, CreateTicketDto } from "@/types/ticket";
import { ticketService } from "@/services/ticket.service";
import { Plus, Trash2, CheckCircle, Clock, AlertCircle, Wrench, X } from "lucide-react";

export default function TicketPage() {
  // --- STATE ---
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<CreateTicketDto>({
    tenantId: 101, 
    roomId: 202, 
    title: "", 
    description: "",
  });

  // --- LOGIC: FETCH DATA ---
  const fetchTickets = async () => {
    try {
      const data = await ticketService.getAll();
      setTickets(data);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchTickets(); 
  }, []);

  // --- LOGIC: CREATE TICKET ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ticketService.create(formData);
      alert("Tạo yêu cầu thành công!");
      
      // Reset form & Close popup
      setShowForm(false);
      setFormData({ ...formData, title: "", description: "" });
      
      // Reload list
      fetchTickets();
    } catch (error) { 
      alert("Lỗi khi tạo vé. Kiểm tra lại Backend nhé!"); 
    }
  };

  // --- LOGIC: UPDATE STATUS ---
  const handleStatusChange = async (id: number) => {
    if(confirm("Đánh dấu yêu cầu này đã xử lý xong?")) {
        await ticketService.updateStatus(id, 'done');
        fetchTickets();
    }
  };

  // --- LOGIC: DELETE TICKET ---
  const handleDelete = async (id: number) => {
    if (confirm("Bạn muốn xóa yêu cầu này?")) {
      await ticketService.delete(id);
      fetchTickets();
    }
  };

  // --- RENDER ---
  return (
    <div>
      {/* 1. Header & Nút Thêm */}
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Yêu Cầu Sửa Chữa</h1>
           <p className="text-gray-500 text-sm">Quản lý các sự cố báo hỏng từ khách thuê</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center shadow-md transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Thêm Yêu Cầu
        </button>
      </div>

      {/* 2. Danh sách vé (Table) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[400px]">
        {loading ? (
           <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : tickets.length === 0 ? (
           <div className="p-20 flex flex-col items-center justify-center text-gray-400">
             <div className="bg-gray-100 p-4 rounded-full mb-4">
                <Wrench className="w-10 h-10 text-gray-300" />
             </div>
             <p>Chưa có yêu cầu sửa chữa nào.</p>
             <button onClick={() => setShowForm(true)} className="text-green-500 mt-2 hover:underline">Tạo yêu cầu đầu tiên</button>
           </div>
        ) : (
            // Bảng dữ liệu
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-4 border-b">ID</th>
                            <th className="p-4 border-b">Tiêu đề & Mô tả</th>
                            <th className="p-4 border-b">Thông tin</th>
                            <th className="p-4 border-b">Trạng thái</th>
                            <th className="p-4 border-b text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                        {tickets.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 transition">
                                <td className="p-4 font-bold text-gray-400">#{t.id}</td>
                                <td className="p-4">
                                    <div className="font-bold text-gray-800 text-base">{t.title}</div>
                                    <div className="text-gray-500 truncate max-w-xs">{t.description}</div>
                                </td>
                                <td className="p-4 text-gray-600">
                                    <div>Phòng: <span className="font-semibold text-gray-800">{t.roomId}</span></div>
                                    <div className="text-xs">Tenant: {t.tenantId}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold capitalize
                                        ${t.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {t.status === 'done' ? <CheckCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                                        {t.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right space-x-2">
                                    {t.status !== 'done' && (
                                        <button onClick={() => handleStatusChange(t.id)} className="text-green-600 hover:bg-green-50 p-2 rounded" title="Hoàn thành">
                                            <CheckCircle className="w-5 h-5"/>
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:bg-red-50 p-2 rounded" title="Xóa">
                                        <Trash2 className="w-5 h-5"/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* 3. Popup Form (Modal) - Giao diện mới */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg animate-in fade-in zoom-in duration-200">
                
                {/* Header Popup */}
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Thêm yêu cầu mới</h2>
                    <button 
                      onClick={() => setShowForm(false)} 
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
                    >
                      <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Inputs */}
                <form onSubmit={handleCreate} className="space-y-5">
                    
                    {/* Input Tiêu đề */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tiêu đề sự cố</label>
                        <input 
                            className="w-full border border-gray-300 bg-gray-50 p-3 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all placeholder-gray-400" 
                            placeholder="Ví dụ: Hỏng bóng đèn nhà tắm..." 
                            required
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                        />
                    </div>

                    {/* Input Mô tả */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Mô tả chi tiết</label>
                        <textarea 
                            className="w-full border border-gray-300 bg-gray-50 p-3 rounded-lg text-gray-900 h-32 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all placeholder-gray-400 resize-none" 
                            placeholder="Mô tả tình trạng hỏng hóc..." 
                            required
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>

                    {/* Input Room & Tenant */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mã Phòng</label>
                            <input 
                                type="number" 
                                className="w-full border border-gray-300 bg-gray-50 p-3 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" 
                                placeholder="101" 
                                required
                                value={formData.roomId} 
                                onChange={e => setFormData({...formData, roomId: +e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mã Khách</label>
                            <input 
                                type="number" 
                                className="w-full border border-gray-300 bg-gray-50 p-3 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all" 
                                placeholder="001" 
                                required
                                value={formData.tenantId} 
                                onChange={e => setFormData({...formData, tenantId: +e.target.value})} 
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t mt-6">
                        <button 
                            type="button" 
                            onClick={() => setShowForm(false)} 
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            type="submit" 
                            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
                        >
                            Lưu yêu cầu
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}