// owner/OwnerDashboardPage.tsx

"use client";

import React, { useState } from 'react';

// === INTERFACES DỮ LIỆU CỐT LÕI ===
interface RevenueDataPoint {
    month: string;
    paidAmount: number;
    unpaidAmount: number;
}

interface InvoiceSummary {
    totalAmount: string;
    paidAmount: string;
    unpaidAmount: string;
    overdueAmount: string;
}

// === INTERFACES CHO CHI TIẾT CẢNH BÁO ===
interface OverdueInvoiceDetail {
    invoiceId: string; // Mã hóa đơn
    tenantName: string; // Tên khách hàng
    roomNumber: string; // Mã phòng
    overdueDays: number; // Số ngày quá hạn
    amount: string; // Số tiền quá hạn
}

interface HighUsageRoomDetail {
    roomNumber: string; // Mã phòng
    tenantName: string; // Tên khách hàng
    lastReading: number; // Chỉ số tiêu thụ kỳ gần nhất
    unit: 'kWh' | 'm3'; // Đơn vị
    percentageIncrease: number; // % Tăng so với T.trước (Giả định)
}

// === INTERFACE CHÍNH CHO DASHBOARD DATA ===
interface OwnerDashboardData {
    totalRooms: number;
    vacantRooms: number;
    occupancyRate: string;
    totalCustomers: number;
    currentMonthTurnover: string;
    pendingIncidents: number;
    annualTurnover: string;
    invoiceSummary: InvoiceSummary;
    revenueChartData: RevenueDataPoint[];

    // TRƯỜNG CẢNH BÁO (Count + Chi tiết top 1)
    overdueInvoices: {
        count: number;
        topDetail: OverdueInvoiceDetail | null;
    };
    highElectricityRooms: {
        count: number;
        topDetail: HighUsageRoomDetail | null;
    };
    highWaterRooms: {
        count: number;
        topDetail: HighUsageRoomDetail | null;
    };
}

// === API Giả lập CẬP NHẬT (Phù hợp với cấu trúc mới) ===
const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
    // GỢI Ý API MỚI CHO BE (Trả về danh sách chi tiết)
    // /api/v1/invoice/warning/overdue-list
    // /api/v1/reading/warning/high-electricity-list
    // /api/v1/reading/warning/high-water-list

    return {
        totalRooms: 440,
        vacantRooms: 123,
        occupancyRate: '72%',
        totalCustomers: 100,
        currentMonthTurnover: '1,000,000,000 ₫',
        pendingIncidents: 7,
        annualTurnover: '12,500,000,000 ₫',
        invoiceSummary: {
            totalAmount: '100,820,000 ₫',
            paidAmount: '82,000,000 ₫',
            unpaidAmount: '10,020,000 ₫',
            overdueAmount: '8,800,000 ₫',
        },
        revenueChartData: [
            { month: '01/23', paidAmount: 15, unpaidAmount: 5 },
            { month: '02/23', paidAmount: 20, unpaidAmount: 10 },
            { month: '03/23', paidAmount: 10, unpaidAmount: 15 },
            { month: '04/23', paidAmount: 25, unpaidAmount: 5 },
            { month: '05/23', paidAmount: 30, unpaidAmount: 12 },
            { month: '06/23', paidAmount: 18, unpaidAmount: 20 },
            { month: '07/23', paidAmount: 40, unpaidAmount: 10 },
            { month: '08/23', paidAmount: 22, unpaidAmount: 20 },
            { month: '09/23', paidAmount: 35, unpaidAmount: 8 },
        ],

        // DỮ LIỆU CẢNH BÁO CHI TIẾT
        overdueInvoices: {
            count: 15,
            topDetail: {
                invoiceId: 'INV-202511001',
                tenantName: 'Nguyễn Văn A',
                roomNumber: 'A101',
                overdueDays: 5,
                amount: '12,500,000 ₫',
            },
        },
        highElectricityRooms: {
            count: 5,
            topDetail: {
                roomNumber: 'C305',
                tenantName: 'Lê Thị B',
                lastReading: 520,
                unit: 'kWh',
                percentageIncrease: 45,
            },
        },
        highWaterRooms: {
            count: 3,
            topDetail: {
                roomNumber: 'B201',
                tenantName: 'Trần Đình C',
                lastReading: 120,
                unit: 'm3',
                percentageIncrease: 70,
            },
        },
    };
};

