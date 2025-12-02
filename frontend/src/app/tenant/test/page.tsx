// tenant/TenantDashboardPage.tsx

"use client";

import React from 'react';

// Interfaces (Tiếng Anh - Camel Case)
interface LatestInvoice {
    amount: string;
    dueDate: string;
    status: 'Đã thanh toán' | 'Chưa thanh toán' | 'Quá hạn';
}


interface TenantDashboardData {
    houseName: string;
    roomNumber: string;
    contractStatus: 'Còn hiệu lực' | 'Sắp hết hạn' | 'Đã hết hạn';
    contractEndDate: string;
    latestInvoice: LatestInvoice;
    openIncidents: number;
}

// API Giả lập (Tiếng Anh - Camel Case)
const fetchTenantDashboardData = async (): Promise<TenantDashboardData> => {
    // GỢI Ý CÁC API CALL THỰC TẾ (Phân loại theo Microservice)
    // 1. Property: /api/v1/property/tenant/room-info, /api/v1/property/tenant/contract-info
    // 2. Invoice: /api/v1/invoice/tenant/latest
    // 3. Ticket: /api/v1/ticket/tenant/summary
    // 4. Reading: /api/v1/reading/tenant/latest

    return {
        houseName: 'VCN Phước Hải',
        roomNumber: 'P101',
        contractStatus: 'Sắp hết hạn',
        contractEndDate: '31/12/2025',
        latestInvoice: {
            amount: '12,500,000 ₫',
            dueDate: '10/12/2025',
            status: 'Chưa thanh toán', // Giả lập trạng thái để test nút thanh toán
        },
        openIncidents: 3
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

    const invoiceStatusColor = data.latestInvoice.status === 'Đã thanh toán'
        ? 'text-green-600'
        : data.latestInvoice.status === 'Quá hạn'
            ? 'text-red-600'
            : 'text-orange-500';

    const isPaymentButtonDisabled = data.latestInvoice.status === 'Đã thanh toán';

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Bảng Thông Tin Người thuê</h1>

            {/* Contract & Property Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8  text-gray-800">
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
                {/* Latest Invoice Card */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500 lg:col-span-2">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">🗓️ Hóa đơn Gần nhất</h3>
                    <div className="flex justify-between items-center border-b pb-3 mb-3">
                        <span className="text-lg font-medium">Số tiền cần thanh toán:</span>
                        <span className={`text-3xl font-extrabold ${invoiceStatusColor}`}>{data.latestInvoice.amount}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 mt-2">
                        <span>Trạng thái:</span>
                        <span className={`font-semibold ${invoiceStatusColor}`}>{data.latestInvoice.status}</span>
                    </div>
                    <div className="flex justify-between mt-4">
                        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition">
                            Xem Lịch sử Hóa đơn
                        </button>
                        <button
                            className={`px-4 py-2 rounded-lg font-bold text-sm ${isPaymentButtonDisabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}
                            disabled={isPaymentButtonDisabled}
                        >
                            {isPaymentButtonDisabled ? 'Đã Thanh Toán' : 'Thanh toán ngay'}
                        </button>
                    </div>
                    <div className="mt-4 text-xs text-gray-400">API: /api/v1/invoice/tenant/latest</div>
                </div>

                {/* Payment Upload Link */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700">💳 Bạn đã nộp điện nước tháng này?</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Sử dụng chức năng này để upload ảnh hóa đơn chuyển khoản/biên lai.
                    </p>
                    <a href="/payment" className="block w-full text-center bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition font-bold">
                        Đi tới trang nộp chỉ số
                    </a>
                    <div className="mt-4 text-xs text-gray-400">Đường dẫn: /payment</div>
                </div>

                {/* Incidents/Requests Card */}
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