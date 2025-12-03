// owner/OwnerDashboardPage.tsx

"use client";

import React, { useState, useEffect } from 'react';
// Giả lập hàm navigate cho chuyển trang
const useNavigate = () => (path: string) => alert(`Chuyển hướng đến: ${path}`);

// === 1. INTERFACES DỮ LIỆU CHI TIẾT CHO MODAL ===
interface OverdueInvoiceListItem {
    id: string;
    tenantName: string;
    roomNumber: string;
    amount: string;
    dueDate: string;
    overdueDays: number;
}

interface PendingInvoiceListItem {
    id: string;
    tenantName: string;
    roomNumber: string;
    amount: string;
    invoiceDate: string;
}

interface AbnormalReadingListItem {
    id: string;
    tenantName: string;
    roomNumber: string;
    houseName: string;
    type: 'Electricity' | 'Water';
    increasePercent: number;
}

interface NearExpiryContractListItem {
    id: string;
    tenantName: string;
    roomNumber: string;
    houseName: string;
    endDate: string;
    remainingDays: number;
}

// === 2. INTERFACES DỮ LIỆU CHÍNH (Giữ nguyên một số, cập nhật phần chi tiết) ===
interface RevenueDataPoint {
    month: string;
    paidAmount: number;
    pendingAmount: number; // Dùng cho Status = 'Unpaid' và chưa quá hạn
    overdueAmount: number; // Dùng cho Status = 'Overdue' hoặc 'Unpaid' đã quá hạn
}

interface BuildingPerformance {
    buildingId: string;
    buildingName: string;
    totalRooms: number;
    vacantRooms: number;
    occupancyRate: string;
    currentMonthRevenue: string;
}

interface RevenueByBuildingData {
    buildingName: string;
    revenue: number; // Đơn vị tính bằng triệu (M)
}

interface InvoiceSummary {
    totalAmount: string;
    paidAmount: string;
    currentUnpaidAmount: string;
    overdueAmount: string;
}

interface OwnerDashboardData {
    // Dữ liệu Tổng quan
    totalRooms: number;
    occupiedRooms: number; // MỚI: Số phòng đã thuê (dùng để tính toán cho card gộp)
    annualTurnover: string;
    currentMonthTurnover: string;
    pendingIncidents: number;

    // Cảnh báo Count
    endContractsCount: number; // Số lượng hợp đồng gần hết hạn (30 ngày)
    abnormalReadingCount: number; // Số lượng tiêu thụ bất thường

    // Tài chính
    invoiceSummary: InvoiceSummary;

    // Dữ liệu Chart và Bảng
    revenueChartData: RevenueDataPoint[];
    buildingPerformanceData: BuildingPerformance[];
    revenueByBuildingData: RevenueByBuildingData[];

    // DỮ LIỆU CHI TIẾT CHO MODAL
    overdueDetails: OverdueInvoiceListItem[];
    pendingDetails: PendingInvoiceListItem[];
    abnormalReadingDetails: AbnormalReadingListItem[];
    nearExpiryContractDetails: NearExpiryContractListItem[];
}

