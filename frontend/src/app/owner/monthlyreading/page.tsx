"use client";

import React, { useState, useMemo } from "react";

// =========================================================================
// 1. MOCK DATA 
// =========================================================================

// Danh sách Nhà/Tòa nhà (Chỉ dùng cho giao diện select A, B, C)
const MOCK_HOUSES_FOR_UI = [
    { id: 0, name: "Tất cả các Nhà/Tòa" },
    { id: 1, name: "A" },
    { id: 2, name: "B" },
    { id: 3, name: "C" },
];

// Dữ liệu Chỉ số Điện/Nước Giả lập
const mockReadings = [
    { id: 1, houseName: "Nhà trọ An Phú (A)", roomName: "Căn bản 3", floor: 3, tenantName: "Nguyễn Văn A", status: "Submitted", electricCurrent: 1100, waterCurrent: 50, electricPrevious: 1000, waterPrevious: 40 },
    { id: 2, houseName: "Nhà trọ An Phú (A)", roomName: "Căn bản 4", floor: 4, tenantName: "Trần Thị B", status: "Submitted", electricCurrent: 850, waterCurrent: 35, electricPrevious: 800, waterPrevious: 30 },
    { id: 3, houseName: "Nhà trọ An Phú (A)", roomName: "Tiết kiệm 1", floor: 4, tenantName: "Lê Văn C", status: "Submitted", electricCurrent: 980, waterCurrent: 55, electricPrevious: 900, waterPrevious: 50 },
    { id: 4, houseName: "Nhà trọ An Phú (A)", roomName: "Tiết kiệm 2", floor: 5, tenantName: "Phạm Thị D", status: "Submitted", electricCurrent: 1220, waterCurrent: 65, electricPrevious: 1150, waterPrevious: 60 },
    { id: 5, houseName: "Căn hộ Mini Bình Minh (B)", roomName: "Luxury Mini", floor: 1, tenantName: "Hoàng Văn E", status: "Pending", electricCurrent: 750, waterCurrent: 25, electricPrevious: 600, waterPrevious: 20 },
    { id: 6, houseName: "Căn hộ Mini (C)", roomName: "Máy lạnh", floor: 2, tenantName: "Đỗ Thị F", status: "Submitted", electricCurrent: 630, waterCurrent: 45, electricPrevious: 590, waterPrevious: 40 },
];

// Hàm lấy tên nhà (để hiển thị trong header)
const getHouseName = (houseId: number | string) => {
    const id = Number(houseId);
    return MOCK_HOUSES_FOR_UI.find(h => h.id === id)?.name || "Tất cả các Nhà/Tòa";
};


// =========================================================================
// 2. COMPONENT MODAL CHI TIẾT ĐIỆN NƯỚC
// =========================================================================
// Định nghĩa kiểu dữ liệu UtilityReading (nếu nó chưa được định nghĩa ở đầu file)
interface UtilityReading {
    id: number;
    houseName: string;
    roomName: string;
    floor: number;
    tenantName: string;
    status: string;
    electricCurrent: number;
    waterCurrent: number;
    electricPrevious: number;
    waterPrevious: number;
}

// Sửa lại dòng useState:


interface IReading {
    id: number;
    houseName: string;
    roomName: string;
    floor: number;
    tenantName: string;
    status: string;
    electricCurrent: number;
    waterCurrent: number;
    electricPrevious: number;
    waterPrevious: number;
}

const UtilityReadingDetailModal = ({ reading, onClose }: { reading: IReading | null; onClose: () => void }) => {
    if (!reading) return null;

    // Xử lý tên phòng để hiển thị gọn gàng (ví dụ: Căn bản 3 -> Căn bản 3)
    const simpleRoomName = reading.roomName.includes(' ')
        ? reading.roomName.split(' ').slice(0).join(' ') || reading.roomName
        : reading.roomName;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                        Chi tiết Điện/Nước - {simpleRoomName}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-light">
                        &times;
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">

                        {/* Tháng Trước */}
                        <div className="p-4 border-2 border-gray-200 rounded-lg">
                            <h4 className="font-bold text-gray-600 mb-3 text-sm border-b border-gray-300 pb-1">THÁNG TRƯỚC</h4>
                            <div className="space-y-2">
                                <p className="text-sm flex items-center justify-between">
                                    <span className="font-medium text-amber-500">⚡ Điện:</span>
                                    <span className="font-bold text-gray-800">{reading.electricPrevious}</span>
                                    <button className="text-blue-500 text-xs hover:underline">Xem ảnh</button>
                                </p>
                                <p className="text-sm flex items-center justify-between">
                                    <span className="font-medium text-blue-500">💧 Nước:</span>
                                    <span className="font-bold text-gray-800">{reading.waterPrevious}</span>
                                    <button className="text-blue-500 text-xs hover:underline">Xem ảnh</button>
                                </p>
                            </div>
                        </div>

                        {/* Tháng Này */}
                        <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                            <h4 className="font-bold text-blue-600 mb-3 text-sm border-b border-blue-300 pb-1">THÁNG NÀY</h4>
                            <div className="space-y-2">
                                <p className="text-sm flex items-center justify-between">
                                    <span className="font-medium text-amber-600">⚡ Điện:</span>
                                    <span className="font-bold text-blue-800">{reading.electricCurrent}</span>
                                    <button className="text-blue-700 text-xs hover:underline">Xem ảnh</button>
                                </p>
                                <p className="text-sm flex items-center justify-between">
                                    <span className="font-medium text-blue-700">💧 Nước:</span>
                                    <span className="font-bold text-blue-800">{reading.waterCurrent}</span>
                                    <button className="text-blue-700 text-xs hover:underline">Xem ảnh</button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer (Tính toán chi phí sử dụng) */}
                <div className="mt-6 pt-4 border-t text-sm">
                    <p className="flex justify-between font-medium">
                        <span>Lượng Điện tiêu thụ:</span>
                        <span className="font-bold text-gray-800">
                            {reading.electricCurrent - reading.electricPrevious} kWh
                        </span>
                    </p>
                    <p className="flex justify-between font-medium mt-1">
                        <span>Lượng Nước tiêu thụ:</span>
                        <span className="font-bold text-gray-800">
                            {reading.waterCurrent - reading.waterPrevious} m³
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};


