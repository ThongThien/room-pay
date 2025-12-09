"use client";

import { useEffect, useState } from "react";
import { getMyInvoices } from "@/services/invoiceService";
import { Invoice } from "@/types/invoice";
import InvoiceDetailModal from "@/components/invoice/InvoiceDetailModal";

export default function TenantBillsPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [filter, setFilter] = useState<"ALL" | "UNPAID" | "OVERDUE" | "PAID">("ALL");
    
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
            try {
                const data = await getMyInvoices();
                setInvoices(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // logic lọc
    const filteredInvoices = invoices.filter(inv => {
        if (filter === "ALL") return true;
        if (filter === "UNPAID") return inv.status === "Unpaid"; 
        if (filter === "OVERDUE") return inv.status === "Overdue";
        if (filter === "PAID") return inv.status === "Paid";
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Quản lý hóa đơn</h2>
                    <p className="text-gray-500 text-sm">Xem lịch sử và thanh toán tiền phòng</p>
                </div>
                
                {/* 3. Cập nhật thanh nút bấm */}
                <div className="flex bg-white p-1 rounded-lg shadow-sm border overflow-x-auto">
                    <button 
                        onClick={() => setFilter("ALL")} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "ALL" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        Tất cả
                    </button>
                    <button 
                        onClick={() => setFilter("UNPAID")} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "UNPAID" ? "bg-yellow-100 text-yellow-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        Chưa thanh toán
                    </button>
                    <button 
                        onClick={() => setFilter("OVERDUE")} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "OVERDUE" ? "bg-red-100 text-red-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        Quá hạn
                    </button>
                    <button 
                        onClick={() => setFilter("PAID")} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "PAID" ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        Đã thanh toán
                    </button>
                </div>
            </div>

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
                                {filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors border-b last:border-0">
                                        <td className="p-4 font-medium text-gray-900">#{inv.id}</td>
                                        <td className="p-4 text-gray-600">{formatDate(inv.invoiceDate)}</td>
                                        <td className="p-4 font-bold text-blue-600">{formatCurrency(inv.totalAmount)}</td>
                                        <td className="p-4 text-center">
                                            {/* Hiển thị Badge trạng thái tương ứng */}
                                            {inv.status === "Paid" && (
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                    Đã thanh toán
                                                </span>
                                            )}
                                            {inv.status === "Unpaid" && (
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                                    Chưa thanh toán
                                                </span>
                                            )}
                                            {inv.status === "Overdue" && (
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                    Quá hạn
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500">
                                            Không tìm thấy hóa đơn nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedInvoice && (
                <InvoiceDetailModal 
                    invoice={selectedInvoice} 
                    onClose={() => setSelectedInvoice(null)} 
                />
            )}
        </div>
    );
}