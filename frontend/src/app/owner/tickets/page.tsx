"use client";

import { useEffect, useState } from "react";
import { Ticket } from "@/types/ticket";
import { ticketService } from "@/services/ticket.service";
import {
  CheckCircle, AlertCircle, Loader2, CalendarDays, Trash2, MapPin, Wrench, Search, Filter, ChevronDown
} from "lucide-react";

// --- STYLES CONFIG ---
const styles = {
  pageWrapper: "min-h-screen bg-slate-50 font-sans text-slate-800 p-6 sm:p-8",
  
  // HEADER
  header: {
    container: "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
    subTitle: "mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700",
    title: "text-3xl font-extrabold tracking-tight text-slate-900",
    desc: "mt-2 text-slate-500 max-w-lg",
  },

  // FILTER BAR
  filterBar: {
    container: "mb-8 flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 sm:flex-row sm:items-center relative z-10",
    searchBox: "relative flex-1",
    searchInput: "w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all",
    searchIcon: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4",
    
    // Dropdown Container
    filterGroup: "relative",
    filterBtn: "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors",
    activeFilterBtn: "inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700",
    
    // Dropdown Menu
    dropdown: "absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl shadow-slate-200/50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100",
    dropdownItem: "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer transition-colors",
    activeItem: "bg-blue-50 text-blue-700",
  },

  // GRID
  grid: "grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3",

  // CARD
  card: {
    base: "group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)]",
    header: "mb-4 flex items-start justify-between",
    idBadge: "inline-flex items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-slate-200",
    body: "mb-6 flex-1",
    title: "mb-2 text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-blue-700 transition-colors",
    desc: "text-sm text-slate-500 line-clamp-3 leading-relaxed",
    meta: "flex items-center gap-4 text-xs font-medium text-slate-400 mt-3",
    footer: "flex items-center justify-between border-t border-slate-100 pt-4 mt-auto",
    
    actionGroup: "flex items-center gap-2",
    doneBtn: "inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition-colors",
    deleteBtn: "inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors",
  },

  // EMPTY STATE
  empty: {
    box: "flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center",
    icon: "mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300",
    text: "text-base font-semibold text-slate-900",
    subText: "text-sm text-slate-500 mt-1 max-w-xs",
  }
};

export default function TicketPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- STATE FILTER ---
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchTickets = async () => {
    try {
      const data = await ticketService.getAll();
      setTickets(data.reverse());
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, []);

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

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.roomId.toString().includes(searchTerm);
    
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Helper hiển thị tên trạng thái (Đã bỏ 'Đang xử lý')
  const getFilterLabel = (status: string) => {
      switch(status) {
          case 'pending': return 'Chờ tiếp nhận';
          case 'done': return 'Đã xong';
          default: return 'Tất cả trạng thái';
      }
  };

  const renderStatusBadge = (status: string) => {
    const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide";
    if (status === "done") return <span className={`${base} bg-emerald-50 text-emerald-600 border border-emerald-100`}><CheckCircle className="h-3 w-3"/> Đã Xong</span>;
    if (status === "processing") return <span className={`${base} bg-blue-50 text-blue-600 border border-blue-100`}><Loader2 className="h-3 w-3 animate-spin"/> Đang Xử Lý</span>;
    return <span className={`${base} bg-orange-50 text-orange-600 border border-orange-100`}><AlertCircle className="h-3 w-3"/> Chờ Tiếp Nhận</span>;
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* HEADER */}
      <div className={styles.header.container}>
        <div>
           <div className={styles.header.subTitle}>
              <Wrench className="h-3.5 w-3.5" /> Quản lý vận hành
           </div>
           <h1 className={styles.header.title}>Yêu Cầu Sửa Chữa</h1>
           <p className={styles.header.desc}>Danh sách các sự cố báo hỏng từ cư dân cần được xử lý.</p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className={styles.filterBar.container}>
         
         {/* Search */}
         <div className={styles.filterBar.searchBox}>
            <Search className={styles.filterBar.searchIcon} />
            <input 
                placeholder="Tìm theo tiêu đề hoặc số phòng..." 
                className={styles.filterBar.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         {/* Filter Dropdown */}
         <div className={styles.filterBar.filterGroup}>
            <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={filterStatus === 'all' ? styles.filterBar.filterBtn : styles.filterBar.activeFilterBtn}
            >
                <Filter className="h-4 w-4"/> 
                {getFilterLabel(filterStatus)}
                <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-1"/>
            </button>

            {/* Menu Dropdown - Đã bỏ mục 'Đang xử lý' */}
            {isDropdownOpen && (
                <div className={styles.filterBar.dropdown}>
                    {[
                        { val: 'all', label: 'Tất cả' },
                        { val: 'pending', label: 'Chờ tiếp nhận' },
                        { val: 'done', label: 'Đã xong' }
                    ].map((opt) => (
                        <div 
                            key={opt.val}
                            onClick={() => {
                                setFilterStatus(opt.val);
                                setIsDropdownOpen(false);
                            }}
                            className={`${styles.filterBar.dropdownItem} ${filterStatus === opt.val ? styles.filterBar.activeItem : ''}`}
                        >
                            {opt.label}
                            {filterStatus === opt.val && <CheckCircle className="h-3.5 w-3.5"/>}
                        </div>
                    ))}
                </div>
            )}
         </div>
      </div>

      {/* CONTENT GRID */}
      {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-blue-500"/></div>
      ) : filteredTickets.length === 0 ? (
         <div className={styles.empty.box}>
            <div className={styles.empty.icon}><Search className="h-8 w-8" /></div>
            <p className={styles.empty.text}>Không tìm thấy kết quả</p>
            <p className={styles.empty.subText}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
         </div>
      ) : (
         <div className={styles.grid}>
            {filteredTickets.map(t => (
               <div key={t.id} className={styles.card.base}>
                  {/* Header Card */}
                  <div className={styles.card.header}>
                     <span className={styles.card.idBadge}>#{t.id}</span>
                     {renderStatusBadge(t.status)}
                  </div>

                  {/* Body Card */}
                  <div className={styles.card.body}>
                     <h3 className={styles.card.title} title={t.title}>{t.title}</h3>
                     <p className={styles.card.desc} title={t.description}>{t.description}</p>
                     
                     <div className={styles.card.meta}>
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><MapPin className="h-3 w-3"/> Phòng {t.roomId}</span>
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><CalendarDays className="h-3 w-3"/> {new Date(t.createdAt).toLocaleDateString('vi-VN')}</span>
                     </div>
                  </div>

                  {/* Footer Action */}
                  <div className={styles.card.footer}>
                     <div className="text-xs font-semibold text-slate-400">Tenant: #{t.tenantId}</div>
                     <div className={styles.card.actionGroup}>
                        {t.status !== 'done' && (
                           <button onClick={() => handleStatusChange(t.id)} className={styles.card.doneBtn}>
                              <CheckCircle className="h-3.5 w-3.5" /> Hoàn thành
                           </button>
                        )}
                        <button onClick={() => handleDelete(t.id)} className={styles.card.deleteBtn} title="Xóa yêu cầu">
                           <Trash2 className="h-4 w-4" />
                        </button>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      )}
    </div>
  );
}