// === 3. FAKE API DATA (Phù hợp với yêu cầu: 400 phòng, 360 thuê, 90% lấp đầy) ===
const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
    const totalRooms = 400;
    const occupiedRooms = 360;
    const occupancyRate = ((occupiedRooms / totalRooms) * 100).toFixed(0) + '%';
    const overdueAmountValue = 8_800_000;
    const pendingAmountValue = 10_020_000;

    const overdueList = [
        { id: 'I001', tenantName: 'Nguyễn Văn A', roomNumber: 'A101', amount: '5,500,000 ₫', dueDate: '2025-11-20', overdueDays: 13 },
        { id: 'I002', tenantName: 'Lê Thị B', roomNumber: 'B205', amount: '3,300,000 ₫', dueDate: '2025-11-25', overdueDays: 8 },
    ];
    const pendingList = [
        { id: 'P001', tenantName: 'Trần Văn C', roomNumber: 'C301', amount: '4,000,000 ₫', invoiceDate: '2025-12-01' },
        { id: 'P002', tenantName: 'Phạm Thị D', roomNumber: 'D402', amount: '6,020,000 ₫', invoiceDate: '2025-12-15' },
    ];
    const abnormalList = [
        { id: 'R001', tenantName: 'Hoàng Văn E', roomNumber: 'A201', houseName: 'Tòa A', type: 'Electricity', increasePercent: 55 } as const,
        { id: 'R002', tenantName: 'Đỗ Thị G', roomNumber: 'C305', houseName: 'Tòa C', type: 'Water', increasePercent: 40 } as const,
        { id: 'R003', tenantName: 'Mai Văn H', roomNumber: 'B102', houseName: 'Tòa B', type: 'Electricity', increasePercent: 35 } as const,
    ];
    const nearExpiryList = [
        { id: 'C001', tenantName: 'Vũ Văn I', roomNumber: 'A102', houseName: 'Tòa A', endDate: '2026-01-01', remainingDays: 29 },
        { id: 'C002', tenantName: 'Bùi Thị K', roomNumber: 'C405', houseName: 'Tòa C', endDate: '2026-01-15', remainingDays: 15 },
    ];
    const typedAbnormalList: AbnormalReadingListItem[] = abnormalList.map(item => ({
        ...item,
        type: item.type as 'Electricity' | 'Water' // Ép kiểu cho type trong khi map
    }));
    return {
        // Dữ liệu Tổng quan
        totalRooms: totalRooms,
        occupiedRooms: occupiedRooms,
        annualTurnover: '12,500,000,000 ₫',
        currentMonthTurnover: '1,000,000,000 ₫',
        pendingIncidents: 7,

        // Cảnh báo Count
        endContractsCount: nearExpiryList.length,
        abnormalReadingCount: typedAbnormalList.length,

        // Tài chính
        invoiceSummary: {
            totalAmount: '100,820,000 ₫',
            paidAmount: '82,000,000 ₫',
            currentUnpaidAmount: `${pendingAmountValue.toLocaleString('vi-VN')} ₫`,
            overdueAmount: `${overdueAmountValue.toLocaleString('vi-VN')} ₫`,
        },

        // Dữ liệu Chart và Bảng (Giữ nguyên logic của bản trước)
        revenueChartData: [
            { month: '09/25', paidAmount: 15, pendingAmount: 3, overdueAmount: 2 },
            { month: '10/25', paidAmount: 25, pendingAmount: 4, overdueAmount: 1 },
            { month: '11/25', paidAmount: 40, pendingAmount: 5, overdueAmount: 5 },
            { month: '12/25', paidAmount: 35, pendingAmount: 8, overdueAmount: 0 },
        ],
        buildingPerformanceData: [
            { buildingId: 'B01', buildingName: 'Tòa A - Sông Hàn', totalRooms: 150, vacantRooms: 15, occupancyRate: '90%', currentMonthRevenue: '450,000,000 ₫' },
            { buildingId: 'B02', buildingName: 'Tòa B - Bến Nghé', totalRooms: 200, vacantRooms: 50, occupancyRate: '75%', currentMonthRevenue: '400,000,000 ₫' },
            { buildingId: 'B03', buildingName: 'Tòa C - Phố Cổ', totalRooms: 50, vacantRooms: 5, occupancyRate: '90%', currentMonthRevenue: '150,000,000 ₫' },
        ],
        revenueByBuildingData: [
            { buildingName: 'Tòa A - Sông Hàn', revenue: 450 },
            { buildingName: 'Tòa B - Bến Nghé', revenue: 400 },
            { buildingName: 'Tòa C - Phố Cổ', revenue: 150 },
            { buildingName: 'Tòa D - Bờ Hồ', revenue: 250 },
        ],

        // DỮ LIỆU CHI TIẾT CHO MODAL
        overdueDetails: overdueList,
        pendingDetails: pendingList,
        abnormalReadingDetails: typedAbnormalList,
        nearExpiryContractDetails: nearExpiryList,
    };
};

// === 4. COMPONENT MODAL CHUNG ===
interface ModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-light">
                        &times;
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {children}
                </div>
            </div>
        </div>
    );
};


