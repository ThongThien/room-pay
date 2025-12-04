"use client";

import { useEffect, useState } from "react";
import { getMyContracts } from "@/services/contractService";
import { Contract, getStatusInfo } from "@/types/contract";
// import ContractDetailModal from "@/components/contract/ContractDetailModal"; // Tạm ẩn Modal nếu muốn mở thẳng PDF

export default function TenantContractsPage() {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    const formatDate = (dateString?: string) => {
        if (!dateString) return "---";
        return new Date(dateString).toLocaleDateString("vi-VN");
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getMyContracts();
                setContracts(data);
            } catch (error) {
                console.error("Failed to load contracts", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Danh sách Hợp đồng</h2>
                    <p className="text-gray-500 text-sm">Quản lý và theo dõi các hợp đồng thuê phòng của bạn</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
            ) : contracts.length === 0 ? (
                <div className="bg-white p-10 rounded-lg shadow text-center border border-gray-100">
                    <div className="text-gray-300 mb-4 text-6xl">📄</div>
                    <p className="text-gray-600 font-medium text-lg">Bạn chưa có hợp đồng thuê nào.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                    {/* GIAO DIỆN BẢNG */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Mã HĐ
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Phòng
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Thời hạn
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Giá thuê
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Trạng thái
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Hành động
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {contracts.map((contract) => {
                                    const statusInfo = getStatusInfo(contract.status as number);
                                    
                                    return (
                                        <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                                            {/* Cột 1: Mã HĐ */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-mono font-bold text-gray-700">#{contract.id}</span>
                                            </td>

                                            {/* Cột 2: Phòng */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-blue-600">
                                                    Phòng {contract.roomId}
                                                </div>
                                                <div className="text-xs text-gray-400">Tầng 2</div>
                                            </td>

                                            {/* Cột 3: Thời hạn */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{formatDate(contract.startDate)}</div>
                                                <div className="text-xs text-gray-500">đến {formatDate(contract.endDate)}</div>
                                            </td>

                                            {/* Cột 4: Giá */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-800">
                                                    {formatCurrency(contract.price)}
                                                </div>
                                            </td>

                                            {/* Cột 5: Trạng thái */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>

                                            {/* Cột 6: Hành động (Nút xem PDF) */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {contract.fileUrl ? (
                                                    <a 
                                                        href={contract.fileUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md text-xs inline-flex items-center gap-1 transition-colors"
                                                    >
                                                        Xem Hợp đồng
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-xs italic">Chưa có file</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}