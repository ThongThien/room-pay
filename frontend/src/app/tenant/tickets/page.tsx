"use client";

import { useEffect, useState } from "react";
import { Ticket, CreateTicketDto } from "@/types/ticket";
import { ticketService } from "@/services/ticket.service";
import {
  Plus, MapPin, History, CheckCircle, AlertCircle, X,
  Loader2, CalendarDays, Pencil, Ticket as TicketIcon
} from "lucide-react";

// --- STYLES CONFIG ---
const styles = {
  // Nền xám nhạt toàn trang
  pageWrapper: "min-h-screen bg-slate-50 font-sans text-slate-800",
  
  // HEADER
  header: {
    container: "bg-white px-6 py-8 shadow-sm border-b border-slate-100",
    content: "mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between",
    subTitle: "mb-1 text-xs font-bold uppercase tracking-wider text-blue-600",
    title: "text-3xl font-bold tracking-tight text-slate-900",
    badge: "mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200",
    
    // Actions
    actions: "flex flex-col sm:flex-row gap-4 items-start sm:items-center",
    statsBox: "flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100",
    createBtn: "inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0",
  },

  // CONTENT
  contentContainer: "mx-auto max-w-5xl px-6 py-8",
  
  sectionTitle: {
    wrapper: "mb-6 flex items-center gap-3",
    bar: "h-8 w-1.5 rounded-full bg-blue-600",
    text: "text-xl font-bold text-slate-900",
    subText: "text-sm text-slate-500"
  },

  // --- [CHỈNH SỬA PHẦN NÀY] ĐỔ BÓNG ĐẸP HƠN ---
  card: {
    // Thay đổi: Dùng shadow custom, bo góc 2xl, hiệu ứng hover mượt mà
    base: "group relative rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)]",
    
    topRow: "mb-4 flex items-center justify-between",
    idBadge: "inline-flex items-center justify-center rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 border border-slate-100",
    body: "mb-5 pl-1",
    title: "mb-1.5 text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-700",
    desc: "text-sm text-slate-500 line-clamp-2 leading-relaxed",
    footer: "flex items-center justify-between border-t border-slate-50 pt-4 mt-2",
    date: "flex items-center gap-1.5 text-xs font-medium text-slate-400",
    editBtn: "inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600",
  },
  
  // Modal
  modal: {
    overlay: "fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center",
    container: "w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
    header: "flex items-center justify-between border-b border-slate-100 px-6 py-4",
    closeBtn: "rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600",
    input: "w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10",
    textarea: "h-32 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10",
    submitBtn: "flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 active:scale-[0.99]",
  }
};

const CURRENT_TENANT_ID = 101;