// === 5. COMPONENT THẺ MẶC ĐỊNH (Cập nhật để hỗ trợ onClick) ===
const DashboardCard: React.FC<{
    title: string;
    value: string;
    apiEndpoint: string;
    color: 'green' | 'red' | 'yellow' | 'default';
    onClick?: () => void;
    isClickable?: boolean;
}> = ({ title, value, apiEndpoint, color, onClick, isClickable = false }) => {
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

    const baseClasses = `bg-white p-4 rounded-lg shadow-md border-l-4 ${borderColor} flex flex-col justify-between`;
    const clickableClasses = isClickable ? 'cursor-pointer hover:shadow-lg transition-shadow duration-300' : '';

    return (
        <div
            className={`${baseClasses} ${clickableClasses}`}
            onClick={onClick}
        >
            <div className="text-sm font-medium text-gray-700">{title}</div>
            <div className={`text-2xl font-bold my-1 ${textColor}`}>{value}</div>
            {isClickable && <div className="text-xs font-semibold text-blue-500 mt-1">Click để xem chi tiết</div>}
            <div className="text-xs text-gray-700 mt-1">
                <span className={`font-mono ${apiBgColor} p-0.5 rounded text-wrap break-all text-xs text-gray-600`}>API: {apiEndpoint}</span>
            </div>
        </div>
    );
};

// === 6. COMPONENTS DANH SÁCH CHO MODAL ===

const OverdueInvoiceList: React.FC<{ data: OverdueInvoiceListItem[] }> = ({ data }) => (
    <div className="space-y-3">
        {data.map((item) => (
            <div key={item.id} className="p-3 border rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                <p className="font-bold text-red-700">{item.amount}</p>
                <p className="text-sm text-gray-800">Phòng: {item.roomNumber} - Khách: {item.tenantName}</p>
                <p className="text-xs text-gray-600">Hạn TT: {item.dueDate} | <span className="font-semibold text-red-600">Quá {item.overdueDays} ngày</span></p>
            </div>
        ))}
    </div>
);

const PendingInvoiceList: React.FC<{ data: PendingInvoiceListItem[] }> = ({ data }) => (
    <div className="space-y-3">
        {data.map((item) => (
            <div key={item.id} className="p-3 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
                <p className="font-bold text-yellow-700">{item.amount}</p>
                <p className="text-sm text-gray-800">Phòng: {item.roomNumber} - Khách: {item.tenantName}</p>
                <p className="text-xs text-gray-600">Ngày tạo: {item.invoiceDate}</p>
            </div>
        ))}
    </div>
);

const AbnormalReadingList: React.FC<{ data: AbnormalReadingListItem[] }> = ({ data }) => (
    <div className="space-y-3">
        {data.map((item) => (
            <div key={item.id} className="p-3 border rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
                <p className="font-bold text-gray-800">Phòng {item.roomNumber} - {item.houseName}</p>
                <p className="text-sm text-gray-800">Khách: {item.tenantName}</p>
                <p className="text-xs text-gray-600">Loại: <span className="font-semibold">{item.type}</span> | Tăng: <span className="font-semibold text-red-600">{item.increasePercent}%</span></p>
            </div>
        ))}
    </div>
);

const NearExpiryContractList: React.FC<{ data: NearExpiryContractListItem[] }> = ({ data }) => (
    <div className="space-y-3">
        {data.map((item) => (
            <div key={item.id} className="p-3 border rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                <p className="font-bold text-gray-800">Phòng {item.roomNumber} - {item.houseName}</p>
                <p className="text-sm text-gray-800">Khách: {item.tenantName}</p>
                <p className="text-xs text-gray-600">Ngày kết thúc: {item.endDate} | <span className="font-semibold text-red-600">Còn {item.remainingDays} ngày</span></p>
            </div>
        ))}
    </div>
);


// --- COMPONENTS CHART (Giữ nguyên logic của bản trước) ---

