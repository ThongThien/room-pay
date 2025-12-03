// owner/OwnerDashboardPage.tsx

"use client";

import React, { useState } from 'react';

// === INTERFACES DỮ LIỆU CỐT LÕI ===
interface RevenueDataPoint {
    month: string;
    paidAmount: number;
    unpaidAmount: number;
}

// === INTERFACE MỚI: Dữ liệu Hiệu suất Theo Nhà ===
interface BuildingPerformance {
    buildingId: string;
    buildingName: string;
    totalRooms: number;
    vacantRooms: number;
    occupancyRate: string; // Tỷ lệ Lấp đầy (%)
    totalCustomers: number;
    currentMonthRevenue: string; // Doanh thu tháng này
}

interface InvoiceSummary {
    totalAmount: string;
    paidAmount: string;
    // Cập nhật: Số tiền chưa thanh toán của THÁNG NÀY (currentUnpaid)
    currentUnpaidAmount: string;
    // Giữ nguyên: Tổng tiền chưa thanh toán của TẤT CẢ kỳ
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

// GỘP CẢNH BÁO ĐIỆN NƯỚC: Chỉ số Bất thường
interface AbnormalReadingDetail {
    roomNumber: string; // Mã phòng
    tenantName: string; // Tên khách hàng
    type: 'Electricity' | 'Water'; // Loại chỉ số
    lastReading: number;
    unit: 'kWh' | 'm3';
    percentageIncrease: number; // % Tăng so với T.trước
}

// === INTERFACE CHÍNH CHO DASHBOARD DATA ===
interface OwnerDashboardData {
    // Dữ liệu Tổng quan
    totalRooms: number;
    vacantRooms: number;
    occupancyRate: string;
    totalCustomers: number;
    currentMonthTurnover: string;
    pendingIncidents: number;
    annualTurnover: string;
    endContracts: number;

    // Dữ liệu phức hợp
    invoiceSummary: InvoiceSummary;
    revenueChartData: RevenueDataPoint[];
    buildingPerformanceData: BuildingPerformance[]; // Dữ liệu hiệu suất theo nhà

