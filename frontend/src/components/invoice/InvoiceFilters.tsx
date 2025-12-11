"use client";

import { useMemo } from "react";

interface InvoiceFiltersProps {
    statusFilter: string;
    setStatusFilter: (status: "ALL" | "UNPAID" | "OVERDUE" | "PAID") => void;
    selectedHouseName: string;
    setSelectedHouseName: (name: string) => void;
    selectedMonth: number | "ALL";
    setSelectedMonth: (month: number | "ALL") => void;
    selectedYear: number;
    setSelectedYear: (year: number) => void;
    uniqueHouses: string[];
    onFilterChange: () => void; // Reset trang về 1 khi lọc
}

export default function InvoiceFilters({
    statusFilter, setStatusFilter,
    selectedHouseName, setSelectedHouseName,
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
    uniqueHouses,
    onFilterChange
}: InvoiceFiltersProps) {

    const years = useMemo(() => {
        return Array.from({ length: 6 }, (_, i) => 2020 + i);
    }, []);

    const handleStatusChange = (status: "ALL" | "UNPAID" | "OVERDUE" | "PAID") => {
        setStatusFilter(status);
        onFilterChange();
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border items-center justify-between">
            {/* Bộ lọc Trạng thái */}
            <div className="flex bg-gray-100 p-1 rounded-md overflow-x-auto">
                {[
                    { key: "ALL", label: "Tất cả", activeClass: "text-gray-900", baseClass: "text-gray-500" },
                    { key: "UNPAID", label: "Chưa thanh toán", activeClass: "text-orange-600", baseClass: "text-gray-500" },
                    { key: "OVERDUE", label: "Quá hạn", activeClass: "text-red-600", baseClass: "text-gray-500" },
                    { key: "PAID", label: "Đã thanh toán", activeClass: "text-green-600", baseClass: "text-gray-500" }
                ].map((item) => (
                    <button
                        key={item.key}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        onClick={() => handleStatusChange(item.key as any)}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                            statusFilter === item.key 
                            ? `bg-white shadow-sm ${item.activeClass}` 
                            : `${item.baseClass} hover:text-gray-700`
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Các Dropdown select */}
            <div className="flex gap-2 flex-wrap md:flex-nowrap">
                <select 
                    value={selectedHouseName} 
                    onChange={(e) => setSelectedHouseName(e.target.value)} 
                    className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
                >
                    <option value="ALL">Tất cả các Nhà</option>
                    {uniqueHouses.map((name, index) => (<option key={index} value={name}>{name}</option>))}
                </select>

                <select
                    value={selectedMonth}
                    onChange={(e) => {
                        setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
                        onFilterChange();
                    }}
                    className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="ALL">Cả năm</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<option key={m} value={m}>Tháng {m}</option>))}
                </select>

                <select
                    value={selectedYear}
                    onChange={(e) => {
                        setSelectedYear(Number(e.target.value));
                        onFilterChange();
                    }}
                    className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    {years.map(y => (<option key={y} value={y}>{y}</option>))}
                </select>
            </div>
        </div>
    );
}