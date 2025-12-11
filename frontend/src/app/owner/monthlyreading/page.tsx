"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MonthlyReading, ReadingStatus } from "@/types/monthlyReading";
import { getAllMonthlyReadings } from "@/services/monthlyReadingService";
import UtilityReadingDetailModal from "@/components/monthlyReading/UtilityReadingDetailModal";

export default function OwnerUtilitiesPage() {
    const [readings, setReadings] = useState<MonthlyReading[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"ALL" | ReadingStatus>("ALL");
    
    // State thời gian
    const [selectedMonth, setSelectedMonth] = useState<number | "ALL">(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    
    const [selectedHouseName, setSelectedHouseName] = useState<string>("ALL");
    const [selectedReading, setSelectedReading] = useState<MonthlyReading | null>(null);

    // --- LOGIC: TẠO DANH SÁCH NĂM ĐỘNG ---
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = 2020;
        const endYear = currentYear + 5;
        const list = [];
        for (let y = startYear; y <= endYear; y++) {
            list.push(y);
        }
        return list;
    }, []);

    // --- Helper: Tính toán trạng thái (Confirmed / Pending / Overdue) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculateStatus = (item: any): ReadingStatus => {
        // 1. Đã nộp
        if (item.status === 1 || item.status === "Confirmed" || item.status === "confirmed") {
            return "Confirmed";
        }

        // 2. Tính toán Quá hạn
        const readingDate = new Date(item.createdAt || item.CreatedAt);
        const rMonth = readingDate.getMonth() + 1;
        const rYear = readingDate.getFullYear();

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const currentDay = now.getDate();
        const DEADLINE_DAY = 20; // Hạn nộp là ngày 20 hàng tháng

        // Nếu năm cũ -> Quá hạn
        if (rYear < currentYear) return "Overdue";
        // Nếu năm nay nhưng tháng cũ -> Quá hạn
        if (rYear === currentYear && rMonth < currentMonth) return "Overdue";
        // Nếu cùng tháng hiện tại nhưng đã qua ngày deadline -> Quá hạn
        if (rYear === currentYear && rMonth === currentMonth && currentDay > DEADLINE_DAY) return "Overdue";

        // 3. Còn lại -> Chờ nộp (Pending)
        return "Pending";
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawData: any[] = await getAllMonthlyReadings();
                
                const mappedData: MonthlyReading[] = rawData.map((item) => ({
                    id: item.id || item.Id,
                    cycleId: item.cycleId || item.CycleId,
                    houseName: item.houseName || item.HouseName,
                    roomName: item.roomName || item.RoomName,
                    floor: item.floor || item.Floor,
                    tenantName: item.tenantName || item.TenantName,
                    tenantContractId: item.tenantContractId || item.TenantContractId,
                    
                    status: calculateStatus(item), 
                    
                    electricOld: item.electricOld || item.ElectricOld || 0,
                    electricNew: item.electricNew || item.ElectricNew || 0,
                    electricPhotoUrl: item.electricPhotoUrl || item.ElectricPhotoUrl,
                    waterOld: item.waterOld || item.WaterOld || 0,
                    waterNew: item.waterNew || item.WaterNew || 0,
                    waterPhotoUrl: item.waterPhotoUrl || item.WaterPhotoUrl,
                    createdAt: item.createdAt || item.CreatedAt,
                    updatedAt: item.updatedAt || item.UpdatedAt,
                }));

                setReadings(mappedData);
            } catch (error) {
                console.error("Lỗi tải chỉ số từ API:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const uniqueHouses = useMemo(() => {
        const allHouseNames = readings.map(r => r.houseName).filter((name): name is string => !!name);
        return Array.from(new Set(allHouseNames)).sort();
    }, [readings]);

    const filteredReadings = useMemo(() => {
        return readings.filter(reading => {
            let matchStatus = true;
            if (statusFilter !== "ALL") matchStatus = reading.status === statusFilter;

            const matchHouse = selectedHouseName === "ALL" || reading.houseName === selectedHouseName;

            let matchDate = true;
            if (reading.createdAt) {
                const date = new Date(reading.createdAt);
                const rMonth = date.getMonth() + 1;
                const rYear = date.getFullYear();
                
                const matchMonth = selectedMonth === "ALL" || rMonth === Number(selectedMonth);
                const matchYear = rYear === Number(selectedYear);
                
                matchDate = matchMonth && matchYear;
            }
            return matchStatus && matchHouse && matchDate;
        });
    }, [readings, statusFilter, selectedHouseName, selectedMonth, selectedYear]);

    const stats = useMemo(() => {
        return {
            countConfirmed: filteredReadings.filter(i => i.status === "Confirmed").length,
            // Đếm tổng số chưa hoàn thành (Pending + Overdue) để hiển thị ở card
            countNotSubmitted: filteredReadings.filter(i => i.status === "Pending" || i.status === "Overdue").length,
            countOverdue: filteredReadings.filter(i => i.status === "Overdue").length,
            totalRooms: filteredReadings.length
        };
    }, [filteredReadings]);

    // --- Kiểm tra có phải tháng hiện tại không ---
    const isCurrentMonthView = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        return Number(selectedMonth) === currentMonth && Number(selectedYear) === currentYear;
    }, [selectedMonth, selectedYear]);

    // --- Xử lý nhắc nhở ---
    const handleRemindAllPending = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        
        // Chặn nếu không phải tháng hiện tại
        if (!isCurrentMonthView) {
            alert("Bạn chỉ có thể gửi nhắc nhở cho kỳ thu tiền hiện tại.");
            return;
        }

        // Lấy danh sách chưa nộp (Pending + Overdue)
        const recipients = filteredReadings.filter(r => r.status === "Pending" || r.status === "Overdue");
        if (recipients.length === 0) return;

        if (window.confirm(`Gửi thông báo nhắc nộp ảnh đến ${recipients.length} phòng chưa nộp (bao gồm cả quá hạn)?`)) {
            alert(`Giả lập: Đã gửi thông báo đến ${recipients.length} phòng.`);
        }
    }

    return (
        <div className="space-y-6 p-6 bg-gray-50 min-h-screen text-gray-800">
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Quản lý Chỉ số Điện Nước</h2>
                        <p className="text-gray-500 text-sm">Thống kê tháng {selectedMonth === "ALL" ? "Tất cả" : selectedMonth}/{selectedYear}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <p className="text-gray-500 text-xs uppercase font-semibold">ĐÃ NỘP CHỈ SỐ</p>
                        <p className="text-2xl font-bold text-green-600">{stats.countConfirmed}</p>
                    </div>
                    
                    <div 
                        className={`bg-white p-4 rounded-xl shadow-sm border border-orange-100 cursor-pointer hover:bg-orange-50 transition-colors flex flex-col justify-between ${!isCurrentMonthView ? 'opacity-70 cursor-not-allowed' : ''}`} 
                        onClick={isCurrentMonthView ? handleRemindAllPending : undefined}
                    >
                        <div>
                            <p className="text-gray-500 text-xs uppercase font-semibold">CHƯA NỘP CHỈ SỐ</p>
                            <div className="flex items-end gap-2">
                                <p className="text-2xl font-bold text-orange-600">{stats.countNotSubmitted}</p>
                                {stats.countOverdue > 0 && (
                                    <span className="text-xs text-red-500 font-bold mb-1">({stats.countOverdue} quá hạn)</span>
                                )}
                            </div>
                        </div>
                        <button 
                            className="mt-2 text-orange-600 text-xs font-semibold underline disabled:no-underline disabled:text-gray-400 text-left" 
                            disabled={!isCurrentMonthView || stats.countNotSubmitted === 0}
                        >
                            {isCurrentMonthView 
                                ? (stats.countNotSubmitted > 0 ? "Gửi thông báo nhắc nộp" : "Tất cả đã nộp") 
                                : "Chỉ nhắc tháng hiện tại"}
                        </button>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                        <p className="text-gray-500 text-xs uppercase font-semibold">TỔNG SỐ PHÒNG (THEO LỌC)</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalRooms}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border items-center justify-between">
                <div className="flex bg-gray-100 p-1 rounded-md overflow-x-auto">
                    <button onClick={() => setStatusFilter("ALL")} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Tất cả</button>
                    <button onClick={() => setStatusFilter("Confirmed")} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "Confirmed" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Đã nộp</button>
                    <button onClick={() => setStatusFilter("Pending")} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "Pending" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Chờ nộp</button>
                    <button onClick={() => setStatusFilter("Overdue")} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "Overdue" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Quá hạn</button>
                </div>
                <div className="flex gap-2">
                    <select value={selectedHouseName} onChange={(e) => setSelectedHouseName(e.target.value)} className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]">
                        <option value="ALL">Tất cả các Nhà</option>
                        {uniqueHouses.map((name, index) => (<option key={index} value={name}>{name}</option>))}
                    </select>
                    
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))} className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="ALL">Cả năm</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>Tháng {m}</option>))}
                    </select>

                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="p-4 border-b w-1/12">STT</th>
                                    <th className="p-4 border-b w-2/12">NHÀ</th>
                                    <th className="p-4 border-b w-2/12">PHÒNG</th>
                                    <th className="p-4 border-b w-1/12">TẦNG</th>
                                    <th className="p-4 border-b w-2/12">KHÁCH THUÊ</th>
                                    <th className="p-4 border-b w-2/12 text-center">CHỈ SỐ (MỚI)</th>
                                    <th className="p-4 border-b w-1/12 text-center">TRẠNG THÁI</th>
                                    <th className="p-4 border-b w-1/12 text-center">HÀNH ĐỘNG</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {filteredReadings.length > 0 ? filteredReadings.map((reading, index) => (
                                    <tr key={reading.id} className="hover:bg-gray-50 transition-colors" onClick={() => { if (reading.status === "Confirmed") setSelectedReading(reading); }} style={{ cursor: reading.status === "Confirmed" ? "pointer" : "default" }}>
                                        <td className="p-4 font-mono text-gray-500">{index + 1}</td>
                                        <td className="p-4 text-gray-600">{reading.houseName || "Chưa cập nhật"}</td>
                                        <td className="p-4 font-medium text-blue-600">{reading.roomName || "N/A"}</td>
                                        <td className="p-4 text-gray-600">{reading.floor}</td>
                                        <td className="p-4 text-gray-900">{reading.tenantName || "Trống"}</td>
                                        
                                        <td className="p-4 text-center text-xs">
                                            {reading.status === 'Confirmed' ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-amber-600 font-semibold">Điện: {reading.electricNew}</span>
                                                    <span className="text-blue-600 font-semibold">Nước: {reading.waterNew}</span>
                                                </div>
                                            ) : <span className="text-gray-400">-</span>}
                                        </td>

                                        <td className="p-4 text-center">
                                            {reading.status === "Confirmed" && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">Đã nộp</span>
                                            )}
                                            {reading.status === "Pending" && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap">Chờ nộp</span>
                                            )}
                                            {reading.status === "Overdue" && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">Quá hạn</span>
                                            )}
                                        </td>

                                        <td className="p-4 text-center">
                                            {reading.status === "Confirmed" && (
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedReading(reading); }} className="text-blue-600 text-xs font-semibold hover:text-blue-800 transition whitespace-nowrap">Chi tiết</button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={8} className="p-10 text-center text-gray-400">Không tìm thấy chỉ số điện nước nào phù hợp.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedReading && <UtilityReadingDetailModal reading={selectedReading} onClose={() => setSelectedReading(null)} />}
        </div>
    );
}