// =========================================================================
// 3. COMPONENT CHÍNH: TRANG QUẢN LÝ CHỈ SỐ ĐIỆN NƯỚC
// =========================================================================

export default function OwnerUtilitiesPage() {
    // State dữ liệu và lọc
    const [readings] = useState(mockReadings);
    const [loading] = useState(false);

    // Filter Status: Đã nộp / Chưa nộp
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Filter Date: Tháng/Năm (Có thể giữ nguyên logic lọc nếu muốn, nhưng dữ liệu mock không có ngày)
    const [selectedMonth, setSelectedMonth] = useState<number | string>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Filter Nhà (House)
    const [selectedHouseId, setSelectedHouseId] = useState(0);

    const [selectedReading, setSelectedReading] = useState<UtilityReading | null>(null);

    // LOGIC LỌC DỮ LIỆU
    const filteredReadings = useMemo(() => {
        return readings.filter(reading => {
            // 1. Lọc theo trạng thái
            let matchStatus = true;
            if (statusFilter === "Pending") matchStatus = reading.status === "Pending";
            if (statusFilter === "Submitted") matchStatus = reading.status === "Submitted";

            // 2. Lọc theo Nhà (Demo)
            let matchHouse = selectedHouseId === 0;
            if (selectedHouseId !== 0) {
                const houseNameFilter = getHouseName(selectedHouseId);
                if (houseNameFilter !== "Tất cả các Nhà/Tòa") {
                    matchHouse = reading.houseName.includes(`(${houseNameFilter})`);
                }
            }

            return matchStatus && matchHouse;
        });
    }, [readings, statusFilter, selectedHouseId]);

    // TÍNH TOÁN THỐNG KÊ (Đếm số lượng)
    const stats = useMemo(() => {
        return {
            countSubmitted: filteredReadings.filter(i => i.status === "Submitted").length,
            countPending: filteredReadings.filter(i => i.status === "Pending").length,
            totalRooms: filteredReadings.length
        };
    }, [filteredReadings]);

    // Xử lý Hành động "Gửi thông báo nhắc nộp ảnh" cho TẤT CẢ các phòng CHƯA NỘP
    const handleRemindAllPending = (e: React.MouseEvent<HTMLDivElement>) => {
        // Ngăn chặn sự kiện click lan truyền nếu cần
        e.stopPropagation();

        const pendingRooms = filteredReadings.filter(r => r.status === "Pending");
        if (pendingRooms.length === 0) {
            alert("Không có phòng nào cần gửi thông báo nhắc nộp chỉ số.");
            return;
        }

        const roomNames = pendingRooms.map(r => r.roomName).join(', ');
        const confirmSend = window.confirm(`Xác nhận gửi thông báo nhắc nộp ảnh đến ${pendingRooms.length} phòng: ${roomNames}?`);

        if (confirmSend) {
            // Logic gửi API nhắc nộp sẽ nằm ở đây
            alert(`ĐÃ GỬI MÔ PHỎNG: Thông báo nhắc nộp ảnh đã được gửi đến ${pendingRooms.length} phòng.`);
        }
    }

    return (
        <div className="space-y-6 p-6 bg-gray-50 min-h-screen text-gray-800">
            {/* Header & Stats Cards */}
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Quản lý Chỉ số Điện Nước</h2>
                        <p className="text-gray-500 text-sm">
                            Thống kê chỉ số tháng {selectedMonth === "ALL" ? "Tất cả" : selectedMonth}/{selectedYear} {selectedHouseId !== 0 ? `tại Nhà ${getHouseName(selectedHouseId)}` : ""}
                        </p>
                    </div>
                </div>

                {/* Thống kê nhanh */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* PHÒNG ĐÃ NỘP */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <p className="text-gray-500 text-xs uppercase font-semibold">PHÒNG ĐÃ NỘP CHỈ SỐ</p>
                        <p className="text-2xl font-bold text-green-600">{stats.countSubmitted}</p>
                    </div>

                    {/* PHÒNG CHƯA NỘP (Tích hợp nút Nhắc nộp) */}
                    <div
                        className="bg-white p-4 rounded-xl shadow-sm border border-red-100 cursor-pointer hover:bg-red-50 transition-colors flex flex-col justify-between"
                        // Gắn sự kiện click vào card
                        onClick={handleRemindAllPending}
                    >
                        <div>
                            <p className="text-gray-500 text-xs uppercase font-semibold">PHÒNG CHƯA NỘP CHỈ SỐ</p>
                            <p className="text-2xl font-bold text-red-600">{stats.countPending}</p>
                        </div>
                        {/* Nút nhắc nộp hiển thị rõ ràng */}
                        <button
                            className="mt-2 text-red-600 text-xs font-semibold underline disabled:no-underline disabled:text-gray-400"
                            disabled={stats.countPending === 0}
                        >
                            {stats.countPending > 0 ? "Gửi thông báo nhắc nộp ảnh" : "Tất cả đã nộp"}
                        </button>
                    </div>

                    {/* TỔNG SỐ PHÒNG */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                        <p className="text-gray-500 text-xs uppercase font-semibold">TỔNG SỐ PHÒNG ĐANG QUẢN LÝ</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalRooms}</p>
                    </div>
                </div>
            </div>

            {/* --- THANH CÔNG CỤ BỘ LỌC --- */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border items-center justify-between">

                {/* Bộ lọc Trạng thái */}
                <div className="flex bg-gray-100 p-1 rounded-md">
                    <button
                        onClick={() => setStatusFilter("ALL")}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setStatusFilter("Submitted")}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "Submitted" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Đã nộp
                    </button>
                    <button
                        onClick={() => setStatusFilter("Pending")}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${statusFilter === "Pending" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Chưa nộp
                    </button>
                </div>

                {/* Bộ lọc Nhà và Thời gian */}
                <div className="flex gap-2">
                    {/* BỘ LỌC NHÀ (A, B, C) */}
                    <select
                        value={selectedHouseId}
                        onChange={(e) => setSelectedHouseId(Number(e.target.value))}
                        className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {MOCK_HOUSES_FOR_UI.map(house => (
                            <option key={house.id} value={house.id}>{house.name}</option>
                        ))}
                    </select>

                    {/* Bộ lọc Tháng */}
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                        className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="ALL">Cả năm</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Tháng {m}</option>
                        ))}
                    </select>

                    {/* Bộ lọc Năm */}
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                </div>
            </div>

            {/* Bảng danh sách Chỉ số Điện Nước */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
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
                                    <th className="p-4 border-b w-2/12">NGƯỜI THUÊ</th>
                                    <th className="p-4 border-b w-1/12 text-center">TRẠNG THÁI</th>
                                    <th className="p-4 border-b w-2/12 text-center">HÀNH ĐỘNG</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {filteredReadings.length > 0 ? filteredReadings.map((reading, index) => (
                                    <tr
                                        key={reading.id}
                                        className="hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="p-4 font-mono text-gray-500">{index + 1}</td>
                                        <td className="p-4 text-gray-600">{reading.houseName.split(' ')[0] || reading.houseName}</td>
                                        <td className="p-4 font-medium text-blue-600">{reading.roomName}</td>
                                        <td className="p-4 text-gray-600">{reading.floor}</td>
                                        <td className="p-4 text-gray-900">{reading.tenantName}</td>

                                        {/* TRẠNG THÁI */}
                                        <td className="p-4 text-center">
                                            {reading.status === "Submitted" ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Đã nộp
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Chưa nộp
                                                </span>
                                            )}
                                        </td>

                                        {/* HÀNH ĐỘNG */}
                                        <td className="p-4 text-center">
                                            {reading.status === "Submitted" ? (
                                                <button
                                                    onClick={() => setSelectedReading(reading)}
                                                    className="text-blue-600 text-xs font-semibold hover:text-blue-800 transition"
                                                >
                                                    Xem chi tiết
                                                </button>
                                            ) : (
                                                // Bỏ trống nếu trạng thái là "Chưa nộp"
                                                <span className="text-xs text-gray-400 italic"></span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="p-10 text-center text-gray-400">
                                            Không tìm thấy chỉ số điện nước nào phù hợp với bộ lọc.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Chi tiết Chỉ số Điện Nước */}
            {selectedReading && (
                <UtilityReadingDetailModal
                    reading={selectedReading}
                    onClose={() => setSelectedReading(null)}
                />
            )}
        </div>
    );
}