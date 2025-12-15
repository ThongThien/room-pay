"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, DashboardCard } from '@/components/dashboard';
import { OwnerDashboardData, OverdueInvoiceListItem, PendingInvoiceListItem, AbnormalReadingListItem, NearExpiryContractListItem, BuildingPerformance } from '@/types/dashboard';
import { fetchOwnerDashboardData } from '@/services/dashboardService';

// Lazy load chart components để cải thiện performance
const RevenueChart = React.lazy(() => import('@/components/dashboard').then(module => ({ default: module.RevenueChart })));

// === MODAL LIST COMPONENTS - IMPROVED DESIGN ===
const OverdueInvoiceList: React.FC<{ data: OverdueInvoiceListItem[] }> = ({ data }) => (
    <div className="space-y-4">
        {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>Không có hóa đơn quá hạn nào</p>
            </div>
        ) : (
            data.map((item) => (
                <div key={item.id} className="bg-red-50 border border-red-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold text-red-700">{item.amount}</span>
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                                    QUÁ HẠN
                                </span>
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                                {item.houseName} - {item.roomNumber}
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                                Khách hàng: {item.tenantName}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Hạn thanh toán</div>
                            <div className="text-sm font-semibold text-gray-800">{item.dueDate}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-red-600">
                            <span className="text-sm">⏰</span>
                            <span className="text-sm font-semibold">Quá {item.overdueDays} ngày</span>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                                Thu tiền
                            </button>
                            <button className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                                Liên hệ
                            </button>
                        </div>
                    </div>
                </div>
            ))
        )}
    </div>
);

const PendingInvoiceList: React.FC<{ data: PendingInvoiceListItem[] }> = ({ data }) => (
    <div className="space-y-4">
        {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>Không có hóa đơn chờ thanh toán</p>
            </div>
        ) : (
            data.map((item) => (
                <div key={item.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:bg-yellow-100 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold text-yellow-700">{item.amount}</span>
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                                    CHỜ TT
                                </span>
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                                {item.roomNumber}
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                                 Khách hàng: {item.tenantName}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Ngày tạo</div>
                            <div className="text-sm font-semibold text-gray-800">{item.invoiceDate}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-yellow-600">
                            <span className="text-sm">⏳</span>
                            <span className="text-sm font-semibold">Chờ thanh toán tháng này</span>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors">
                                Nhắc nhở
                            </button>
                            <button className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                                Liên hệ
                            </button>
                        </div>
                    </div>
                </div>
            ))
        )}
    </div>
);

const NearExpiryContractList: React.FC<{ data: NearExpiryContractListItem[] }> = ({ data }) => (
    <div className="space-y-4">
        {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📄</div>
                <p>Không có hợp đồng sắp hết hạn</p>
            </div>
        ) : (
            data.map((item) => (
                <div key={item.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold text-gray-800">Phòng {item.roomNumber}</span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                    SẮP HẾT HẠN HỢP ĐỒNG
                                </span>
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                                {item.houseName}
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                                Khách hàng: {item.tenantName}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Ngày kết thúc</div>
                            <div className="text-sm font-semibold text-gray-800">{item.endDate}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-blue-600">
                            <span className="text-sm">📅</span>
                            <span className="text-sm font-semibold">Còn {item.remainingDays} ngày</span>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                Gia hạn
                            </button>
                            <button className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                                Liên hệ
                            </button>
                        </div>
                    </div>
                </div>
            ))
        )}
    </div>
);

const AbnormalReadingList: React.FC<{ data: AbnormalReadingListItem[] }> = ({ data }) => (
    <div className="space-y-4">
        {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>Không có chỉ số tiêu thụ bất thường</p>
            </div>
        ) : (
            data.map((item) => (
                <div key={`${item.id}-${item.type}`} className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:bg-orange-100 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold text-gray-800">Phòng {item.roomNumber}</span>
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">
                                    {item.type === 'Electricity' ? 'Điện' : 'Nước'}
                                </span>
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                                {item.houseName} - Khách: {item.tenantName}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Mức tăng</div>
                            <div className="text-lg font-bold text-red-600">+{item.increaseAmount} {item.type === 'Electricity' ? 'kWh điện' : 'm³ nước'}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-orange-600">
                            <span className="text-sm">⚠️</span>
                            <span className="text-sm font-semibold">Tiêu thụ bất thường</span>
                        </div>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors">
                                Kiểm tra
                            </button>
                            <button className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors">
                                Liên hệ
                            </button>
                        </div>
                    </div>
                </div>
            ))
        )}
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

        </div>
    );
};

