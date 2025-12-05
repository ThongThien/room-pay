"use client";

import React, { useState, useEffect, useMemo } from 'react';

// Giả lập hàm navigate cho chuyển trang
const useNavigate = () => (path: string) => alert(`Chuyển hướng đến: ${path}`);

// === UTILS ===
// Hàm chuyển đổi chuỗi tiền tệ (VNĐ) sang số (đơn vị Triệu VNĐ) để tính toán
const parseRevenueToNumber = (revenueStr: string): number => {
    // Loại bỏ ' ₫', dấu cách, dấu phẩy, và chuyển đổi thành số
    const cleanStr = revenueStr.replace(/[\s₫,]/g, '');
    const numberValue = parseFloat(cleanStr) / 1000000; // Chia cho 1 triệu để lấy đơn vị Triệu VNĐ
    return isNaN(numberValue) ? 0 : numberValue;
};


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

// === 2. INTERFACES DỮ LIỆU CHÍNH ===
interface RevenueDataPoint {
    month: string;
    paidAmount: number; // Đã thanh toán (Triệu)
    pendingAmount: number; // Chờ thanh toán (chưa quá hạn - Triệu)
    overdueAmount: number; // Quá hạn (Overdue - Triệu)
}

interface BuildingPerformance {
    buildingId: string;
    buildingName: string;
    totalRooms: number;
    vacantRooms: number;
    occupiedRooms: number;
    occupancyRate: string;
    currentMonthRevenue: string; // Chuỗi tiền tệ
}

interface OwnerDashboardData {
    // Dữ liệu Tổng quan
    totalRooms: number;
    occupiedRooms: number;
    annualTurnover: string; // Tổng thu 1 năm
    pendingIncidents: number;

    // Cảnh báo Count
    endContractsCount: number;
    abnormalReadingCount: number;

    // Tài chính
    invoiceSummary: {
        totalAmount: string;
        paidAmount: string;
        currentUnpaidAmount: string;
        overdueAmount: string;
    };

    // Dữ liệu Chart và Bảng
    revenueChartData: RevenueDataPoint[];
    buildingPerformanceData: BuildingPerformance[];

    // Thêm các trường details để Modal truy cập
    overdueDetails: OverdueInvoiceListItem[];
    pendingDetails: PendingInvoiceListItem[];
    abnormalReadingDetails: AbnormalReadingListItem[];
    nearExpiryContractDetails: NearExpiryContractListItem[];
}

// === 3. FAKE API DATA (Đã cập nhật cấu trúc) ===
const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
    const totalRooms = 400;
    const occupiedRooms = 360;
    const overdueAmountValue = 8_800_000;
    const pendingAmountValue = 10_020_000;

    const overdueList: OverdueInvoiceListItem[] = [
        { id: 'I001', tenantName: 'Nguyễn Văn A', roomNumber: 'A101', amount: '5,500,000 ₫', dueDate: '2025-11-20', overdueDays: 13 },
        { id: 'I002', tenantName: 'Lê Thị B', roomNumber: 'B205', amount: '3,300,000 ₫', dueDate: '2025-11-25', overdueDays: 8 },
    ];
    const pendingList: PendingInvoiceListItem[] = [
        { id: 'P001', tenantName: 'Trần Văn C', roomNumber: 'C301', amount: '4,000,000 ₫', invoiceDate: '2025-12-01' },
        { id: 'P002', tenantName: 'Phạm Thị D', roomNumber: 'D402', amount: '6,020,000 ₫', invoiceDate: '2025-12-15' },
    ];
    const abnormalList = [
        { id: 'R001', tenantName: 'Hoàng Văn E', roomNumber: 'A201', houseName: 'Tòa A', type: 'Electricity', increasePercent: 55 },
        { id: 'R002', tenantName: 'Đỗ Thị G', roomNumber: 'C305', houseName: 'Tòa C', type: 'Water', increasePercent: 40 },
        { id: 'R003', tenantName: 'Mai Văn H', roomNumber: 'B102', houseName: 'Tòa B', type: 'Electricity', increasePercent: 35 },
    ];
    const nearExpiryList: NearExpiryContractListItem[] = [
        { id: 'C001', tenantName: 'Vũ Văn I', roomNumber: 'A102', houseName: 'Tòa A', endDate: '2026-01-01', remainingDays: 29 },
        { id: 'C002', tenantName: 'Bùi Thị K', roomNumber: 'C405', houseName: 'Tòa C', endDate: '2026-01-15', remainingDays: 15 },
    ];
    const typedAbnormalList: AbnormalReadingListItem[] = abnormalList.map(item => ({
        ...item,
        type: item.type as 'Electricity' | 'Water'
    }));

    const buildingData: BuildingPerformance[] = [
        { buildingId: 'B01', buildingName: 'Tòa A - Sông Hàn', totalRooms: 150, occupiedRooms: 135, vacantRooms: 15, occupancyRate: '90%', currentMonthRevenue: '450,000,000 ₫' },
        { buildingId: 'B02', buildingName: 'Tòa B - Bến Nghé', totalRooms: 200, occupiedRooms: 180, vacantRooms: 20, occupancyRate: '90%', currentMonthRevenue: '400,000,000 ₫' },
        { buildingId: 'B03', buildingName: 'Tòa C - Phố Cổ', totalRooms: 50, occupiedRooms: 45, vacantRooms: 5, occupancyRate: '90%', currentMonthRevenue: '150,000,000 ₫' },
    ];

    return {
        // Dữ liệu Tổng quan
        totalRooms: totalRooms,
        occupiedRooms: occupiedRooms,
        annualTurnover: '12,500,000,000 ₫',
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

        // Dữ liệu Chart và Bảng
        revenueChartData: [
            { month: '09/25', paidAmount: 15, pendingAmount: 3, overdueAmount: 2 },
            { month: '10/25', paidAmount: 25, pendingAmount: 4, overdueAmount: 1 },
            { month: '11/25', paidAmount: 40, pendingAmount: 5, overdueAmount: 5 },
            { month: '12/25', paidAmount: 35, pendingAmount: 8, overdueAmount: 0 },
        ],
        buildingPerformanceData: buildingData,

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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center font-sans">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
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


// === 5. COMPONENT THẺ MẶC ĐỊNH ===
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

    const baseClasses = `bg-white p-4 rounded-xl shadow-lg border-l-4 ${borderColor} flex flex-col justify-between transition-all duration-300`;
    const clickableClasses = isClickable ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]' : '';

    return (
        <div
            className={`${baseClasses} ${clickableClasses}`}
            onClick={onClick}
        >
            <div className="text-sm font-medium text-gray-700 mb-2 leading-tight">{title}</div>
            <div className={`text-2xl font-extrabold my-1 ${textColor}`}>{value}</div>
            {isClickable && <div className="text-xs font-semibold text-blue-500 mt-1">Click để xem chi tiết</div>}
            <div className="text-xs text-gray-700 mt-2">
                <span className={`font-mono ${apiBgColor} p-0.5 rounded text-wrap break-all text-xs text-gray-600`}>API: {apiEndpoint}</span>
            </div>
        </div>
    );
};

// === 6. COMPONENTS DANH SÁCH CHO MODAL (Không đổi) ===
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


// --- COMPONENTS CHART (Đã Cập nhật) ---

interface RevenueChartProps {
    data: OwnerDashboardData['revenueChartData'];
    annualTurnover: string;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, annualTurnover }) => {
    const maxTotal = Math.max(...data.map(item => item.paidAmount + item.pendingAmount + item.overdueAmount)) * 1.2;
    const yAxisSteps = 4; // 4 bước chia (0, 25%, 50%, 75%, 100%)
    const stepValue = maxTotal / yAxisSteps;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg col-span-full relative">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex justify-between items-center">
                <span>📈 Biểu đồ Dòng tiền Theo tháng (Đơn vị: Triệu VNĐ)</span>
                {/* Tổng thu 1 năm được merge vào đây */}
                <div className="text-sm text-green-700 font-bold bg-green-100 p-2 rounded-lg shadow-sm whitespace-nowrap">
                    Tổng Thu 1 Năm: {annualTurnover}
                </div>
            </h3>

            <div className="flex justify-between items-end h-72 pt-4 space-x-6 relative">
                {/* Trục Y và Grid Lines */}
                <div className="absolute left-0 bottom-0 w-full h-full border-l border-b border-gray-300">
                    {Array.from({ length: yAxisSteps }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute left-0 w-full border-t border-gray-200"
                            style={{ bottom: `${((i + 1) / yAxisSteps) * 100}%` }}
                        >
                            <span className="absolute -left-12 -translate-y-1/2 text-xs text-gray-500">
                                {Math.round(stepValue * (i + 1))}M
                            </span>
                        </div>
                    ))}
                    <span className="absolute -left-12 -bottom-2 text-xs text-gray-500">0M</span>
                </div>

                {/* Các cột dữ liệu */}
                <div className='flex flex-1 justify-around h-full pl-10'>
                    {data.map((item) => {
                        const paidHeight = (item.paidAmount / maxTotal) * 100;
                        const pendingHeight = (item.pendingAmount / maxTotal) * 100;
                        const overdueHeight = (item.overdueAmount / maxTotal) * 100;

                        return (
                            <div key={item.month} className="flex flex-col items-center flex-1 h-full relative group cursor-pointer z-10 max-w-[50px]">
                                <div className="w-full relative flex flex-col justify-end h-full rounded-t-md overflow-hidden border border-gray-100/50 hover:shadow-lg transition-shadow duration-300">
                                    {/* 1. Quá hạn (Overdue - ĐỎ) */}
                                    <div className="w-full bg-red-500/80 hover:bg-red-600 transition-all duration-300" style={{ height: `${overdueHeight}%` }} title={`Quá Hạn: ${item.overdueAmount}M`} />
                                    {/* 2. Chờ thanh toán (Pending - VÀNG CAM) */}
                                    <div className="w-full bg-orange-400/80 hover:bg-orange-500 transition-all duration-300" style={{ height: `${pendingHeight}%` }} title={`Chờ TT: ${item.pendingAmount}M`} />
                                    {/* 3. Đã Thanh toán (Paid - XANH) */}
                                    <div className="w-full bg-green-500/80 hover:bg-green-600 transition-all duration-300" style={{ height: `${paidHeight}%` }} title={`Đã TT: ${item.paidAmount}M`} />
                                </div>
                                <div className="absolute bottom-full mb-10 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl transform group-hover:-translate-y-2">
                                    <p className="font-bold">🗓️ {item.month}</p>
                                    <p className="text-green-300">Đã TT: {item.paidAmount}M</p>
                                    <p className="text-orange-300">Chờ TT: {item.pendingAmount}M</p>
                                    <p className="text-red-300">Quá Hạn: {item.overdueAmount}M</p>
                                </div>
                                <div className="text-xs text-gray-700 mt-1 z-20 font-medium">{item.month}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="mt-6 flex justify-center space-x-6 text-sm pt-2 border-t border-gray-200">
                <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>Đã TT</span>
                <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-orange-400 mr-2"></span>Chờ TT (Pending)</span>
                <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>Quá Hạn (Overdue)</span>
            </div>
            <div className="text-xs text-gray-400 mt-2 text-right">API: /api/v1/invoice/chart/monthly-status</div>
        </div>
    );
};


// Biểu đồ Phân bổ số phòng theo Nhà (Room Occupancy by Building)
const RoomOccupancyByBuildingPieChart: React.FC<{ data: BuildingPerformance[]; totalRooms: number }> = ({ data, totalRooms }) => {
    const colors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981']; // Blue, Purple, Amber, Pink, Emerald

    // Tính toán góc cho mỗi tòa nhà
    const houseSegments = data.reduce((acc, item, index) => {
        const proportion = item.totalRooms / totalRooms;
        const angle = proportion * 360;
        const startAngle = acc.length > 0 ? acc[acc.length - 1].startAngle + acc[acc.length - 1].angle : 0;

        // Tính toán tỉ lệ Lấp đầy và Còn trống trong từng nhà
        const occupiedProportion = item.occupiedRooms / item.totalRooms;
        const vacantProportion = item.vacantRooms / item.totalRooms;

        acc.push({
            ...item,
            proportion,
            angle,
            startAngle,
            color: colors[index % colors.length],
            occupiedProportion,
            vacantProportion,
        });
        return acc;
    }, [] as (BuildingPerformance & {
        proportion: number;
        angle: number;
        startAngle: number;
        color: string;
        occupiedProportion: number;
        vacantProportion: number;
    })[]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-gray-300">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">🏘️ Phân bổ Số phòng Theo Tòa Nhà</h3>

            <div className="flex flex-col sm:flex-row items-center justify-start h-full">

                {/* Chart: Dùng SVG để vẽ Pie Chart */}
                <div className="w-40 h-40 flex-shrink-0 relative mb-4 sm:mb-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {houseSegments.map((segment, index) => {
                            const radius = 50;
                            const largeArcFlag = segment.angle > 180 ? 1 : 0;
                            const endX = radius + radius * Math.cos((segment.startAngle + segment.angle) * Math.PI / 180);
                            const endY = radius + radius * Math.sin((segment.startAngle + segment.angle) * Math.PI / 180);
                            const startX = radius + radius * Math.cos(segment.startAngle * Math.PI / 180);
                            const startY = radius + radius * Math.sin(segment.startAngle * Math.PI / 180);

                            const d = [
                                `M ${radius} ${radius}`, // Move to center
                                `L ${startX} ${startY}`, // Line to start point
                                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
                                `Z` // Close path back to center
                            ].join(' ');

                            return (
                                <g key={segment.buildingId}>
                                    <title>{`${segment.buildingName}: ${segment.totalRooms} phòng (${(segment.proportion * 100).toFixed(1)}%)`}</title>
                                    <path
                                        d={d}
                                        fill={segment.color}
                                        className="hover:opacity-90 transition-opacity"
                                    />
                                </g>
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700">
                        {totalRooms} P.
                    </div>
                </div>

                {/* Details: Dùng để show chi tiết từng nhà */}
                <div className="ml-0 sm:ml-6 space-y-3 text-sm flex-1 w-full sm:w-auto">
                    {houseSegments.map((item, index) => (
                        <div key={item.buildingId} className="p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-center mb-1">
                                <span className="flex items-center text-gray-800 font-semibold">
                                    <span className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: item.color }}></span>
                                    {item.buildingName.split(' - ')[0]} ({item.totalRooms} P.)
                                </span>
                                <span className="font-bold text-lg" style={{ color: item.color }}>
                                    {(item.proportion * 100).toFixed(1)}%
                                </span>
                            </div>
                            {/* Chi tiết: Phòng trống vs Đã thuê */}
                            <div className="flex text-xs mt-1 space-x-2">
                                <span className="text-green-600 font-medium whitespace-nowrap">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-300 mr-1"></span>
                                    Đã thuê: {item.occupiedRooms} ({Math.round(item.occupiedProportion * 100)}%)
                                </span>
                                <span className="text-red-600 font-medium whitespace-nowrap">
                                    <span className="inline-block w-2 h-2 rounded-full bg-red-300 mr-1"></span>
                                    Trống: {item.vacantRooms} ({Math.round(item.vacantProportion * 100)}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 text-xs text-gray-400 text-right">API: /api/v1/property/summary/rooms-occupancy-by-house</div>
        </div>
    );
};

// NEW: Biểu đồ Phân bổ Doanh thu Theo Tòa Nhà
const RevenueByBuildingPieChart: React.FC<{ data: BuildingPerformance[] }> = ({ data }) => {
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6']; // Emerald, Blue, Amber, Pink, Purple

    // Tính toán tổng doanh thu và chuẩn bị dữ liệu cho biểu đồ
    const revenueSegments = useMemo(() => {
        const segments = data.map(item => ({
            ...item,
            revenueValue: parseRevenueToNumber(item.currentMonthRevenue),
        }));

        const totalRevenue = segments.reduce((sum, item) => sum + item.revenueValue, 0);

        return segments.reduce((acc, item, index) => {
            const proportion = totalRevenue > 0 ? item.revenueValue / totalRevenue : 0;
            const angle = proportion * 360;
            const startAngle = acc.length > 0 ? acc[acc.length - 1].startAngle + acc[acc.length - 1].angle : 0;

            acc.push({
                ...item,
                proportion,
                angle,
                startAngle,
                color: colors[index % colors.length],
                formattedRevenue: item.currentMonthRevenue,
            });

            return acc;
        }, [] as (BuildingPerformance & {
            revenueValue: number;
            proportion: number;
            angle: number;
            startAngle: number;
            color: string;
            formattedRevenue: string;
        })[]);
    }, [data]);

    const totalRevenueDisplay = useMemo(() => {
        const total = revenueSegments.reduce((sum, item) => sum + item.revenueValue, 0);
        return `${total.toFixed(1)} T.VNĐ`;
    }, [revenueSegments]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">💰 Phân bổ Doanh thu Theo Tòa Nhà</h3>

            <div className="flex flex-col sm:flex-row items-center justify-start h-full">

                {/* Chart: Dùng SVG để vẽ Pie Chart */}
                <div className="w-40 h-40 flex-shrink-0 relative mb-4 sm:mb-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {revenueSegments.map((segment, index) => {
                            const radius = 50;
                            const largeArcFlag = segment.angle > 180 ? 1 : 0;
                            const endX = radius + radius * Math.cos((segment.startAngle + segment.angle) * Math.PI / 180);
                            const endY = radius + radius * Math.sin((segment.startAngle + segment.angle) * Math.PI / 180);
                            const startX = radius + radius * Math.cos(segment.startAngle * Math.PI / 180);
                            const startY = radius + radius * Math.sin(segment.startAngle * Math.PI / 180);

                            const d = [
                                `M ${radius} ${radius}`,
                                `L ${startX} ${startY}`,
                                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                                `Z`
                            ].join(' ');

                            return (
                                <g key={segment.buildingId}>
                                    <title>{`${segment.buildingName}: ${segment.formattedRevenue} (${(segment.proportion * 100).toFixed(1)}%)`}</title>
                                    <path
                                        d={d}
                                        fill={segment.color}
                                        className="hover:opacity-90 transition-opacity"
                                    />
                                </g>
                            );
                        })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-700">
                        {totalRevenueDisplay}
                    </div>
                </div>

                {/* Details: Dùng để show chi tiết từng nhà */}
                <div className="ml-0 sm:ml-6 space-y-3 text-sm flex-1 w-full sm:w-auto">
                    {revenueSegments.map((item, index) => (
                        <div key={item.buildingId} className="p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-center mb-1">
                                <span className="flex items-center text-gray-800 font-semibold">
                                    <span className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: item.color }}></span>
                                    {item.buildingName.split(' - ')[0]}
                                </span>
                                <span className="font-bold text-base whitespace-nowrap text-green-700">
                                    {item.formattedRevenue}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs mt-1 text-gray-600">
                                <span className="font-medium">
                                    Tỷ trọng: <span className="text-gray-800 font-semibold">{(item.proportion * 100).toFixed(1)}%</span>
                                </span>
                                <span className="font-medium">
                                    Tỷ lệ lấp đầy: <span className="text-green-600 font-semibold">{item.occupancyRate}</span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 text-xs text-gray-400 text-right">API: /api/v1/finance/summary/revenue-by-house</div>
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
        <div className="bg-white p-6 rounded-xl shadow-lg col-span-full">
            <h3 className="text-lg font-semibold mb-4 flex justify-between items-center text-gray-700">
                <span>🏘️ So Sánh Hiệu Suất Cho Thuê Theo Tòa Nhà</span>
            </h3>

            <div className="flex items-center mb-4 text-gray-700 flex-wrap">
                <label htmlFor="month-selector" className="text-sm font-medium text-gray-700 mr-3 mb-2 sm:mb-0">
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
                <span className="text-xs text-gray-500 font-normal ml-auto mt-2 sm:mt-0">API: /api/v1/property/performance-by-building-list?month={selectedMonth}</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                            <tr key={item.buildingId} className={item.occupancyRate.startsWith('9') ? 'bg-green-50/50 hover:bg-green-100' : 'hover:bg-gray-50'}>
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


// === 7. COMPONENT TRANG CHÍNH (Đã Cập nhật cấu trúc) ===
const OwnerDashboardPage: React.FC = () => {
    const [data, setData] = useState<OwnerDashboardData | null>(null);
    const [modalType, setModalType] = useState<'overdue' | 'pending' | 'abnormal' | 'contract' | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Tải dữ liệu
        fetchOwnerDashboardData().then(fetchedData => {
            setData(fetchedData);
        });
    }, []);

    const openModal = (type: typeof modalType) => {
        if (!data) return;

        let list: (OverdueInvoiceListItem | PendingInvoiceListItem | AbnormalReadingListItem | NearExpiryContractListItem)[] = [];
        let listLength = 0;

        switch (type) {
            case 'overdue': list = data.overdueDetails || []; listLength = list.length; break;
            case 'pending': list = data.pendingDetails || []; listLength = list.length; break;
            case 'abnormal': list = data.abnormalReadingDetails || []; listLength = list.length; break;
            case 'contract': list = data.nearExpiryContractDetails || []; listLength = list.length; break;
            default: break;
        }

        if (listLength > 0) {
            setModalType(type);
        } else {
            alert(`Không có dữ liệu cho ${type === 'overdue' ? 'Hóa đơn Quá hạn' : type === 'pending' ? 'Hóa đơn Chờ thanh toán' : type === 'abnormal' ? 'Tiêu thụ Bất thường' : 'Hợp đồng Sắp hết hạn'}.`);
        }
    };
    const closeModal = () => setModalType(null);

    if (!data) return <div className="p-8 text-center text-gray-600 font-medium">Đang tải Dữ liệu Quản lý...</div>;

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
        <div className="p-4 sm:p-8 bg-gray-50 min-h-screen font-sans">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Bảng Tổng Kết Chủ sở hữu</h1>

            {/* 🔔 SECTION 1: CẢNH BÁO VÀ HÀNH ĐỘNG KHẨN CẤP (Đã dồn 5 thẻ vào 1 hàng) */}
            <h2 className="text-xl font-semibold text-red-700 mb-4">🔔 Cảnh báo và Hành động Khẩn cấp</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">

                {/* 1. Tổng tiền Quá hạn TT (Click to Modal) */}
                <DashboardCard
                    title={`⛔ Hóa đơn Quá hạn TT (${data.overdueDetails.length} Hóa đơn)`}
                    value={data.invoiceSummary.overdueAmount}
                    apiEndpoint="/api/v1/invoice/summary/overdue-amount"
                    color="red"
                    onClick={() => openModal('overdue')}
                    isClickable={data.overdueDetails.length > 0}
                />

                {/* 2. Chưa TT Tháng này (Click to Modal) */}
                <DashboardCard
                    title={`⏳ Hóa đơn Chờ TT Tháng này (${data.pendingDetails.length} Hóa đơn)`}
                    value={data.invoiceSummary.currentUnpaidAmount}
                    apiEndpoint="/api/v1/invoice/summary/current-pending"
                    color="yellow"
                    onClick={() => openModal('pending')}
                    isClickable={data.pendingDetails.length > 0}
                />

                {/* 3. Sự cố Đang chờ (Click to Navigate) */}
                <DashboardCard
                    title="🛠️ Sự cố Đang chờ xử lý"
                    value={`${data.pendingIncidents} Sự cố`}
                    apiEndpoint="/api/v1/ticket/owner/summary"
                    color="red"
                    onClick={() => navigate('/owner/ticket')}
                    isClickable={true}
                />

                {/* 4. Phòng gần hết HĐ Thuê (Click to Modal) - 30 ngày */}
                <DashboardCard
                    title={`📄 HĐ Thuê Sắp hết hạn (${data.endContractsCount} Hợp đồng) - 30 ngày`}
                    value={`${data.endContractsCount} Phòng`}
                    apiEndpoint="/api/v1/contract/warning/ending-count"
                    color="red"
                    onClick={() => openModal('contract')}
                    isClickable={data.endContractsCount > 0}
                />

                {/* 5. Tiêu thụ Bất thường (Click to Modal) */}
                <DashboardCard
                    title={`⚡ Tiêu thụ Điện/Nước Bất thường (${data.abnormalReadingCount})`}
                    value={`${data.abnormalReadingCount} Chỉ số`}
                    apiEndpoint="/api/v1/utility-reading/warning/abnormal-count"
                    color="yellow"
                    onClick={() => openModal('abnormal')}
                    isClickable={data.abnormalReadingCount > 0}
                />

            </div>

            {/* 📊 SECTION 2: HIỆU SUẤT VÀ TÀI CHÍNH */}
            <h2 className="text-xl font-semibold text-indigo-700 mb-4">📊 Hiệu suất & Tài chính Tổng quan</h2>

            {/* Hàng 1: Biểu đồ Dòng tiền */}
            <div className="grid grid-cols-1 gap-6 mb-8">
                <RevenueChart
                    data={data.revenueChartData}
                    annualTurnover={data.annualTurnover}
                />
            </div>

            {/* Hàng 2: Hai biểu đồ Pie Chart (Phòng & Doanh thu) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <RoomOccupancyByBuildingPieChart
                    data={data.buildingPerformanceData}
                    totalRooms={data.totalRooms}
                />
                <RevenueByBuildingPieChart
                    data={data.buildingPerformanceData}
                />
            </div>


            {/* Hàng 3: Bảng Hiệu suất */}
            <div className="grid grid-cols-1 gap-6 mb-8">
                <BuildingPerformanceTable
                    data={data.buildingPerformanceData}
                />
            </div>


            {/* MODAL */}
            <Modal title={modalTitle} isOpen={modalType !== null} onClose={closeModal}>
                {modalContent}
            </Modal>
        </div>
    );
};

export default OwnerDashboardPage;