const RevenueChart: React.FC<{ data: OwnerDashboardData['revenueChartData'] }> = ({ data }) => {
    const maxTotal = Math.max(...data.map(item => item.paidAmount + item.pendingAmount + item.overdueAmount)) * 1.2;
    return (
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">📈 Biểu đồ Doanh thu Theo tháng</h3>
            <div className="flex justify-between items-end h-60 pt-4 space-x-4 relative">
                {/* Trục Y */}
                <div className="absolute left-0 bottom-0 w-full h-full border-l border-b border-gray-300">
                    <div className="absolute left-0 top-0 w-full text-xs text-gray-700 text-right pr-2">Max ({Math.round(maxTotal)}M)</div>
                </div>

                {data.map((item) => {
                    const total = item.paidAmount + item.pendingAmount + item.overdueAmount;
                    const paidHeight = (item.paidAmount / maxTotal) * 100;
                    const pendingHeight = (item.pendingAmount / maxTotal) * 100;
                    const overdueHeight = (item.overdueAmount / maxTotal) * 100;

                    return (
                        <div key={item.month} className="flex flex-col items-center flex-1 h-full relative group cursor-pointer z-10">
                            <div className="w-full relative flex flex-col justify-end h-full">
                                {/* 1. Quá hạn (Overdue - ĐỎ) */}
                                <div className="w-full bg-red-500 hover:bg-red-600 transition-all duration-300" style={{ height: `${overdueHeight}%` }} title={`Quá Hạn: ${item.overdueAmount}M`} />
                                {/* 2. Chờ thanh toán (Pending - VÀNG) */}
                                <div className="w-full bg-orange-400 hover:bg-orange-500 transition-all duration-300" style={{ height: `${pendingHeight}%` }} title={`Chờ TT: ${item.pendingAmount}M`} />
                                {/* 3. Đã Thanh toán (Paid - XANH) */}
                                <div className="w-full bg-green-500 hover:bg-green-600 transition-all duration-300" style={{ height: `${paidHeight}%` }} title={`Đã TT: ${item.paidAmount}M`} />
                            </div>
                            <div className="absolute bottom-full mb-2 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                <p className="font-bold">🗓️ {item.month}</p>
                                <p className="text-green-300">Đã TT: {item.paidAmount}M</p>
                                <p className="text-orange-300">Chờ TT: {item.pendingAmount}M</p>
                                <p className="text-red-300">Quá Hạn: {item.overdueAmount}M</p>
                            </div>
                            <div className="text-xs text-gray-700 mt-1 z-20">{item.month}</div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 flex justify-center space-x-4 text-sm">
                <span className="flex items-center"><span className="w-3 h-3 bg-green-500 mr-2"></span>Đã TT</span>
                <span className="flex items-center"><span className="w-3 h-3 bg-orange-400 mr-2"></span>Chờ TT (Pending)</span>
                <span className="flex items-center"><span className="w-3 h-3 bg-red-500 mr-2"></span>Quá Hạn (Overdue)</span>
            </div>
            <div className="text-xs text-gray-400 mt-2 text-right">API: /api/v1/invoice/chart/monthly-status</div>
        </div>
    );
};

const RevenueByBuildingPieChart: React.FC<{ data: RevenueByBuildingData[] }> = ({ data }) => {
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalRevenueBillion = totalRevenue / 1000;
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-teal-500'];

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-gray-300 lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Phân bổ Doanh thu (Theo Nhà - 1 Năm)</h3>
            <div className="flex items-center justify-center relative h-40">
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-700 border-4 border-gray-100">
                    {totalRevenueBillion > 0 ? `${totalRevenueBillion.toFixed(1)} Tỷ` : '0 Tỷ'}
                </div>
                <div className="ml-8 space-y-2 text-sm">
                    {data.map((item, index) => (
                        <div key={item.buildingName} className="flex justify-between items-center w-full min-w-48">
                            <span className="flex items-center mr-4">
                                <span className={`w-3 h-3 rounded-full mr-2 ${colors[index % colors.length]}`}></span>
                                {item.buildingName.split(' - ')[0]}
                            </span>
                            <span className="font-semibold text-gray-800">
                                {((item.revenue / totalRevenue) * 100).toFixed(0)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-4 text-xs text-gray-400 text-right">API: /api/v1/invoice/chart/annual-revenue-by-house</div>
        </div>
    );
};


const BuildingPerformanceTable: React.FC<{ data: BuildingPerformance[] }> = ({ data }) => {
    const availableMonths = ['Tháng 12/2025', 'Tháng 11/2025', 'Tháng 10/2025', 'Tháng 09/2025'];
    const [selectedMonth, setSelectedMonth] = useState(availableMonths[0]);

    const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMonth(event.target.value);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md col-span-full">
            <h3 className="text-lg font-semibold mb-4 flex justify-between items-center text-gray-700">
                <span>🏘️ So Sánh Hiệu Suất Cho Thuê Theo Tòa Nhà</span>
            </h3>

            <div className="flex items-center mb-4 text-gray-700">
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
                            <tr key={item.buildingId} className={item.occupancyRate.startsWith('9') ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.buildingName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.totalRooms}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-yellow-600">{item.vacantRooms}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${item.occupancyRate.startsWith('9') ? 'text-green-600' : 'text-orange-500'}`}>
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


// === 7. COMPONENT TRANG CHÍNH ===
const OwnerDashboardPage: React.FC = () => {
    const [data, setData] = useState<OwnerDashboardData | null>(null);
    const [modalType, setModalType] = useState<'overdue' | 'pending' | 'abnormal' | 'contract' | null>(null);
    const navigate = useNavigate(); // Giả lập hook navigate

    useEffect(() => {
        fetchOwnerDashboardData().then(setData);
    }, []);

    const openModal = (type: typeof modalType) => {
        if (data) {
            let list: (OverdueInvoiceListItem | PendingInvoiceListItem | AbnormalReadingListItem | NearExpiryContractListItem)[] = [];
            switch (type) {
                case 'overdue': list = data.overdueDetails; break;
                case 'pending': list = data.pendingDetails; break;
                case 'abnormal': list = data.abnormalReadingDetails; break;
                case 'contract': list = data.nearExpiryContractDetails; break;
                default: break;
            }
            if (list.length > 0) {
                setModalType(type);
            } else {
                alert(`Không có dữ liệu cho ${type === 'overdue' ? 'Hóa đơn Quá hạn' : type === 'pending' ? 'Hóa đơn Chờ thanh toán' : type === 'abnormal' ? 'Tiêu thụ Bất thường' : 'Hợp đồng Sắp hết hạn'}.`);
            }
        }
    };
    const closeModal = () => setModalType(null);

    if (!data) return <div className="p-8 text-center">Đang tải Dữ liệu Quản lý...</div>;

    // Lấy dữ liệu cho Modal
    let modalTitle = '';
    let modalContent: React.ReactNode = null;

    switch (modalType) {
        case 'overdue':
            modalTitle = `Danh sách ${data.overdueDetails.length} Hóa đơn Quá hạn`;
            modalContent = <OverdueInvoiceList data={data.overdueDetails} />;
            break;
        case 'pending':
            modalTitle = `Danh sách ${data.pendingDetails.length} Hóa đơn Chờ TT Tháng này`;
            modalContent = <PendingInvoiceList data={data.pendingDetails} />;
            break;
        case 'abnormal':
            modalTitle = `Danh sách ${data.abnormalReadingDetails.length} Chỉ số Tiêu thụ Bất thường`;
            modalContent = <AbnormalReadingList data={data.abnormalReadingDetails} />;
            break;
        case 'contract':
            modalTitle = `Danh sách ${data.nearExpiryContractDetails.length} Hợp đồng Gần hết hạn (30 ngày)`;
            modalContent = <NearExpiryContractList data={data.nearExpiryContractDetails} />;
            break;
        default:
            break;
    }


    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Bảng Tổng Kết Chủ sở hữu</h1>

            {/* 📈 SECTION 1: CÁC CHỈ SỐ CHUNG (KPIs) */}
            <h2 className="text-xl font-semibold text-gray-700 mb-4">📈 Các Chỉ số Hiệu suất Chính (KPIs)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">

                {/* 1. Tổng Thu 1 Năm */}
                <DashboardCard
                    title="Tổng Thu 1 Năm"
                    value={data.annualTurnover}
                    apiEndpoint="/api/v1/invoice/summary/annual-turnover"
                    color="green"
                />

                {/* 2. Tổng số Phòng & Tỷ lệ lấp đầy (KPI GỘP) */}
                <DashboardCard
                    title="Tổng số Phòng & Tỷ lệ lấp đầy"
                    value={`${data.totalRooms} phòng (${data.occupiedRooms} thuê): ${((data.occupiedRooms / data.totalRooms) * 100).toFixed(0)}%`}
                    apiEndpoint="/api/v1/property/summary/rooms-occupancy"
                    color="default"
                />

                {/* 5. Doanh thu Tháng này */}
                <DashboardCard
                    title="Doanh thu Tháng này (Paid)"
                    value={data.currentMonthTurnover}
                    apiEndpoint="/api/v1/invoice/summary/turnover"
                    color="green"
                />

                {/* 3. Tổng tiền Quá hạn TT (Click to Modal) */}
                <DashboardCard
                    title={`⛔ Tổng tiền Quá hạn TT (${data.overdueDetails.length} Hóa đơn)`}
                    value={data.invoiceSummary.overdueAmount}
                    apiEndpoint="/api/v1/invoice/summary/overdue-amount"
                    color="red"
                    onClick={() => openModal('overdue')}
                    isClickable={data.overdueDetails.length > 0}
                />

                {/* 4. Chưa TT Tháng này (Click to Modal) */}
                <DashboardCard
                    title={`⏳ Chưa TT Tháng này (${data.pendingDetails.length} Hóa đơn)`}
                    value={data.invoiceSummary.currentUnpaidAmount}
                    apiEndpoint="/api/v1/invoice/summary/current-pending"
                    color="yellow"
                    onClick={() => openModal('pending')}
                    isClickable={data.pendingDetails.length > 0}
                />
            </div>

            <hr className="my-8" />

            {/* 📊 SECTION 2: BIỂU ĐỒ & PHÂN TÍCH TÀI CHÍNH */}
            <h2 className="text-xl font-semibold text-gray-700 mb-4">💰 Phân tích Dòng tiền & Phân bổ Doanh thu</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 text-gray-800">
                {/* 6. CHART DOANH THU */}
                <RevenueChart data={data.revenueChartData} />

                {/* 8. PIE CHART DOANH THU THEO NHÀ (Theo Năm) */}
                <RevenueByBuildingPieChart data={data.revenueByBuildingData} />
            </div>

            {/* 9. BẢNG HIỆU SUẤT THEO NHÀ */}
            <BuildingPerformanceTable data={data.buildingPerformanceData} />

            <hr className="my-8" />

            {/* 🔔 SECTION 3: CẢNH BÁO VÀ HÀNH ĐỘNG KHẨN CẤP */}
            <h2 className="text-xl font-semibold text-red-700 mb-4">🔔 Cảnh báo và Hành động Khẩn cấp</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

                {/* 11. Sự cố Đang chờ (Click to Navigate) */}
                <DashboardCard
                    title="Sự cố Đang chờ xử lý"
                    value={`${data.pendingIncidents} Sự cố`}
                    apiEndpoint="/api/v1/ticket/owner/summary"
                    color="red"
                    onClick={() => navigate('/owner/ticket')}
                    isClickable={true}
                />

                {/* 12. Phòng gần hết HĐ Thuê (Click to Modal) - 30 ngày */}
                <DashboardCard
                    title={`Phòng gần hết HĐ Thuê (${data.endContractsCount} Hợp đồng) - 30 ngày`}
                    value={`${data.endContractsCount} Phòng`}
                    apiEndpoint="/api/v1/contract/warning/ending-count"
                    color="red"
                    onClick={() => openModal('contract')}
                    isClickable={data.nearExpiryContractDetails.length > 0}
                />

                {/* 10. CHỈ SỐ BẤT THƯỜNG (Click to Modal) */}
                <DashboardCard
                    title={`Chỉ số Tiêu thụ Bất thường (${data.abnormalReadingDetails.length} Trường hợp)`}
                    value={`${data.abnormalReadingDetails.length} Phòng`}
                    apiEndpoint="/api/v1/reading/warning/abnormal-list"
                    color="yellow"
                    onClick={() => openModal('abnormal')}
                    isClickable={data.abnormalReadingDetails.length > 0}
                />
            </div>

            {/* MODAL CONTAINER */}
            <Modal
                title={modalTitle}
                isOpen={modalType !== null}
                onClose={closeModal}
            >
                {modalContent}
            </Modal>
        </div >
    );
};

export default OwnerDashboardPage;