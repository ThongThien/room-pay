"use client";

import { Invoice } from "@/types/invoice";

interface InvoiceTableProps {
    invoices: Invoice[];
    loading: boolean;
    onSelectInvoice: (invoice: Invoice) => void;
    onRemindSingle: (id: number, e: React.MouseEvent) => void;
}

export default function InvoiceTable({ invoices, loading, onSelectInvoice, onRemindSingle }: InvoiceTableProps) {
    
    // Helpers format
    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleDateString('vi-VN') : "";

    // Helper render badge trạng thái
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Paid": return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Đã thanh toán</span>;
            case "Unpaid": return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Chưa thanh toán</span>;
            case "Overdue": return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Quá hạn</span>;
            default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
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
                        {invoices.length > 0 ? invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onSelectInvoice(inv)}>
                                <td className="p-4 font-mono text-gray-500">#{inv.id}</td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{inv.userName || "Khách vãng lai"}</span>
                                        <span className="text-xs text-gray-500">{inv.houseName ? `${inv.houseName}` : "Chưa cập nhật"}{inv.roomName ? ` - ${inv.roomName}` : ""}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600">{formatDate(inv.dueDate)}</td>
                                <td className="p-4 text-right font-bold text-gray-800">{formatCurrency(inv.totalAmount)}</td>
                                <td className="p-4 text-center">{getStatusBadge(inv.status)}</td>
                                <td className="p-4 text-center">
                                    {inv.status !== "Paid" ? (
                                        <button
                                            onClick={(e) => onRemindSingle(inv.id, e)}
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
    );
}