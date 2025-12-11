"use client";

import { useEffect, useState } from "react";
import { Ticket } from "@/types/ticket";
import { ticketService } from "@/services/ticket.service";
import {
  CheckCircle, AlertCircle, Loader2, CalendarDays, Trash2, MapPin, 
  Search, Filter, ChevronDown, User, MoreHorizontal, ArrowUpDown
} from "lucide-react";

// --- STYLES CONFIG (THEME TABLE - GIỐNG HÓA ĐƠN) ---
const styles = {
  pageWrapper: "min-h-screen bg-slate-50 font-sans text-slate-800 p-6 sm:p-8",
  
  // Header section
  header: {
    wrapper: "mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
    title: "text-2xl font-bold tracking-tight text-slate-900",
    subTitle: "text-sm text-slate-500",
    actions: "flex gap-3",
  },

  // Toolbar (Search & Filter)
  toolbar: {
    wrapper: "mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-12",
    searchBox: "relative sm:col-span-8 md:col-span-9",
    input: "w-full rounded-lg border-none bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400",
    icon: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400",
    
    filterBox: "relative sm:col-span-4 md:col-span-3",
    filterBtn: "flex w-full items-center justify-between rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500",
    dropdown: "absolute right-0 top-full z-10 mt-2 w-full rounded-lg border border-slate-100 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5",
    dropdownItem: "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50",
  },

  // Table Container
  tableContainer: "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
  table: "min-w-full divide-y divide-slate-200",
  thead: "bg-slate-50",
  th: "px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500",
  tbody: "divide-y divide-slate-200 bg-white",
  tr: "hover:bg-slate-50 transition-colors",
  td: "whitespace-nowrap px-6 py-4 text-sm text-slate-700",
  
  // Elements inside table
  idBadge: "inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10",
  userCell: "flex items-center gap-3",
  userAvatar: "flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600",
  userInfo: "flex flex-col",
  userName: "font-medium text-slate-900",
  userSub: "text-xs text-slate-500",
  
  // Actions
  actionBtn: "rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition",
  approveBtn: "rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 transition",
  deleteBtn: "rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition",
};

export default function TicketPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch Data
  const fetchTickets = async () => {
    try {
      const data = await ticketService.getAll();
      setTickets(data.reverse());
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, []);

  // Actions
  const handleStatusChange = async (id: number) => {
    if(confirm("Xác nhận đã xử lý xong yêu cầu này?")) {
        await ticketService.updateStatus(id, 'done');
        fetchTickets();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn chắc chắn muốn xóa yêu cầu này?")) {
      await ticketService.delete(id);
      fetchTickets();
    }
  };

  // Logic Lọc
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.roomId.toString().includes(searchTerm);
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Helper UI
  const getFilterLabel = (status: string) => {
      switch(status) {
          case 'pending': return 'Chờ tiếp nhận';
          case 'done': return 'Đã hoàn thành';
          default: return 'Tất cả trạng thái';
      }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "done") 
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"><CheckCircle className="h-3 w-3"/> Đã xong</span>;
    if (status === "processing") 
      return <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"><Loader2 className="h-3 w-3 animate-spin"/> Đang xử lý</span>;
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"><AlertCircle className="h-3 w-3"/> Chờ tiếp nhận</span>;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* 1. HEADER PAGE */}
      <div className={styles.header.wrapper}>
        <div>
          <h1 className={styles.header.title}>Danh sách yêu cầu sửa chữa</h1>
          <p className={styles.header.subTitle}>Quản lý và theo dõi trạng thái các sự cố từ cư dân.</p>
        </div>
        <div className={styles.header.actions}>
           {/* Có thể thêm nút Export Excel ở đây nếu muốn giống Invoice */}
        </div>
      </div>

      {/* 2. TOOLBAR (SEARCH & FILTER) */}
      <div className={styles.toolbar.wrapper}>
        <div className={styles.toolbar.searchBox}>
          <Search className={styles.toolbar.icon} />
          <input 
            placeholder="Tìm kiếm theo tiêu đề, số phòng..." 
            className={styles.toolbar.input}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.toolbar.filterBox}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={styles.toolbar.filterBtn}
          >
            <span className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500"/> {getFilterLabel(filterStatus)}</span>
            <ChevronDown className="h-4 w-4 text-slate-400"/>
          </button>

          {isDropdownOpen && (
            <div className={styles.toolbar.dropdown}>
              {['all', 'pending', 'done'].map((opt) => (
                <div 
                  key={opt}
                  onClick={() => { setFilterStatus(opt); setIsDropdownOpen(false); }}
                  className={`${styles.toolbar.dropdownItem} ${filterStatus === opt ? 'bg-blue-50 text-blue-700' : ''}`}
                >
                  {getFilterLabel(opt)}
                  {filterStatus === opt && <CheckCircle className="h-3.5 w-3.5 text-blue-600"/>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. TABLE DATA */}
      <div className={styles.tableContainer}>
        {loading ? (
           <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500"/></div>
        ) : filteredTickets.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 rounded-full bg-slate-50 p-3"><Search className="h-6 w-6 text-slate-400" /></div>
              <p className="text-sm font-medium text-slate-900">Không tìm thấy yêu cầu nào</p>
              <p className="text-xs text-slate-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>Mã phiếu</th>
                  <th className={styles.th}>Thông tin sự cố</th>
                  <th className={styles.th}>Người gửi</th>
                  <th className={styles.th}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-700">
                      Ngày tạo <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className={styles.th}>Trạng thái</th>
                  <th className={styles.th}>Hành động</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {filteredTickets.map((t) => (
                  <tr key={t.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.idBadge}>#{t.id}</span>
                    </td>
                    <td className={styles.td}>
                      <div className="flex flex-col max-w-xs">
                        <span className="font-medium text-slate-900 truncate" title={t.title}>{t.title}</span>
                        <span className="text-xs text-slate-500 truncate" title={t.description}>{t.description}</span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.userCell}>
                        <div className={styles.userAvatar}>
                           <User className="h-4 w-4" />
                        </div>
                        <div className={styles.userInfo}>
                          <span className={styles.userName}>Tenant #{t.tenantId}</span>
                          <span className={styles.userSub}>Phòng {t.roomId}</span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className={styles.td}>
                      {renderStatusBadge(t.status)}
                    </td>
                    <td className={styles.td}>
                      <div className="flex items-center gap-2">
                        {t.status !== 'done' && (
                          <button 
                            onClick={() => handleStatusChange(t.id)} 
                            className={styles.approveBtn} 
                            title="Đánh dấu hoàn thành"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(t.id)} 
                          className={styles.deleteBtn} 
                          title="Xóa yêu cầu"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* 4. FOOTER / PAGINATION (Giả lập giống Invoice) */}
      <div className="mt-4 flex items-center justify-between px-2 text-sm text-slate-500">
         <p>Hiển thị <span className="font-medium text-slate-900">{filteredTickets.length}</span> kết quả</p>
         <div className="flex gap-2">
            <button className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50" disabled>Trước</button>
            <button className="rounded border border-slate-200 px-3 py-1 hover:bg-slate-50 disabled:opacity-50" disabled>Sau</button>
         </div>
      </div>

    </div>
  );
}