"use client";

import { useEffect, useState } from "react";
import { getMyInvoices, markInvoiceAsPaid } from "@/services/invoiceService";
import { Invoice } from "@/types/invoice";
import InvoiceDetailModal from "@/components/invoice/InvoiceDetailModal";

// Interface cho API parameters
interface InvoiceApiParams {
    page: number;
    pageSize: number;
    status?: string;
    year?: number;
    month?: number;
}
// --- DANH SÁCH NHÀ CHỈ CÒN A, B, C ---
const MOCK_HOUSES_FOR_UI = [
    { id: 0, name: "Tất cả các Nhà/Tòa" }, // Tùy chọn mặc định
    { id: 1, name: "A" },
    { id: 2, name: "B" },
    { id: 3, name: "C" },
];
export default function OwnerInvoicesPage() {
    // STATE QUẢN LÝ DỮ LIỆU VÀ FILTER 
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalInvoices, setTotalInvoices] = useState(0);
    const pageSize = 20; // Số items per page

    // Filter Status: Trạng thái (Tất cả / Chưa thu / Đã thu)
    const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL");

    // Filter Date: Mặc định chọn Tháng hiện tại và Năm hiện tại
    const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);
    // FILTER MỚI: Nhà (House)
    const [selectedHouseId, setSelectedHouseId] = useState<number>(0);
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Chuẩn bị parameters cho API
                const params: InvoiceApiParams = {
                    page: currentPage,
                    pageSize: pageSize,
                };

                // Thêm status filter
                if (statusFilter !== "ALL") {
                    params.status = statusFilter === "PENDING" ? "Unpaid" : "Paid";
                }

                // Thêm date filters
                if (selectedYear) {
                    params.year = selectedYear;
                }
                if (selectedMonth !== "ALL") {
                    params.month = selectedMonth;
                }

                const data = await getMyInvoices(params);
                setInvoices(data);
                
                // Giả sử API trả về total count trong response header hoặc tính toán
                // Ở đây tạm thời set total pages dựa trên data length
                // Trong thực tế, API nên trả về totalCount
                setTotalPages(Math.ceil(data.length / pageSize) || 1);
                setTotalInvoices(data.length);
                
            } catch (error) {
                console.error("Lỗi tải hóa đơn:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentPage, statusFilter, selectedMonth, selectedYear]);

    const handleMarkAsPaid = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmPayment = window.confirm("Nhắc thanh toán khách hàng?");
        if (!confirmPayment) return;

        setProcessingId(id);
        const success = await markInvoiceAsPaid(id);

        if (success) {
            setInvoices(prev => prev.map(inv =>
                inv.id === id
                    ? { ...inv, status: "Paid", paidDate: new Date().toISOString() }
                    : inv
            ));
        } else {
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        }
        setProcessingId(null);
    };

    // LOGIC LỌC DỮ LIỆU 
    const filteredInvoices = invoices.filter(inv => {
        // Lọc theo trạng thái
        let matchStatus = true;
        if (statusFilter === "PENDING") matchStatus = inv.status !== "Paid";
        if (statusFilter === "PAID") matchStatus = inv.status === "Paid";

        // Lọc theo thời gian (Dựa vào InvoiceDate)
        const invDate = new Date(inv.invoiceDate);
        const matchYear = invDate.getFullYear() === selectedYear;
        const matchMonth = selectedMonth === "ALL" || (invDate.getMonth() + 1) === selectedMonth;

        return matchStatus && matchYear && matchMonth;
    });

    // TÍNH TOÁN THỐNG KÊ 
    const stats = {
        totalCollected: filteredInvoices.filter(i => i.status === "Paid").reduce((acc, cur) => acc + cur.totalAmount, 0),
        totalPending: filteredInvoices.filter(i => i.status !== "Paid").reduce((acc, cur) => acc + cur.totalAmount, 0),
        countPending: filteredInvoices.filter(i => i.status !== "Paid").length
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

                {/* Thống kê nhanh (Sẽ thay đổi theo bộ lọc) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
                        <p className="text-gray-500 text-xs uppercase font-semibold">Chưa thu (Tháng này)</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalPending)}</p>
                        <p className="text-xs text-gray-400 mt-1">{stats.countPending} phòng chưa đóng</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <p className="text-gray-500 text-xs uppercase font-semibold">Đã thu (Tháng này)</p>
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

                {/* Bộ lọc Trạng thái */}
                <div className="flex bg-gray-100 p-1 rounded-md">
                    <button
                        onClick={() => {
                            setStatusFilter("ALL");
                            setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter("PENDING");
                            setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "PENDING" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Chưa thu
                    </button>
                    <button
                        onClick={() => {
                            setStatusFilter("PAID");
                            setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "PAID" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Đã thu
                    </button>
                </div>

                {/* Bộ lọc Thời gian (Tháng / Năm) */}
                <div className="flex gap-2">
                    <select
                        value={selectedHouseId}
                        onChange={(e) => setSelectedHouseId(Number(e.target.value))}
                        className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {MOCK_HOUSES_FOR_UI.map(house => (
                            <option key={house.id} value={house.id}>{house.name}</option>
                        ))}
                    </select>
                    <select
                        value={selectedMonth}
                        onChange={(e) => {
                            setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="ALL">Cả năm</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => {
                            setSelectedYear(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
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
                                    <th className="p-4 border-b">Khách thuê</th>
                                    <th className="p-4 border-b">Hạn đóng</th>
                                    <th className="p-4 border-b text-right">Tổng tiền</th>
                                    <th className="p-4 border-b text-center">Trạng thái</th>
                                    <th className="p-4 border-b text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (
                                    <tr
                                        key={inv.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => setSelectedInvoice(inv)}
                                    >
                                        <td className="p-4 font-mono text-gray-500">#{inv.id}</td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">
                                                    {inv.userName || "Khách vãng lai"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600">{formatDate(inv.dueDate)}</td>
                                        <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(inv.totalAmount)}</td>
                                        <td className="p-4 text-center">
                                            {inv.status === "Paid" ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Đã thanh toán
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Chưa thanh toán
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            {inv.status !== "Paid" ? (
                                                <button
                                                    onClick={(e) => handleMarkAsPaid(inv.id, e)}
                                                    disabled={processingId === inv.id}
                                                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition disabled:bg-blue-300 shadow-sm whitespace-nowrap"
                                                >
                                                    {processingId === inv.id ? "..." : "Nhắc thanh toán"}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Xong</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-gray-400 flex flex-col items-center justify-center w-full">
                                            <p>Không tìm thấy hóa đơn nào.</p>
                                            <p className="text-sm mt-1">Thử chọn tháng khác hoặc thay đổi bộ lọc.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Chi tiết */}
            {selectedInvoice && (
                <InvoiceDetailModal
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                />
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-700">
                        <span>Hiển thị {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalInvoices)} của {totalInvoices} hóa đơn</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || loading}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Trước
                        </button>
                        
                        {/* Page Numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                            if (pageNum > totalPages) return null;
                            
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    disabled={loading}
                                    className={`px-3 py-1 text-sm border rounded-md ${
                                        currentPage === pageNum
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-gray-300 hover:bg-gray-50'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || loading}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
