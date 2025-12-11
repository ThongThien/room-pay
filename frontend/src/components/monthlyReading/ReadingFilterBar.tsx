"use client";
import React from "react";
import { ReadingStatus } from "@/types/monthlyReading";

interface ReadingFilterBarProps {
  statusFilter: "ALL" | ReadingStatus;
  setStatusFilter: (status: "ALL" | ReadingStatus) => void;
  selectedHouseName: string;
  setSelectedHouseName: (name: string) => void;
  uniqueHouses: string[];
  selectedMonth: number | "ALL";
  setSelectedMonth: (month: number | "ALL") => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  years: number[];
}

export default function ReadingFilterBar({
  statusFilter,
  setStatusFilter,
  selectedHouseName,
  setSelectedHouseName,
  uniqueHouses,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  years,
}: ReadingFilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm border items-center justify-between">
      {/* Nút lọc trạng thái */}
      <div className="flex bg-gray-100 p-1 rounded-md overflow-x-auto">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            statusFilter === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setStatusFilter("Confirmed")}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            statusFilter === "Confirmed" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Đã nộp
        </button>
        <button
          onClick={() => setStatusFilter("Pending")}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            statusFilter === "Pending" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Chờ nộp
        </button>
        <button
          onClick={() => setStatusFilter("Overdue")}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            statusFilter === "Overdue" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Quá hạn
        </button>
      </div>

      {/* Dropdown lọc Nhà/Tháng/Năm */}
      <div className="flex gap-2">
        <select
          value={selectedHouseName}
          onChange={(e) => setSelectedHouseName(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
        >
          <option value="ALL">Tất cả các Nhà</option>
          {uniqueHouses.map((name, index) => (
            <option key={index} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
          className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="ALL">Cả năm</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              Tháng {m}
            </option>
          ))}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}