// === COMPONENT CARD MẶC ĐỊNH (Không đổi) ===
const DashboardCard: React.FC<{
    title: string;
    value: string;
    apiEndpoint: string;
    color: 'green' | 'red' | 'yellow' | 'default'
}> = ({ title, value, apiEndpoint, color }) => {

    let borderColor = 'border-gray-300';
    let textColor = 'text-gray-800';
    let apiBgColor = 'bg-gray-100';

    switch (color) {
        case 'green':
            borderColor = 'border-green-500';
            textColor = 'text-green-700';
            apiBgColor = 'bg-green-50';
            break;
        case 'red':
            borderColor = 'border-red-500';
            textColor = 'text-red-700';
            apiBgColor = 'bg-red-50';
            break;
        case 'yellow':
            borderColor = 'border-yellow-600';
            textColor = 'text-yellow-700';
            apiBgColor = 'bg-yellow-50';
            break;
        case 'default':
        default:
            borderColor = 'border-indigo-400';
            textColor = 'text-gray-800';
            apiBgColor = 'bg-indigo-50';
            break;
    }

    return (
        <div className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${borderColor} flex flex-col justify-between`}>
            <div className="text-sm font-medium text-gray-700">{title}</div>
            <div className={`text-2xl font-bold my-1 ${textColor}`}>{value}</div>
            <div className="text-xs text-gray-700 mt-1">
                <span className={`font-mono ${apiBgColor} p-0.5 rounded text-wrap break-all text-xs text-gray-600`}>API: {apiEndpoint}</span>
            </div>
        </div>
    );
};

// === COMPONENT CARD CẢNH BÁO MỚI (có Tooltip khi hover) ===
const InteractiveWarningCard: React.FC<{
    title: string;
    count: number;
    apiEndpoint: string;
    color: 'red' | 'yellow';
    detailComponent: React.ReactNode;
}> = ({ title, count, apiEndpoint, color, detailComponent }) => {

    const [isHovered, setIsHovered] = useState(false);
    const borderColor = color === 'red' ? 'border-red-500' : 'border-yellow-600';
    const textColor = color === 'red' ? 'text-red-700' : 'text-yellow-700';
    const apiBgColor = color === 'red' ? 'bg-red-50' : 'bg-yellow-50';

    return (
        <div
            className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${borderColor} flex flex-col justify-between relative cursor-pointer transition-shadow duration-300 hover:shadow-lg`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="text-sm font-medium text-gray-700">{title}</div>
            <div className={`text-3xl font-bold my-1 ${textColor}`}>{count}</div>
            <div className="text-sm font-semibold text-gray-700 mt-1">
                {count > 0 ? "Click để xem chi tiết" : "Không có cảnh báo"}
            </div>

            {/* Tooltip hiển thị khi Hover */}
            {isHovered && count > 0 && (
                <div className={`absolute top-0 left-full ml-4 p-4 rounded-lg shadow-xl z-50 w-80 bg-white border border-gray-200`}>
                    <h4 className={`font-bold text-sm mb-2 ${textColor}`}>Chi tiết Top 1 Cảnh báo</h4>
                    <hr className="mb-2" />
                    {detailComponent}
                </div>
            )}

            <div className="text-xs text-gray-700 mt-1 pt-1 border-t border-gray-100">
                <span className={`font-mono ${apiBgColor} p-0.5 rounded text-wrap break-all text-xs text-gray-600`}>API: {apiEndpoint}</span>
            </div>
        </div>
    );
};

