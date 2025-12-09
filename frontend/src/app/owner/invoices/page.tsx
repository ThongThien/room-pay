"use client";

import { useEffect, useState, useMemo } from "react";
import { getMyInvoices } from "@/services/invoiceService";
import { Invoice } from "@/types/invoice";
import InvoiceDetailModal from "@/components/invoice/InvoiceDetailModal";

export default function OwnerInvoicesPage() {
    // --- STATE QUẢN LÝ DỮ LIỆU ---
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    // --- STATE BỘ LỌC ---
    // Trạng thái
    const [statusFilter, setStatusFilter] = useState<"ALL" | "UNPAID" | "OVERDUE" | "PAID">("ALL");

    // Thời gian
    const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Nhà
    const [selectedHouseName, setSelectedHouseName] = useState<string>("ALL");

    // --- STATE UI KHÁC ---
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    // const [processingId, setProcessingId] = useState<number | null>(null); // Tạm ẩn vì chưa gọi API nào

    // Helper: Format tiền tệ
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Helper: Format ngày
    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getMyInvoices();
                setInvoices(data);
            } catch (error) {
                console.error("Lỗi tải hóa đơn:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- LOGIC: TẠO DANH SÁCH NHÀ ĐỘNG ---
    const uniqueHouses = useMemo(() => {
        const allHouseNames = invoices
            .map(inv => inv.houseName)
            .filter((name): name is string => !!name);
        return Array.from(new Set(allHouseNames)).sort();
    }, [invoices]);

    // --- LOGIC: TẠO DANH SÁCH NĂM ĐỘNG ---
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = 2020;
        const endYear = currentYear + 5;
        const list = [];
        for (let y = startYear; y <= endYear; y++) {
            list.push(y);
        }
        return list;
    }, []);

    // --- LOGIC: XỬ LÝ NHẮC THANH TOÁN (Dummy) ---
    const handleRemind = (id: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Chặn click lan ra dòng (tránh mở modal chi tiết)
        
        // Hiện tại chưa có API nên chỉ thông báo hoặc để trống
        alert(`Nhắc thanh toán`);
        
        // await remindInvoice(id);
    };

    // --- LOGIC: LỌC DỮ LIỆU ---
    const filteredInvoices = invoices.filter(inv => {
        // 1. Lọc theo trạng thái
        let matchStatus = true;
        if (statusFilter === "UNPAID") matchStatus = inv.status === "Unpaid";
        if (statusFilter === "OVERDUE") matchStatus = inv.status === "Overdue";
        if (statusFilter === "PAID") matchStatus = inv.status === "Paid";

        // 2. Lọc theo thời gian
        const invDate = new Date(inv.invoiceDate);
        const matchYear = invDate.getFullYear() === selectedYear;
        const matchMonth = selectedMonth === "ALL" || (invDate.getMonth() + 1) === selectedMonth;

        // 3. Lọc theo Nhà
        const matchHouse = selectedHouseName === "ALL" || inv.houseName === selectedHouseName;

        return matchStatus && matchYear && matchMonth && matchHouse;
    });

    // --- TÍNH TOÁN THỐNG KÊ ---
    const stats = {
        totalCollected: filteredInvoices.filter(i => i.status === "Paid").reduce((acc, cur) => acc + cur.totalAmount, 0),
        totalPending: filteredInvoices.filter(i => i.status !== "Paid").reduce((acc, cur) => acc + cur.totalAmount, 0),
        countUnpaid: filteredInvoices.filter(i => i.status === "Unpaid").length,
        countOverdue: filteredInvoices.filter(i => i.status === "Overdue").length,
    };

    return (
        <div className="space-y-6 p-6 bg-gray-50 min-h-screen text-gray-800">
            {/* Header & Stats Cards */}
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Quản lý hóa đơn</h2>
                        <p className="text-gray-500 text-sm">
                            Hóa đơn tháng {selectedMonth === "ALL" ? "Tất cả" : selectedMonth}/{selectedYear}
                        </p>
                    </div>
                </div>

                {/* Thống kê nhanh */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                        <p className="text-gray-500 text-xs uppercase font-semibold">Cần thu</p>
                        <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalPending)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <p className="text-gray-500 text-xs uppercase font-semibold">Đã thu</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                        <p className="text-gray-500 text-xs uppercase font-semibold">Tổng doanh thu dự kiến</p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalCollected + stats.totalPending)}</p>
                    </div>
                </div>
            </div>

            {/* --- THANH CÔNG CỤ BỘ LỌC --- */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border items-center justify-between">
                <div className="flex bg-gray-100 p-1 rounded-md overflow-x-auto">
                    <button onClick={() => setStatusFilter("ALL")} className={`px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Tất cả</button>
                    <button onClick={() => setStatusFilter("UNPAID")} className={`px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === "UNPAID" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Chưa thanh toán</button>
                    <button onClick={() => setStatusFilter("OVERDUE")} className={`px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === "OVERDUE" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Quá hạn</button>
                    <button onClick={() => setStatusFilter("PAID")} className={`px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${statusFilter === "PAID" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Đã thanh toán</button>
                </div>

                <div className="flex gap-2 flex-wrap md:flex-nowrap">
                    <select value={selectedHouseName} onChange={(e) => setSelectedHouseName(e.target.value)} className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]">
                        <option value="ALL">Tất cả các Nhà</option>
                        {uniqueHouses.map((name, index) => (<option key={index} value={name}>{name}</option>))}
                    </select>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))} className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="ALL">Cả năm</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>Tháng {m}</option>))}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        {years.map(y => (<option key={y} value={y}>{y}</option>))}
                    </select>
                </div>
            </div>

            {/* Bảng danh sách */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="p-4 border-b">Mã HĐ</th>
                                    <th className="p-4 border-b">Khách thuê / Phòng</th>
                                    <th className="p-4 border-b">Hạn đóng</th>
                                    <th className="p-4 border-b text-right">Tổng tiền</th>
                                    <th className="p-4 border-b text-center">Trạng thái</th>
                                    <th className="p-4 border-b text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                                        <td className="p-4 font-mono text-gray-500">#{inv.id}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{inv.userName || "Khách vãng lai"}</span>
                                                <span className="text-xs text-gray-500">{inv.houseName ? `${inv.houseName}` : "Chưa cập nhật nhà"}{inv.roomName ? ` - ${inv.roomName}` : ""}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600">{formatDate(inv.dueDate)}</td>
                                        <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(inv.totalAmount)}</td>
                                        <td className="p-4 text-center">
                                            {inv.status === "Paid" && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Đã thanh toán</span>}
                                            {inv.status === "Unpaid" && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Chưa thanh toán</span>}
                                            {inv.status === "Overdue" && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Quá hạn</span>}
                                            {!["Paid", "Unpaid", "Overdue"].includes(inv.status) && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{inv.status}</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            {inv.status !== "Paid" ? (
                                                <button
                                                    onClick={(e) => handleRemind(inv.id, e)} // Gọi hàm dummy
                                                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
                                                >
                                                    Nhắc thanh toán
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Hoàn tất</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-gray-400">
                                            <p>Không tìm thấy hóa đơn nào.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedInvoice && (
                <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
            )}
        </div>
    );
}