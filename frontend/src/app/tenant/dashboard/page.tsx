// tenant/TenantDashboardPage.tsx

"use client";

import React, { useState } from 'react';

// === INTERFACES DỮ LIỆU CỐT LÕI ===

// Interface mới: Chi tiết hóa đơn chưa thanh toán (để liệt kê)
interface UnpaidInvoiceDetail {
    invoiceId: string;
    month: string;
    amount: string;
    dueDate: string;
    isOverdue: boolean;
}

// Interface mới: Các tháng chưa nộp chỉ số
interface MissingReadingMonth {
    month: string;
    type: 'Both';
}

interface TenantDashboardData {
    houseName: string;
    roomNumber: string;
    contractStatus: 'Còn hiệu lực' | 'Sắp hết hạn' | 'Đã hết hạn';
    contractEndDate: string;

    // THAY THẾ LatestInvoice bằng dữ liệu tổng hợp
    totalUnpaidAmount: string;
    unpaidInvoices: UnpaidInvoiceDetail[];

    openIncidents: number;
    missingReadings: MissingReadingMonth[];
}

// API Giả lập (Tiếng Anh - Camel Case)
const fetchTenantDashboardData = async (): Promise<TenantDashboardData> => {
    const mockUnpaidInvoices: UnpaidInvoiceDetail[] = [
        {
            invoiceId: 'INV-202511001',
            month: 'Tháng 11/2025',
            amount: '12,500,000 ₫',
            dueDate: '10/12/2025',
            isOverdue: true
        },
        {
            invoiceId: 'INV-202512001',
            month: 'Tháng 12/2025',
            amount: '10,000,000 ₫',
            dueDate: '10/01/2026',
            isOverdue: false
        },
    ];

    return {
        houseName: 'VCN Phước Hải',
        roomNumber: 'P101',
        contractStatus: 'Sắp hết hạn',
        contractEndDate: '31/12/2025',

        // Dữ liệu mới: Tổng và chi tiết các hóa đơn chưa TT
        totalUnpaidAmount: '22,500,000 ₫', // Tổng của 12.5M + 10M
        unpaidInvoices: mockUnpaidInvoices,

        openIncidents: 3,
        missingReadings: [
            { month: 'Tháng 01/2026', type: 'Both' },
        ],
    };
};

// Component Card dùng riêng cho Tenant
const TenantInfoCard: React.FC<{ title: string; value: string; className?: string; apiEndpoint: string }> = ({ title, value, className = '', apiEndpoint }) => (
    <div className={`bg-white p-5 rounded-xl shadow-lg border-l-4 border-blue-400 ${className}`}>
        <div className="text-sm font-medium text-gray-500">{title}</div>
        <div className="text-2xl font-bold text-gray-800 mt-1">{value}</div>
        <div className="text-xs text-gray-400 mt-2">API: {apiEndpoint}</div>
    </div>
);


const TenantDashboardPage: React.FC = () => {
    const [data, setData] = React.useState<TenantDashboardData | null>(null);

    React.useEffect(() => {
        fetchTenantDashboardData().then(setData);
    }, []);

    if (!data) return <div className="p-8 text-center">Đang tải Dữ liệu Người thuê...</div>;

    // Logic xác định màu sắc cho Tổng tiền chưa thanh toán
    const totalUnpaidColor = data.unpaidInvoices.some(inv => inv.isOverdue)
        ? 'text-red-600' // Nếu có bất kỳ hóa đơn nào quá hạn
        : data.unpaidInvoices.length > 0
            ? 'text-orange-500' // Nếu chưa quá hạn nhưng vẫn còn nợ
            : 'text-green-600'; // Đã thanh toán hết

    // Giả lập chức năng thanh toán
    const handlePayment = (invoiceId: string) => {
        alert(`Tiến hành thanh toán cho Hóa đơn ID: ${invoiceId}`);
        // Logic gọi API thanh toán thực tế sẽ ở đây
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Bảng Thông Tin Người thuê</h1>

            {/* Contract & Property Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8  text-gray-800">
                <TenantInfoCard
                    title="Căn hộ/Phòng đang thuê"
                    value={`${data.houseName} - ${data.roomNumber}`}
                    apiEndpoint="/api/v1/property/tenant/room-info"
                    className="lg:col-span-2"
                />
                <TenantInfoCard
                    title="Ngày kết thúc Hợp đồng"
                    value={data.contractEndDate}
                    apiEndpoint="/api/v1/property/tenant/contract-info"
                />
                <TenantInfoCard
                    title="Trạng thái Hợp đồng"
                    value={data.contractStatus}
                    apiEndpoint="/api/v1/property/tenant/contract-info"
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
                            {data.unpaidInvoices.length > 0 ? data.totalUnpaidAmount : "0 ₫"}
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

                    <div className="mt-4 text-xs text-gray-400">API: /api/v1/invoice/tenant/unpaid-list</div>
                </div>

                {/* 2. Payment Upload Link & Missing Readings (Cập nhật) */}
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

                    <a href="/tenant/submit" className="block w-full text-center bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition font-bold">
                        Đi tới trang nộp chỉ số
                    </a>
                    <div className="mt-4 text-xs text-gray-400">Đường dẫn: /tenant/submit</div>
                </div>

                {/* 3. Incidents/Requests Card (Giữ nguyên) */}
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
                    <div className="mt-4 text-xs text-gray-400">API: /api/v1/ticket/tenant/summary</div>
                </div>
            </div>
        </div>
    );
};

export default TenantDashboardPage;