// Component Biểu đồ mô phỏng CẢI THIỆN (Giữ nguyên)
const RevenueChart: React.FC<{ data: OwnerDashboardData['revenueChartData'] }> = ({ data }) => {
    // ... (Giữ nguyên component RevenueChart)
    const maxTotal = Math.max(...data.map(item => item.paidAmount + item.unpaidAmount)) * 1.2;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md col-span-2">
            <h3 className="text-lg font-semibold mb-4">Biểu đồ Doanh thu theo Kỳ (Triệu VNĐ)</h3>
            <div className="flex justify-between items-end h-60 pt-4 space-x-2 relative">

                <div className="absolute left-0 bottom-0 w-full h-full border-l border-b border-gray-300">
                    <div className="absolute left-0 top-0 w-full text-xs text-gray-700 text-right pr-2">Max ({Math.round(maxTotal)}M)</div>
                    <div className="absolute left-0 top-[50%] w-full border-t border-dashed border-gray-200 text-xs text-gray-700 text-right pr-2">50%</div>
                </div>

                {data.map((item) => {
                    const total = item.paidAmount + item.unpaidAmount;
                    const paidHeight = (item.paidAmount / maxTotal) * 100;
                    const unpaidHeight = (item.unpaidAmount / maxTotal) * 100;

                    return (
                        <div
                            key={item.month}
                            className="flex flex-col items-center flex-1 h-full relative group cursor-pointer z-10"
                        >
                            <div className="w-full relative flex flex-col justify-end h-full">
                                <div
                                    className="w-full bg-orange-400 hover:bg-orange-500 transition-all duration-300"
                                    style={{ height: `${unpaidHeight}%` }}
                                    title={`Chưa TT: ${item.unpaidAmount}M`}
                                />
                                <div
                                    className="w-full bg-green-500 hover:bg-green-600 transition-all duration-300"
                                    style={{ height: `${paidHeight}%` }}
                                    title={`Đã TT: ${item.paidAmount}M`}
                                />
                            </div>
                            <div className="absolute bottom-full mb-2 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                <p className="font-bold">{item.month}</p>
                                <p>Tổng: {total.toFixed(2)}M</p>
                                <p className="text-green-300">Đã TT: {item.paidAmount}M</p>
                                <p className="text-orange-300">Chưa TT: {item.unpaidAmount}M</p>
                            </div>
                            <div className="text-xs text-gray-700 mt-1 z-20">{item.month}</div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 flex justify-center space-x-4 text-sm">
                <span className="flex items-center"><span className="w-3 h-3 bg-green-500 mr-2"></span>Đã Thanh Toán</span>
                <span className="flex items-center"><span className="w-3 h-3 bg-orange-400 mr-2"></span>Chưa Thanh Toán</span>
            </div>
        </div>
    );
};


const OwnerDashboardPage: React.FC = () => {
    const [data, setData] = React.useState<OwnerDashboardData | null>(null);

    React.useEffect(() => {
        fetchOwnerDashboardData().then(setData);
    }, []);

    if (!data) return <div className="p-8 text-center">Đang tải Dữ liệu Quản lý...</div>;

    const topOverdue = data.overdueInvoices.topDetail;
    const topHighElect = data.highElectricityRooms.topDetail;
    const topHighWater = data.highWaterRooms.topDetail;

    // Components Chi tiết (dùng cho Tooltip)
    const OverdueDetailComponent = topOverdue ? (
        <div className="text-xs mt-1 space-y-1 ">
            <p className="font-bold text-red-500  text-gray-700">{topOverdue.roomNumber} - {topOverdue.tenantName}</p>
            <p className="text-gray-700">Mã HĐ: <span className="font-mono">{topOverdue.invoiceId}</span></p>
            <p className="text-gray-700">Quá hạn: <span className="font-semibold text-red-600">{topOverdue.overdueDays} ngày</span></p>
            <p className="text-red-500 font-bold">Số tiền: {topOverdue.amount}</p>
        </div>
    ) : (
        <p className="text-xs text-gray-700 italic">Không có hóa đơn quá hạn.</p>
    );

    const HighElectDetailComponent = topHighElect ? (
        <div className="text-xs mt-1 space-y-1">
            <p className="font-bold  text-gray-700">{topHighElect.roomNumber} - {topHighElect.tenantName}</p>
            <p className="text-gray-700">Kỳ gần nhất: <span className="font-semibold text-yellow-700">{topHighElect.lastReading} {topHighElect.unit}</span></p>
            <p className="text-gray-700">Tăng so với T.trước: <span className="font-semibold text-red-500">{topHighElect.percentageIncrease}%</span></p>
        </div>
    ) : (
        <p className="text-xs text-gray-700 italic">Không có phòng tiêu thụ điện vượt ngưỡng.</p>
    );

    const HighWaterDetailComponent = topHighWater ? (
        <div className="text-xs mt-1 space-y-1">
            <p className="font-bold  text-gray-700">{topHighWater.roomNumber} - {topHighWater.tenantName}</p>
            <p className="text-gray-700">Kỳ gần nhất: <span className="font-semibold text-yellow-700">{topHighWater.lastReading} {topHighWater.unit}</span></p>
            <p className="text-gray-700">Tăng so với T.trước: <span className="font-semibold text-red-500">{topHighWater.percentageIncrease}%</span></p>
        </div>
    ) : (
        <p className="text-xs text-gray-700 italic">Không có phòng tiêu thụ nước vượt ngưỡng.</p>
    );

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Bảng Tổng Kết Chủ sở hữu</h1>

            {/* 🔔 SECTION 1: CẢNH BÁO VÀ HÀNH ĐỘNG KHẨN CẤP */}
            <h2 className="text-xl font-semibold text-red-700 mb-4">🔔 Cảnh báo và Hành động Khẩn cấp</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                {/* 1. Hóa đơn Quá hạn (ĐỎ) */}
                <InteractiveWarningCard
                    title="Khách hàng Quá hạn TT"
                    count={data.overdueInvoices.count}
                    apiEndpoint="/api/v1/invoice/warning/overdue-list"
                    color="red"
                    detailComponent={OverdueDetailComponent}
                />

                {/* 3. Tiêu thụ Điện cao (VÀNG) */}
                <InteractiveWarningCard
                    title="Phòng tiêu thụ Điện cao"
                    count={data.highElectricityRooms.count}
                    apiEndpoint="/api/v1/reading/warning/high-electricity-list"
                    color="yellow"
                    detailComponent={HighElectDetailComponent}
                />

                {/* 4. Tiêu thụ Nước cao (VÀNG) */}
                <InteractiveWarningCard
                    title="Phòng tiêu thụ Nước cao"
                    count={data.highWaterRooms.count}
                    apiEndpoint="/api/v1/reading/warning/high-water-list"
                    color="yellow"
                    detailComponent={HighWaterDetailComponent}
                />

                {/* 2. Sự cố Đang chờ (ĐỎ) */}
                <DashboardCard
                    title="Sự cố Đang chờ xử lý"
                    value={`${data.pendingIncidents} Sự cố`}
                    apiEndpoint="/api/v1/ticket/owner/summary"
                    color="red"
                />
            </div>

            {/* 📈 SECTION 2: TÀI CHÍNH & HIỆU SUẤT */}
            <h2 className="text-xl font-semibold text-gray-700 mb-4">📈 Tài chính và Hiệu suất Hoạt động</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                {/* Tích cực (XANH) */}
                <DashboardCard
                    title="Tổng Doanh thu 1 Năm"
                    value={data.annualTurnover}
                    apiEndpoint="/api/v1/invoice/summary/annual-turnover"
                    color="green"
                />
                <DashboardCard
                    title="Doanh thu Tháng này"
                    value={data.currentMonthTurnover}
                    apiEndpoint="/api/v1/invoice/summary/turnover"
                    color="green"
                />
                <DashboardCard
                    title="Tổng Khách hàng hiện tại"
                    value={`${data.totalCustomers}`}
                    apiEndpoint="/api/v1/aa/users/tenant-count"
                    color="default"
                />

                {/* Cảnh báo Tiềm năng (VÀNG) */}


                {/* Tham chiếu (TRẮNG/DEFAULT) */}
                <DashboardCard
                    title="Tổng số Phòng"
                    value={`${data.totalRooms}`}
                    apiEndpoint="/api/v1/property/summary/rooms"
                    color="default"
                />
                <DashboardCard
                    title="Phòng Trống"
                    value={`${data.vacantRooms}`}
                    apiEndpoint="/api/v1/property/summary/rooms"
                    color="yellow"
                />
                <DashboardCard
                    title="Tỷ lệ Lấp đầy"
                    value={data.occupancyRate}
                    apiEndpoint="/api/v1/property/summary/occupancy"
                    color="green"
                />

            </div>

            {/* 📊 SECTION 3: PHÂN TÍCH CHUYÊN SÂU */}
            <h2 className="text-xl font-semibold text-gray-700 mb-4">📊 Phân tích Chuyên sâu</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-gray-800">
                <RevenueChart data={data.revenueChartData} />

                {/* Tổng quan hóa đơn (Giữ nguyên) */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-300">
                    <h3 className="text-lg font-semibold mb-4">Tổng Hóa đơn</h3>
                    <p className="text-sm text-gray-700 mb-4">
                        *Tổng Hóa đơn: Tổng toàn bộ giá trị hóa đơn đã được tạo ra trong tất cả các kỳ.
                    </p>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="font-bold">Tổng Cộng</span>
                            <span className="font-bold text-xl text-gray-900">{data.invoiceSummary.totalAmount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-green-600">Đã Thanh Toán</span>
                            <span className="text-green-600">{data.invoiceSummary.paidAmount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-orange-500">Chưa Thanh Toán</span>
                            <span className="text-orange-500">{data.invoiceSummary.unpaidAmount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-red-600">Quá Hạn</span>
                            <span className="text-red-600">{data.invoiceSummary.overdueAmount}</span>
                        </div>
                        <div className="mt-4 text-xs text-gray-700">API: /api/v1/invoice/summary</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboardPage;