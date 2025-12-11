"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MonthlyReading } from "@/types/monthlyReading";
import { getAllMonthlyReadings } from "@/services/monthlyReadingService";
import TenantReadingDetailModal from "@/components/monthlyReading/TenantReadingDetailModal";

export default function TenantReadingHistoryPage() {
    const router = useRouter();
    const [readings, setReadings] = useState<MonthlyReading[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"ALL" | "Confirmed" | "Pending">("ALL");
    const [selectedReading, setSelectedReading] = useState<MonthlyReading | null>(null);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getAllMonthlyReadings();
                
                // Map dữ liệu thô sang format chuẩn
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mappedData = data.map((item: any) => ({
                    ...item,
                    status: item.status === 1 || item.status === "Confirmed" ? "Confirmed" : "Pending",
                    electricNew: item.electricNew ?? item.ElectricNew,
                    waterNew: item.waterNew ?? item.WaterNew,
                    createdAt: item.createdAt ?? item.CreatedAt
                }));

                // LOGIC MỚI: GỘP TRÙNG LẶP THEO THÁNG
                const uniqueMap = new Map();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mappedData.forEach((item: any) => {
                    // Tạo Key dựa trên Tháng và Năm (VD: "12-2025")
                    const date = new Date(item.createdAt);
                    const key = `${date.getMonth() + 1}-${date.getFullYear()}`;

                    if (!uniqueMap.has(key)) {
                        // Nếu chưa có tháng này -> Thêm vào
                        uniqueMap.set(key, item);
                    } else {
                        // Nếu đã có, so sánh để lấy cái đúng nhất
                        const existingItem = uniqueMap.get(key);

                        // Ưu tiên 1: Lấy cái đã "Confirmed" (Đã chốt)
                        if (item.status === 'Confirmed' && existingItem.status !== 'Confirmed') {
                            uniqueMap.set(key, item);
                        }
                        // Ưu tiên 2: Nếu cùng trạng thái, lấy cái mới nhất (createdAt lớn hơn)
                        else if (item.status === existingItem.status && new Date(item.createdAt) > new Date(existingItem.createdAt)) {
                            uniqueMap.set(key, item);
                        }
                    }
                });

                // Chuyển Map ngược lại thành Array và sắp xếp mới nhất lên đầu
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const finalData = Array.from(uniqueMap.values()).sort((a: any, b: any) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                setReadings(finalData);
            } catch (error) {
                console.error("Lỗi tải lịch sử chỉ số:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- FILTER ---
    const filteredReadings = useMemo(() => {
        return readings.filter(r => {
            if (filter === "ALL") return true;
            return r.status === filter;
        });
    }, [readings, filter]);

    // --- HELPER: Lấy tháng/năm hiển thị ---
    const getMonthYear = (dateString: string) => {
        const date = new Date(dateString);
        return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
    };

    // LOGIC: KIỂM TRA THÁNG CŨ
    // Trả về TRUE nếu kỳ này thuộc về tháng trước (hoặc xa hơn) so với hiện tại
    const isPastMonth = (dateString: string) => {
        const createdDate = new Date(dateString);
        const now = new Date();

        // So sánh tuyệt đối theo (Năm * 12 + Tháng) để chính xác
        const createdMonthAbs = createdDate.getFullYear() * 12 + createdDate.getMonth();
        const currentMonthAbs = now.getFullYear() * 12 + now.getMonth();

        // Nếu tháng tạo < tháng hiện tại -> Là tháng cũ
        return createdMonthAbs < currentMonthAbs;
    };

    // --- ACTION: Chuyển trang nộp ---
    const handleNavigateSubmit = (cycleId: number) => {
        router.push(`/tenant/submit?cycleId=${cycleId}`);
    };

    return (
        <div className="space-y-6 p-6"> 
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Lịch sử Điện Nước</h2>
                    <p className="text-gray-500 text-sm">Theo dõi và nộp chỉ số tiêu thụ hàng tháng</p>
                </div>

                {/* Bộ lọc */}
                <div className="flex bg-white p-1 rounded-lg shadow-sm border overflow-x-auto">
                    <button 
                        onClick={() => setFilter("ALL")} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "ALL" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        Tất cả
                    </button>
                    <button 
                        onClick={() => setFilter("Pending")} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "Pending" ? "bg-red-100 text-red-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        Chưa nộp
                    </button>
                    <button 
                        onClick={() => setFilter("Confirmed")} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filter === "Confirmed" ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-50"}`}
                    >
                        Đã chốt
                    </button>
                </div>
            </div>

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
                                    <th className="p-4 border-b">Kỳ Ghi</th>
                                    <th className="p-4 border-b">Ngày tạo</th>
                                    <th className="p-4 border-b text-center">Điện (Mới)</th>
                                    <th className="p-4 border-b text-center">Nước (Mới)</th>
                                    <th className="p-4 border-b text-center">Trạng thái</th>
                                    <th className="p-4 border-b text-center">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {filteredReadings.length > 0 ? filteredReadings.map((item) => {
                                    const isExpired = isPastMonth(item.createdAt);

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">
                                                {getMonthYear(item.createdAt)}
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                                            </td>
                                            
                                            {/* Chỉ số */}
                                            <td className="p-4 text-center font-mono">
                                                {item.status === 'Confirmed' ? (
                                                    <span className="text-amber-600 font-bold">{item.electricNew}</span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-mono">
                                                {item.status === 'Confirmed' ? (
                                                    <span className="text-blue-600 font-bold">{item.waterNew}</span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>

                                            {/* Trạng thái */}
                                            <td className="p-4 text-center">
                                                {item.status === "Confirmed" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Đã chốt
                                                    </span>
                                                ) : (
                                                    // Nếu chưa nộp: Kiểm tra xem có phải tháng cũ không
                                                    isExpired ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                            Hết hạn
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            Cần nộp
                                                        </span>
                                                    )
                                                )}
                                            </td>

                                            {/* Hành động */}
                                            <td className="p-4 text-center">
                                                {item.status === "Confirmed" ? (
                                                    <button 
                                                        onClick={() => setSelectedReading(item)}
                                                        className="text-gray-600 hover:text-blue-600 font-medium text-xs border border-gray-200 hover:border-blue-300 px-3 py-1 rounded transition"
                                                    >
                                                        Chi tiết
                                                    </button>
                                                ) : (
                                                    // Logic cho Pending
                                                    isExpired ? (
                                                        // Nếu quá hạn -> Không cho click, hiện text xám
                                                        <span className="text-xs text-gray-400 italic cursor-not-allowed">
                                                            Đã đóng
                                                        </span>
                                                    ) : (
                                                        // Nếu đúng tháng hiện tại -> Nút Nộp ngay
                                                        <button 
                                                            onClick={() => handleNavigateSubmit(item.cycleId)}
                                                            className="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
                                                        >
                                                            Nộp ngay
                                                        </button>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="p-10 text-center text-gray-400">
                                            Chưa có dữ liệu ghi chỉ số nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Chi tiết */}
            {selectedReading && (
                <TenantReadingDetailModal 
                    reading={selectedReading} 
                    onClose={() => setSelectedReading(null)} 
                />
            )}
        </div>
    );
}