    // TRƯỜNG CẢNH BÁO (Gộp/Cập nhật)
    overdueInvoices: {
        count: number;
        topDetail: OverdueInvoiceDetail | null;
    };
    // TRƯỜNG MỚI (Gộp Điện/Nước)
    abnormalReadings: {
        count: number;
        topDetail: AbnormalReadingDetail | null;
    };
}

// === API Giả lập CẬP NHẬT HOÀN TOÀN ===
const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
    return {
        // Dữ liệu Tổng quan
        totalRooms: 440,
        vacantRooms: 123,
        occupancyRate: '72%',
        totalCustomers: 100,
        currentMonthTurnover: '1,000,000,000 ₫',
        pendingIncidents: 7,
        endContracts: 9,
        annualTurnover: '12,500,000,000 ₫',

        // Dữ liệu phức hợp
        invoiceSummary: {
            totalAmount: '100,820,000 ₫',
            paidAmount: '82,000,000 ₫',
            currentUnpaidAmount: '10,020,000 ₫', // Số tiền chưa TT tháng này
            overdueAmount: '8,800,000 ₫', // Tổng số tiền Quá hạn (của các tháng trước)
        },
        revenueChartData: [
            { month: '09/25', paidAmount: 15, unpaidAmount: 5 },
            { month: '10/25', paidAmount: 25, unpaidAmount: 5 },
            { month: '11/25', paidAmount: 40, unpaidAmount: 10 },
            { month: '12/25', paidAmount: 35, unpaidAmount: 8 },
        ],
        buildingPerformanceData: [
            { buildingId: 'B01', buildingName: 'Tòa A - Sông Hàn', totalRooms: 150, vacantRooms: 15, occupancyRate: '90%', totalCustomers: 135, currentMonthRevenue: '450,000,000 ₫' },
            { buildingId: 'B02', buildingName: 'Tòa B - Bến Nghé', totalRooms: 200, vacantRooms: 50, occupancyRate: '75%', totalCustomers: 150, currentMonthRevenue: '400,000,000 ₫' },
            { buildingId: 'B03', buildingName: 'Tòa C - Phố Cổ', totalRooms: 90, vacantRooms: 58, occupancyRate: '35%', totalCustomers: 32, currentMonthRevenue: '150,000,000 ₫' },
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
        // Gộp Điện & Nước
        abnormalReadings: {
            count: 8, // 5 điện + 3 nước
            topDetail: { // Trường hợp bất thường nhất (giả định là Điện)
                roomNumber: 'C305',
                tenantName: 'Lê Thị B',
                type: 'Electricity',
                lastReading: 520,
                unit: 'kWh',
                percentageIncrease: 45,
            },
        },
    };
};

// === COMPONENT CARD MẶC ĐỊNH & WARNING CARD ===
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
                {count > 0 ? "Rê chuột xem chi tiết" : "Không có cảnh báo"}
            </div>

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

const RevenueChart: React.FC<{ data: OwnerDashboardData['revenueChartData'] }> = ({ data }) => {
    const maxTotal = Math.max(...data.map(item => item.paidAmount + item.unpaidAmount)) * 1.2;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md col-span-1 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Biểu đồ Doanh thu (Đã TT / Chưa TT)</h3>
            <div className="flex justify-between items-end h-60 pt-4 space-x-2 relative">

                {/* Trục Y (Mô phỏng) */}
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
                            {/* Thanh Bar */}
                            <div className="w-full relative flex flex-col justify-end h-full">
                                {/* Hiển thị số liệu trong chart */}
                                <span className={`absolute text-[10px] text-gray-800 font-bold ${unpaidHeight > 5 ? 'bottom-[50%]' : 'top-[-15px]'} left-1/2 transform -translate-x-1/2`}>
                                    {unpaidHeight > 5 ? `${item.unpaidAmount}M` : ''}
                                </span>
                                <span className={`absolute text-[10px] text-gray-800 font-bold ${paidHeight > 5 ? 'bottom-[5%]' : 'top-[-15px]'} left-1/2 transform -translate-x-1/2`}>
                                    {paidHeight > 5 ? `${item.paidAmount}M` : ''}
                                </span>

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

// === COMPONENT MỚI: Bảng So Sánh Hiệu Suất Theo Nhà (Đã thêm input chọn tháng) ===
const BuildingPerformanceTable: React.FC<{ data: BuildingPerformance[] }> = ({ data }) => {
    // Giả lập danh sách các tháng có dữ liệu
    const availableMonths = ['Tháng 12/2025', 'Tháng 11/2025', 'Tháng 10/2025', 'Tháng 09/2025'];
    const [selectedMonth, setSelectedMonth] = useState(availableMonths[0]);

    const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMonth(event.target.value);
        // Ở đây, bạn sẽ gọi API hoặc hàm fetch dữ liệu mới dựa trên selectedMonth
        console.log(`Fetching data for: ${event.target.value}`);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md col-span-full">
            <h3 className="text-lg font-semibold mb-4 flex justify-between items-center  text-gray-700">
                <span>🏘️ So Sánh Hiệu Suất Cho Thuê Theo Tòa Nhà</span>
            </h3>

            {/* INPUT CHỌN THÁNG */}
            <div className="flex items-center mb-4  text-gray-700">
                <label htmlFor="month-selector" className="text-sm font-medium text-gray-700 mr-3">
                    Xem dữ liệu của:
                </label>
                <select
                    id="month-selector"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                >
                    {availableMonths.map(month => (
                        <option key={month} value={month}>{month}</option>
                    ))}
                </select>
                <span className="text-xs text-gray-500 font-normal ml-auto">API: /api/v1/property/performance-by-building-list?month={selectedMonth}</span>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tòa Nhà</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng Phòng</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng Trống</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỷ lệ Lấp đầy</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((item) => (
                            <tr key={item.buildingId} className={item.occupancyRate.startsWith('3') ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.buildingName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.totalRooms}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-yellow-600">{item.vacantRooms}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${item.occupancyRate.startsWith('9') ? 'text-green-600' : item.occupancyRate.startsWith('3') ? 'text-red-600' : 'text-orange-500'}`}>
                                    {item.occupancyRate}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">{item.currentMonthRevenue}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
    const topAbnormal = data.abnormalReadings.topDetail;

    // Components Chi tiết (dùng cho Tooltip)
    const OverdueDetailComponent = topOverdue ? (
        <div className="text-xs mt-1 space-y-1">
            <p className="font-bold text-red-500 text-gray-700">{topOverdue.roomNumber} - {topOverdue.tenantName}</p>
            <p className="text-gray-700">Mã HĐ: <span className="font-mono">{topOverdue.invoiceId}</span></p>
            <p className="text-gray-700">Quá hạn: <span className="font-semibold text-red-600">{topOverdue.overdueDays} ngày</span></p>
            <p className="text-red-500 font-bold">Số tiền: {topOverdue.amount}</p>
        </div>
    ) : (
        <p className="text-xs text-gray-700 italic">Không có hóa đơn quá hạn.</p>
    );

    const AbnormalReadingDetailComponent = topAbnormal ? (
        <div className="text-xs mt-1 space-y-1">
            <p className="font-bold text-gray-700">{topAbnormal.roomNumber} - {topAbnormal.tenantName}</p>
            <p className="text-gray-700">Loại: <span className="font-semibold">{topAbnormal.type}</span></p>
            <p className="text-gray-700">Kỳ gần nhất: <span className="font-semibold text-red-500">{topAbnormal.lastReading} {topAbnormal.unit}</span></p>
            <p className="text-gray-700">Tăng so với T.trước: <span className="font-semibold text-red-500">{topAbnormal.percentageIncrease}%</span></p>
        </div>
    ) : (
        <p className="text-xs text-gray-700 italic">Không có chỉ số tiêu thụ bất thường.</p>
    );

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Bảng Tổng Kết Chủ sở hữu</h1>

            {/* 📈 SECTION 1: CÁC CHỈ SỐ CHUNG TÍCH CỰC (FULL WIDTH) */}
            <h2 className="text-xl font-semibold text-gray-700 mb-4">📈 Các Chỉ số Hiệu suất Chính (KPIs)</h2>

            {/* KHỐI 4 CARD NẰM NGANG 1 HÀNG, FULL WIDTH */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <DashboardCard title="Tổng Doanh thu 1 Năm" value={data.annualTurnover} apiEndpoint="/api/v1/invoice/summary/annual-turnover" color="green" />
                <DashboardCard title="Doanh thu Tháng này" value={data.currentMonthTurnover} apiEndpoint="/api/v1/invoice/summary/turnover" color="green" />
                <DashboardCard title="Tổng số Phòng" value={`${data.totalRooms}`} apiEndpoint="/api/v1/property/summary/rooms" color="green" />
                <DashboardCard title="Tỷ lệ Lấp đầy (Tổng)" value={data.occupancyRate} apiEndpoint="/api/v1/property/summary/occupancy" color="green" />

            </div>

            <hr className="my-8" />

            {/* 📊 SECTION 2: BIỂU ĐỒ & TỔNG QUAN TÀI CHÍNH */}
            <h2 className="text-xl font-semibold text-gray-700 mb-4">💰 Phân tích Dòng tiền & Tình trạng Hóa đơn</h2>

            {/* KHỐI CHART và TỔNG QUAN HÓA ĐƠN (3 CỘT - 2/3 cho Chart, 1/3 cho Summary) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 text-gray-800">

                {/* 1. CHART DOANH THU - Chiếm 2/3 trên LG */}
                <div className="lg:col-span-2">
                    <RevenueChart data={data.revenueChartData} />
                </div>

                {/* 2. Tổng quan hóa đơn - Chiếm 1/3 trên LG */}
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-300 lg:col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Tổng Hóa đơn (Từ trước đến nay)</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="font-bold">Tổng Cộng</span>
                            <span className="font-bold text-xl text-gray-900">{data.invoiceSummary.totalAmount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-green-600">Đã Thanh Toán</span>
                            <span className="text-green-600 font-semibold">{data.invoiceSummary.paidAmount}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-red-600 font-bold">Tổng Số tiền Quá Hạn</span>
                            <span className="text-red-600 font-bold">{data.invoiceSummary.overdueAmount}</span>
                        </div>
                        <div className="mt-4 text-xs text-gray-700">API: /api/v1/invoice/summary</div>
                    </div>
                </div>
            </div>

            {/* 🏘️ SECTION 3: HIỆU SUẤT THEO NHÀ (Có Chọn Tháng) */}
            <BuildingPerformanceTable data={data.buildingPerformanceData} />

            <hr className="my-8" />

            {/* 🔔 SECTION 4: CẢNH BÁO VÀ HÀNH ĐỘNG KHẨN CẤP */}
            <h2 className="text-xl font-semibold text-red-700 mb-4">🔔 Cảnh báo và Hành động Khẩn cấp</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">

                {/* 1. Hóa đơn Quá hạn (ĐỎ) */}
                <InteractiveWarningCard
                    title="Khách hàng Quá hạn TT"
                    count={data.overdueInvoices.count}
                    apiEndpoint="/api/v1/invoice/warning/overdue-list"
                    color="red"
                    detailComponent={OverdueDetailComponent}
                />

                {/* 2. Hợp đồng gần hết hạn (ĐỎ) */}
                <DashboardCard
                    title="Phòng gần hết HĐ Thuê (90 ngày)"
                    value={`${data.endContracts} Phòng`}
                    apiEndpoint="/api/v1/contract/warning/ending-count"
                    color="red"
                />

                {/* 3. Sự cố Đang chờ (ĐỎ) */}
                <DashboardCard
                    title="Sự cố Đang chờ xử lý"
                    value={`${data.pendingIncidents} Sự cố`}
                    apiEndpoint="/api/v1/ticket/owner/summary"
                    color="red"
                />

                {/* 4. CHỈ SỐ BẤT THƯỜNG (GỘP ĐIỆN/NƯỚC) (VÀNG) */}
                <InteractiveWarningCard
                    title="Chỉ số Tiêu thụ Bất thường"
                    count={data.abnormalReadings.count}
                    apiEndpoint="/api/v1/reading/warning/abnormal-list"
                    color="yellow"
                    detailComponent={AbnormalReadingDetailComponent}
                />
            </div>
        </div >
    );
};

export default OwnerDashboardPage;