// Biểu đồ Phân bổ Doanh thu Theo Tòa Nhà
const RevenueByBuildingPieChart: React.FC<{ data: BuildingPerformance[] }> = ({ data }) => {
    const revenueSegments = useMemo(() => {
        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6']; // Emerald, Blue, Amber, Pink, Purple
        
        // Dùng rawRevenue thay vì parse chuỗi
        const segments = data.map(item => ({
            ...item,
            revenueValue: item.rawRevenue || 0, 
        }));

        const totalRevenue = segments.reduce((sum, item) => sum + item.revenueValue, 0);

        return segments.reduce((acc, item, index) => {
            // Nếu tổng = 0 thì gán 0 để tránh lỗi NaN
            const proportion = totalRevenue > 0 ? item.revenueValue / totalRevenue : 0;
            const angle = proportion * 360;
            const startAngle = acc.length > 0 ? acc[acc.length - 1].startAngle + acc[acc.length - 1].angle : 0;

            acc.push({
                ...item,
                proportion,
                angle,
                startAngle,
                color: colors[index % colors.length],
                // Giữ nguyên chuỗi hiển thị cho tooltip/legend
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
        // Format tổng tiền (Triệu VNĐ)
        const totalInMillions = total / 1000000;
        return `${totalInMillions.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} T.VNĐ`;
    }, [revenueSegments]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">💰 Phân bổ Doanh thu Theo Loại</h3>

            <div className="flex flex-col sm:flex-row items-center justify-start h-full">

                {/* Chart */}
                <div className="w-40 h-40 shrink-0 relative mb-4 sm:mb-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        {/* Xử lý trường hợp không có doanh thu */}
                        {revenueSegments.length === 0 || revenueSegments.every(s => s.revenueValue === 0) ? (
                             <circle cx="50" cy="50" r="50" fill="#E5E7EB" /> // Vòng tròn xám nếu 0 tiền
                        ) : (
                            revenueSegments.map((segment) => {
                                const radius = 50;
                                const largeArcFlag = segment.angle > 180 ? 1 : 0;
                                const endX = radius + radius * Math.cos((segment.startAngle + segment.angle) * Math.PI / 180);
                                const endY = radius + radius * Math.sin((segment.startAngle + segment.angle) * Math.PI / 180);
                                const startX = radius + radius * Math.cos(segment.startAngle * Math.PI / 180);
                                const startY = radius + radius * Math.sin(segment.startAngle * Math.PI / 180);

                                // Logic vẽ SVG Arc
                                const d = Math.abs(segment.angle - 360) < 0.01 
                                    ? `M ${radius} ${radius} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0` // Full circle
                                    : [
                                        `M ${radius} ${radius}`,
                                        `L ${startX} ${startY}`,
                                        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                                        `Z`
                                    ].join(' ');

                                return (
                                    <g key={segment.buildingId}>
                                        <title>{`${segment.buildingName}: ${segment.formattedRevenue} (${(segment.proportion * 100).toFixed(1)}%)`}</title>
                                        <path d={d} fill={segment.color} className="hover:opacity-90 transition-opacity" />
                                    </g>
                                );
                            })
                        )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-green-700">
                        {totalRevenueDisplay}
                    </div>
                </div>

                {/* Details */}
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
        </div>
    );
};

// === CUSTOM HOOK FOR PROGRESSIVE LOADING ===
const useProgressiveDashboardData = () => {
    const [data, setData] = useState<OwnerDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [criticalDataLoaded, setCriticalDataLoaded] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Load critical data first (cards, basic info)
                const criticalData = await fetchOwnerDashboardData();
                
                // Set critical data immediately for fast initial render
                setData(criticalData);
                setCriticalDataLoaded(true);
                setLoading(false);
                
                // Optional: Load additional heavy data here if needed
                // For now, all data is loaded at once since it's mostly fake data
                
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return { data, loading, criticalDataLoaded };
};
const DashboardSkeleton: React.FC = () => (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen font-sans">
        <div className="h-8 bg-gray-200 rounded w-80 mb-8 animate-pulse"></div>

        {/* Skeleton cho section cảnh báo */}
        <div className="h-6 bg-gray-200 rounded w-64 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-lg border-l-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
            ))}
        </div>

        {/* Skeleton cho section hiệu suất */}
        <div className="h-6 bg-gray-200 rounded w-72 mb-4 animate-pulse"></div>
        
        {/* Skeleton cho biểu đồ dòng tiền */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
        </div>

        {/* Skeleton cho 2 biểu đồ pie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="flex items-center">
                        <div className="w-40 h-40 bg-gray-100 rounded-full mr-6"></div>
                        <div className="flex-1 space-y-3">
                            {Array.from({ length: 3 }).map((_, j) => (
                                <div key={j} className="h-12 bg-gray-100 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);
const OwnerDashboardPage: React.FC = () => {
    const router = useRouter();
    const { data, loading, criticalDataLoaded } = useProgressiveDashboardData();
    const [modalType, setModalType] = useState<'overdue' | 'pending' | 'abnormal' | 'contract' | null>(null);

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

    if (loading || !criticalDataLoaded || !data) return <DashboardSkeleton />;

    // Lấy dữ liệu cho Modal
    let modalTitle = '';
    let modalContent: React.ReactNode = null;

    switch (modalType) {
        case 'overdue':
            modalTitle = `⛔ ${data.overdueDetails.length} Hóa đơn Quá hạn Thanh toán`;
            modalContent = <OverdueInvoiceList data={data.overdueDetails} />;
            break;
        case 'pending':
            modalTitle = `⏳ ${data.pendingDetails.length} Hóa đơn Chờ thanh toán tháng này`;
            modalContent = <PendingInvoiceList data={data.pendingDetails} />;
            break;
        case 'abnormal':
            modalTitle = `⚡ ${data.abnormalReadingDetails.length} Chỉ số Tiêu thụ Bất thường`;
            modalContent = <AbnormalReadingList data={data.abnormalReadingDetails} />;
            break;
        case 'contract':
            modalTitle = `📄 ${data.nearExpiryContractDetails.length} Hợp đồng Sắp hết hạn (30 ngày)`;
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
                    color="red"
                    onClick={() => openModal('overdue')}
                    isClickable={data.overdueDetails.length > 0}
                />

                {/* 2. Chưa TT Tháng này (Click to Modal) */}
                <DashboardCard
                    title={`⏳ Hóa đơn Chờ TT Tháng này (${data.pendingDetails.length} Hóa đơn)`}
                    value={data.invoiceSummary.currentUnpaidAmount}
                    color="yellow"
                    onClick={() => openModal('pending')}
                    isClickable={data.pendingDetails.length > 0}
                />

                {/* 3. Sự cố Đang chờ (Click to Navigate) */}
                <DashboardCard
                    title="🛠️ Sự cố Đang chờ xử lý"
                    value={`${data.pendingIncidents} Sự cố`}
                    color="red"
                    onClick={() => router.push('/owner/tickets')}
                    isClickable={true}
                />

                {/* 4. Phòng gần hết HĐ Thuê (Click to Modal) - 30 ngày */}
                <DashboardCard
                    title={`📄 HĐ Thuê Sắp hết hạn (${data.endContractsCount} Hợp đồng) - 30 ngày`}
                    value={`${data.endContractsCount} Phòng`}
                    color="red"
                    onClick={() => openModal('contract')}
                    isClickable={data.endContractsCount > 0}
                />

                {/* 5. Tiêu thụ Bất thường (Click to Modal) */}
                <DashboardCard
                    title={`⚡ Tiêu thụ Điện/Nước Bất thường (${data.abnormalReadingCount})`}
                    value={`${data.abnormalReadingCount} Chỉ số`}
                    color="yellow"
                    onClick={() => openModal('abnormal')}
                    isClickable={data.abnormalReadingCount > 0}
                />

            </div>

            {/* 📊 SECTION 2: HIỆU SUẤT VÀ TÀI CHÍNH */}
            <h2 className="text-xl font-semibold text-indigo-700 mb-4">📊 Hiệu suất & Tài chính Tổng quan</h2>

            {/* Hàng 1: Biểu đồ Dòng tiền */}
            <div className="grid grid-cols-1 gap-6 mb-8">
                <Suspense fallback={
                    <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-64 mb-4"></div>
                        <div className="h-64 bg-gray-100 rounded"></div>
                    </div>
                }>
                    <RevenueChart
                        data={data.revenueChartData}
                        annualTurnover={data.annualTurnover}
                    />
                </Suspense>
            </div>

            {/* Hàng 2: Hai biểu đồ Pie Chart (Phòng & Doanh thu) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Suspense fallback={
                    <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                        <div className="flex items-center">
                            <div className="w-40 h-40 bg-gray-100 rounded-full mr-6"></div>
                            <div className="flex-1 space-y-3">
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <div key={j} className="h-12 bg-gray-100 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                }>
                    <RoomOccupancyByBuildingPieChart
                        data={data.buildingPerformanceData}
                        totalRooms={data.totalRooms}
                    />
                </Suspense>
                <Suspense fallback={
                    <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                        <div className="flex items-center">
                            <div className="w-40 h-40 bg-gray-100 rounded-full mr-6"></div>
                            <div className="flex-1 space-y-3">
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <div key={j} className="h-12 bg-gray-100 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                }>
                    <RevenueByBuildingPieChart
                        data={data.buildingPerformanceData}
                    />
                </Suspense>
            </div>


            {/* MODAL */}
            <Modal title={modalTitle} isOpen={modalType !== null} onClose={closeModal}>
                {modalContent}
            </Modal>
        </div>
    );
};

export default OwnerDashboardPage;
