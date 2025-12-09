"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { 
    getTenantDashboardData, 
    formatVND,
    UnpaidInvoiceItem,
    loadInvoiceDetails
} from '@/services/tenantDashboardService';

interface TenantViewData {
    houseName: string;
    roomNumber: string;
    contractStatus: string;
    contractEndDate: string;
    isExpiringSoon: boolean;

    totalUnpaidAmount: string;
    unpaidInvoices: {
        invoiceId: number;
        month: string;
        amount: string;
        dueDate: string;
        isOverdue: boolean;
        items: UnpaidInvoiceItem['items'];
    }[];

    openIncidents: number;
    missingReadings: {
        month: string;
        type: string;
    }[];
}

const TenantInfoCard: React.FC<{ title: string; value: string; className?: string; apiEndpoint: string }> = ({ title, value, className = '' }) => (
    <div className={`bg-white p-5 rounded-xl shadow-lg border-l-4 border-blue-400 ${className}`}>
        <div className="text-sm font-medium text-gray-500">{title}</div>
        <div className="text-2xl font-bold text-gray-800 mt-1">{value}</div>
    </div>
);

const TenantDashboardPage: React.FC = () => {
    // State lưu dữ liệu hiển thị
    const [data, setData] = useState<TenantViewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);
    const [loadingInvoiceDetails, setLoadingInvoiceDetails] = useState<Set<number>>(new Set());
    const router = useRouter();

    // Function để load chi tiết invoice khi click
    const handleExpandInvoice = async (invoiceId: number) => {
        const isExpanding = expandedInvoice !== invoiceId;
        
        if (isExpanding) {
            // Kiểm tra xem đã load details chưa
            const invoice = data?.unpaidInvoices.find(inv => inv.invoiceId === invoiceId);
            if (invoice && (!invoice.items || invoice.items.length === 0)) {
                // Chưa load details, load ngay bây giờ
                setLoadingInvoiceDetails(prev => new Set(prev).add(invoiceId));
                try {
                    const items = await loadInvoiceDetails(invoiceId);
                    setData(prevData => {
                        if (!prevData) return prevData;
                        return {
                            ...prevData,
                            unpaidInvoices: prevData.unpaidInvoices.map(inv =>
                                inv.invoiceId === invoiceId ? { ...inv, items } : inv
                            )
                        };
                    });
                } catch (error) {
                    console.error('Failed to load invoice details:', error);
                } finally {
                    setLoadingInvoiceDetails(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(invoiceId);
                        return newSet;
                    });
                }
            }
        }
        
        setExpandedInvoice(isExpanding ? invoiceId : null);
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const apiData = await getTenantDashboardData();

                const viewData: TenantViewData = {
                    // Contract Info
                    houseName: apiData.contract?.houseName || "Đang cập nhật",
                    roomNumber: apiData.contract?.roomNumber || "---",
                    contractStatus: apiData.contract?.contractStatus || "Chưa có HĐ",
                    contractEndDate: apiData.contract?.contractEndDate
                        ? new Date(apiData.contract.contractEndDate).toLocaleDateString('vi-VN')
                        : "---",
                    isExpiringSoon: apiData.contract?.isExpiringSoon || false,

                    // Invoice Info
                    totalUnpaidAmount: formatVND(apiData.invoices.totalUnpaidAmount),
                    unpaidInvoices: apiData.invoices.unpaidInvoices.map(inv => ({
                        invoiceId: inv.invoiceId,
                        month: inv.month,
                        amount: formatVND(inv.amount),
                        dueDate: new Date(inv.dueDate).toLocaleDateString('vi-VN'),
                        isOverdue: inv.isOverdue,
                        items: inv.items
                    })),

                    // Incident Info
                    openIncidents: apiData.openIncidents,

                    // Reading Info
                    missingReadings: apiData.readings.missingReadings.map(r => ({
                        month: r.monthYear,
                        type: 'Both' // Backend chưa trả về type, mặc định hiển thị Both
                    }))
                };

                setData(viewData);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!data) return <div className="p-8 text-center text-red-500">Không thể tải dữ liệu</div>;

    const totalUnpaidColor = data.unpaidInvoices.some(inv => inv.isOverdue)
        ? 'text-red-600'
        : data.unpaidInvoices.length > 0
            ? 'text-orange-500'
            : 'text-green-600';

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Bảng Thông Tin Người thuê</h1>

            {/* Contract & Property Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-gray-800">
                <TenantInfoCard
                    title="Căn hộ/Phòng đang thuê"
                    value={`${data.houseName} - ${data.roomNumber}`}
                    apiEndpoint="/api/tenant/contracts/active-info"
                    className="lg:col-span-2"
                />
                <TenantInfoCard
                    title="Ngày kết thúc Hợp đồng"
                    value={data.contractEndDate}
                    apiEndpoint="/api/tenant/contracts/active-info"
                />
                <TenantInfoCard
                    title="Trạng thái Hợp đồng"
                    value={data.contractStatus}
                    apiEndpoint="/api/tenant/contracts/active-info"
                />
            </div>

            {/* Financial & Incidents & Readings */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-gray-800" >

                {/* 1. Unpaid Invoices (Tổng tiền hóa đơn chưa thanh toán) */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500 lg:col-span-2">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">💳 Tổng tiền Hóa đơn Chưa thanh toán</h3>

                    {/* Tổng số tiền */}
                    <div className="flex justify-between items-center border-b pb-3 mb-3">
                        <span className="text-lg font-medium">Tổng số dư cần trả:</span>
                        <span className={`text-3xl font-extrabold ${totalUnpaidColor}`}>
                            {data.totalUnpaidAmount}
                        </span>
                    </div>

                    {/* Danh sách các hóa đơn chưa thanh toán */}
                    <p className="text-sm font-semibold mt-4 mb-2">Chi tiết các tháng còn nợ:</p>
                    <div className="space-y-3">
                        {data.unpaidInvoices.length > 0 ? (
                            data.unpaidInvoices.map((invoice) => (
                                <div key={invoice.invoiceId} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="flex justify-between items-center text-sm p-3 bg-gray-50">
                                        <div className="flex flex-col flex-1">
                                            <span className={`font-semibold ${invoice.isOverdue ? 'text-red-500' : 'text-gray-700'}`}>
                                                {invoice.month}
                                            </span>
                                            <span className={`text-xs ${invoice.isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                                                {invoice.amount} {invoice.isOverdue ? '(QUÁ HẠN)' : `(Hạn: ${invoice.dueDate})`}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleExpandInvoice(invoice.invoiceId)}
                                                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                            >
                                                {expandedInvoice === invoice.invoiceId ? 'Ẩn' : 'Chi tiết'}
                                            </button>
                                            <button
                                                onClick={() => router.push(`/tenant/payment/${invoice.invoiceId}`)}
                                                className={`px-3 py-1 rounded-lg font-bold text-xs text-white transition ${invoice.isOverdue ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                            >
                                                Thanh toán
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Chi tiết các khoản */}
                                    {expandedInvoice === invoice.invoiceId && (
                                        <div className="p-3 bg-white border-t">
                                            {loadingInvoiceDetails.has(invoice.invoiceId) ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                                    <span className="ml-2 text-sm text-gray-500">Đang tải chi tiết...</span>
                                                </div>
                                            ) : (invoice.items && invoice.items.length > 0) ? (
                                                <>
                                                    <h4 className="text-sm font-semibold mb-2 text-gray-700">Chi tiết các khoản:</h4>
                                                    <div className="space-y-1">
                                                        {invoice.items?.map((item, index) => (
                                                            <div key={index} className="flex justify-between text-xs text-gray-600 py-1">
                                                                <span className="flex-1">{item.description}</span>
                                                                <span className="text-right w-16">{item.quantity}</span>
                                                                <span className="text-right w-20">{formatVND(item.unitPrice)}</span>
                                                                <span className="text-right w-20 font-semibold">{formatVND(item.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-gray-500 py-2">Không có chi tiết khoản nào.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-green-500 italic p-3 bg-green-50 rounded">
                                <span className="font-bold">🎉 Bạn đã thanh toán hết nợ!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Payment Upload Link & Missing Readings */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">⚡ Bạn đã nộp Chỉ số Điện/Nước?</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Vui lòng nộp chỉ số để hóa đơn tháng này được tính toán chính xác.
                    </p>

                    {/* WARNING: Các tháng chưa nộp chỉ số */}
                    {data.missingReadings.length > 0 && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                            <p className="font-bold text-red-700 text-sm mb-1">⚠️ Cảnh báo Chỉ số Thiếu:</p>
                            <ul className="list-disc list-inside text-xs text-red-600">
                                {data.missingReadings.map((reading, index) => (
                                    <li key={index} className="pl-1">
                                        {reading.month}: Chỉ số <span className="font-semibold">{reading.type === 'Both' ? "Điện & Nước" : ""}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Link href="/tenant/submit" className="block w-full text-center bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition font-bold">
                        Đi tới trang nộp chỉ số
                    </Link>
                </div>

                {/* 3. Incidents/Requests Card */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">🛠️ Yêu cầu Dịch vụ</h3>
                    <div className="flex justify-between items-center border-b pb-3 mb-3">
                        <span className="text-lg font-medium">Yêu cầu chưa xử lý:</span>
                        <span className="text-3xl font-extrabold text-red-600">{data.openIncidents}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Bạn có thể tạo yêu cầu sửa chữa/hỗ trợ mới.</p>
                    <button className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
                        Tạo Yêu cầu Mới
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TenantDashboardPage;