export default function TenantTicketPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
      setTickets([...myTickets].reverse());
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMyTickets(); }, []);

  const openCreateForm = () => {
    setIsEditing(false); setEditingId(null);
    setFormData({ tenantId: CURRENT_TENANT_ID, roomId: 205, title: "", description: "" });
    setShowModal(true);
  };

  const openEditForm = (ticket: Ticket) => {
    if (ticket.status === "done") return alert("Vé đã hoàn thành, không thể chỉnh sửa!");
    setIsEditing(true); setEditingId(ticket.id);
    setFormData({ ...ticket, roomId: ticket.roomId }); 
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && editingId) {
        await ticketService.updateContent(editingId, formData);
        alert("Cập nhật thành công!");
      } else {
        await ticketService.create(formData);
        alert("Gửi thành công!");
      }
      setShowModal(false);
      fetchMyTickets();
    } catch (error) { alert("Có lỗi xảy ra!"); }
  };

  const renderStatusBadge = (status: string) => {
    const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide";
    if (status === "done") return (
      <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-100`}>
        <CheckCircle className="h-3 w-3" /> Đã xong
      </span>
    );
    if (status === "processing") return (
      <span className={`${base} bg-blue-50 text-blue-700 border border-blue-100`}>
        <Loader2 className="h-3 w-3 animate-spin" /> Đang xử lý
      </span>
    );
    return (
      <span className={`${base} bg-orange-50 text-orange-700 border border-orange-100`}>
        <AlertCircle className="h-3 w-3" /> Chờ tiếp nhận
      </span>
    );
  };

  const formatTime = (d?: string) => new Date(d || Date.now()).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className={styles.pageWrapper}>
      
      {/* HEADER */}
      <header className={styles.header.container}>
        <div className={styles.header.content}>
          <div>
            <p className={styles.header.subTitle}>Cổng thông tin cư dân</p>
            <h1 className={styles.header.title}>Xin chào, Tenant 👋</h1>
            <div className={styles.header.badge}>
              <MapPin className="h-3.5 w-3.5 text-slate-500" /> 
              Phòng 205 • Tòa nhà A
            </div>
          </div>

          <div className={styles.header.actions}>
            <div className={styles.header.statsBox}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <History className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Đã gửi</p>
                    <p className="text-sm font-bold text-slate-800">{tickets.length} phiếu</p>
                </div>
            </div>
            <button onClick={openCreateForm} className={styles.header.createBtn}>
              <Plus className="h-5 w-5" /> Báo hỏng mới
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT LIST */}
      <main className={styles.contentContainer}>
        <div className={styles.sectionTitle.wrapper}>
            <div className={styles.sectionTitle.bar}></div>
            <div>
                <h2 className={styles.sectionTitle.text}>Lịch sử yêu cầu</h2>
                <p className={styles.sectionTitle.subText}>Danh sách các sự cố bạn đã báo cáo.</p>
            </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-xs text-slate-500 font-medium">Đang tải dữ liệu...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
             <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <TicketIcon className="h-7 w-7" />
             </div>
             <p className="text-sm font-bold text-slate-700">Chưa có yêu cầu nào</p>
             <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Mọi thiết bị trong phòng đều ổn định. Nếu có sự cố, hãy báo ngay nhé!</p>
             <button onClick={openCreateForm} className="mt-5 text-sm font-bold text-blue-600 hover:underline hover:text-blue-700 transition">
                + Tạo yêu cầu đầu tiên
             </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {tickets.map((t) => (
              <div key={t.id} className={styles.card.base}>
                
                <div className={styles.card.topRow}>
                  <span className={styles.card.idBadge}>#{t.id}</span>
                  {renderStatusBadge(t.status)}
                </div>

                <div className={styles.card.body}>
                  <h3 className={styles.card.title}>{t.title}</h3>
                  <p className={styles.card.desc}>{t.description}</p>
                </div>

                <div className={styles.card.footer}>
                  <div className={styles.card.date}>
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatTime(t.createdAt)}
                  </div>
                  
                  {t.status !== "done" && (
                    <button onClick={() => openEditForm(t)} className={styles.card.editBtn}>
                      <Pencil className="h-3.5 w-3.5" /> Sửa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL */}
      {showModal && (
        <div className={styles.modal.overlay}>
          <div className={styles.modal.container}>
            <div className={styles.modal.header}>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isEditing ? "Chỉnh sửa yêu cầu" : "Báo hỏng thiết bị"}
                </h2>
                <p className="text-xs text-slate-500">Nhập thông tin sự cố để BQL hỗ trợ.</p>
              </div>
              <button onClick={() => setShowModal(false)} className={styles.modal.closeBtn}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-5 p-6 overflow-y-auto">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Tiêu đề sự cố <span className="text-red-500">*</span></label>
                <input
                  className={styles.modal.input} 
                  placeholder="Ví dụ: Bóng đèn bị cháy..."
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Mô tả chi tiết <span className="text-red-500">*</span></label>
                <textarea
                  className={styles.modal.textarea} 
                  placeholder="Mô tả cụ thể tình trạng..."
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 border border-blue-100 flex gap-2">
                 <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                 <span>Yêu cầu từ <b>Tenant #{CURRENT_TENANT_ID}</b> (Phòng {formData.roomId})</span>
              </div>

              <button type="submit" className={styles.modal.submitBtn}>
                {isEditing ? "Lưu thay đổi" : "Gửi yêu cầu ngay"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}