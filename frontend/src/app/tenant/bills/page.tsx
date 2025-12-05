"use client";

import { useEffect, useState } from "react";
import { getMyInvoices } from "@/services/invoiceService";
import { Invoice } from "@/types/invoice";
import InvoiceDetailModal from "@/components/invoice/InvoiceDetailModal";

export default function TenantBillsPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"ALL" | "UNPAID" | "PAID">("ALL");
    
    // State để lưu hóa đơn đang được chọn xem chi tiết
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await getMyInvoices();
            setInvoices(data);
            setLoading(false);
        };
        fetchData();
    }, []);

    const filteredInvoices = invoices.filter(inv => {
        if (filter === "ALL") return true;
        if (filter === "UNPAID") return inv.status === "Unpaid" || inv.status === "Overdue";
        if (filter === "PAID") return inv.status === "Paid";
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header và Bộ lọc */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Quản lý hóa đơn</h2>
                    <p className="text-gray-500 text-sm">Xem lịch sử và thanh toán tiền phòng</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg shadow-sm border">
                    <button onClick={() => setFilter("ALL")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === "ALL" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}>Tất cả</button>
                    <button onClick={() => setFilter("UNPAID")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === "UNPAID" ? "bg-yellow-100 text-yellow-700" : "text-gray-600 hover:bg-gray-50"}`}>Chưa thanh toán</button>
                    <button onClick={() => setFilter("PAID")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === "PAID" ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-50"}`}>Đã thanh toán</button>
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
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="p-4 border-b">Mã HĐ</th>
                                    <th className="p-4 border-b">Ngày tạo</th>
                                    <th className="p-4 border-b">Tổng tiền</th>
                                    <th className="p-4 border-b text-center">Trạng thái</th>
                                    <th className="p-4 border-b text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors border-b last:border-0">
                                        <td className="p-4 font-medium text-gray-900">#{inv.id}</td>
                                        <td className="p-4 text-gray-600">{formatDate(inv.invoiceDate)}</td>
                                        <td className="p-4 font-bold text-blue-600">{formatCurrency(inv.totalAmount)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${inv.status === "Paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                                {inv.status === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            {/* Nút Xem chi tiết - Khi click sẽ set state selectedInvoice */}
                                            <button 
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* HIỂN THỊ MODAL NẾU CÓ HÓA ĐƠN ĐƯỢC CHỌN */}
            {selectedInvoice && (
                <InvoiceDetailModal 
                    invoice={selectedInvoice} 
                    onClose={() => setSelectedInvoice(null)} 
                />
            )}
        </div>
    );
}