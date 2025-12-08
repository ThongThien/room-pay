"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, DashboardCard, RevenueChart } from '@/components/dashboard';
import { OwnerDashboardData, OverdueInvoiceListItem, PendingInvoiceListItem, AbnormalReadingListItem, NearExpiryContractListItem, BuildingPerformance } from '@/types/dashboard';
import { parseRevenueToNumber } from '@/utils/dashboard';
import { fetchOwnerDashboardData } from '@/services/dashboardService';

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
                <div className="w-40 h-40 shrink-0 relative mb-4 sm:mb-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {houseSegments.map((segment) => {
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
                    {houseSegments.map((item) => (
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
    // Tính toán tổng doanh thu và chuẩn bị dữ liệu cho biểu đồ
    const revenueSegments = useMemo(() => {
        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6']; // Emerald, Blue, Amber, Pink, Purple
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
            <h3 className="text-lg font-semibold mb-4 text-gray-700">💰 Phân bổ Doanh thu Theo Loại</h3>

            <div className="flex flex-col sm:flex-row items-center justify-start h-full">

                {/* Chart: Dùng SVG để vẽ Pie Chart */}
                <div className="w-40 h-40 shrink-0 relative mb-4 sm:mb-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {revenueSegments.map((segment) => {
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
                    {revenueSegments.map((item) => (
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

// === 7. COMPONENT TRANG CHÍNH (Đã Cập nhật cấu trúc) ===
const OwnerDashboardPage: React.FC = () => {
    const router = useRouter();
    const [data, setData] = useState<OwnerDashboardData | null>(null);
    const [modalType, setModalType] = useState<'overdue' | 'pending' | 'abnormal' | 'contract' | null>(null);

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
                    onClick={() => router.push('/owner/ticket')}
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


            {/* MODAL */}
            <Modal title={modalTitle} isOpen={modalType !== null} onClose={closeModal}>
                {modalContent}
            </Modal>
        </div>
    );
};

export default OwnerDashboardPage;