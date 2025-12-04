"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { 
    getTenantDashboardData, 
    formatVND 
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
                        isOverdue: inv.isOverdue
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

    const handlePayment = (invoiceId: number) => {
        alert(`Tiến hành thanh toán cho Hóa đơn ID: ${invoiceId}`);
        // router.push(`/tenant/payment/${invoiceId}`);
    };

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
                                <div key={invoice.invoiceId} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-b-0">
                                    <div className="flex flex-col">
                                        <span className={`font-semibold ${invoice.isOverdue ? 'text-red-500' : 'text-gray-700'}`}>
                                            {invoice.month}
                                        </span>
                                        <span className={`text-xs ${invoice.isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                                            {invoice.amount} {invoice.isOverdue ? '(QUÁ HẠN)' : `(Hạn: ${invoice.dueDate})`}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handlePayment(invoice.invoiceId)}
                                        className={`px-3 py-1 rounded-lg font-bold text-xs text-white transition ${invoice.isOverdue ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                    >
                                        Thanh toán ngay
                                    </button>
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