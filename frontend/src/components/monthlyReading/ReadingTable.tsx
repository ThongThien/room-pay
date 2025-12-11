"use client";
import React from "react";
import { MonthlyReading } from "@/types/monthlyReading";

interface ReadingTableProps {
  loading: boolean;
  readings: MonthlyReading[];
  onSelectReading: (reading: MonthlyReading) => void;
}

export default function ReadingTable({ loading, readings, onSelectReading }: ReadingTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
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
            {readings.length > 0 ? (
              readings.map((reading, index) => (
                <tr
                  key={reading.id}
                  className="hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    if (reading.status === "Confirmed") onSelectReading(reading);
                  }}
                  style={{ cursor: reading.status === "Confirmed" ? "pointer" : "default" }}
                >
                  <td className="p-4 font-mono text-gray-500">{index + 1}</td>
                  <td className="p-4 text-gray-600">{reading.houseName || "Chưa cập nhật"}</td>
                  <td className="p-4 font-medium text-blue-600">{reading.roomName || "N/A"}</td>
                  <td className="p-4 text-gray-600">{reading.floor}</td>
                  <td className="p-4 text-gray-900">{reading.tenantName || "Trống"}</td>

                  <td className="p-4 text-center text-xs">
                    {reading.status === "Confirmed" ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-amber-600 font-semibold">Điện: {reading.electricNew}</span>
                        <span className="text-blue-600 font-semibold">Nước: {reading.waterNew}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="p-4 text-center">
                    {reading.status === "Confirmed" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                        Đã nộp
                      </span>
                    )}
                    {reading.status === "Pending" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap">
                        Chờ nộp
                      </span>
                    )}
                    {reading.status === "Overdue" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                        Quá hạn
                      </span>
                    )}
                  </td>

                  <td className="p-4 text-center">
                    {reading.status === "Confirmed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReading(reading);
                        }}
                        className="text-blue-600 text-xs font-semibold hover:text-blue-800 transition whitespace-nowrap"
                      >
                        Chi tiết
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-10 text-center text-gray-400">
                  Không tìm thấy chỉ số điện nước nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}