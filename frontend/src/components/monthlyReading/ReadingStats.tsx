"use client";
import React from "react";

interface ReadingStatsProps {
  stats: {
    countConfirmed: number;
    countNotSubmitted: number;
    countOverdue: number;
    totalRooms: number;
  };
  isCurrentMonthView: boolean;
  onRemindAllPending: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function ReadingStats({ stats, isCurrentMonthView, onRemindAllPending }: ReadingStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Đã nộp */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
        <p className="text-gray-500 text-xs uppercase font-semibold">ĐÃ NỘP CHỈ SỐ</p>
        <p className="text-2xl font-bold text-green-600">{stats.countConfirmed}</p>
      </div>

      {/* Card 2: Chưa nộp (Có nút nhắc nhở) */}
      <div
        className={`bg-white p-4 rounded-xl shadow-sm border border-orange-100 cursor-pointer hover:bg-orange-50 transition-colors flex flex-col justify-between ${
          !isCurrentMonthView ? "opacity-70 cursor-not-allowed" : ""
        }`}
        onClick={isCurrentMonthView ? onRemindAllPending : undefined}
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
            ? stats.countNotSubmitted > 0
              ? "Gửi thông báo nhắc nộp"
              : "Tất cả đã nộp"
            : "Chỉ nhắc tháng hiện tại"}
        </button>
      </div>

      {/* Card 3: Tổng số phòng */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
        <p className="text-gray-500 text-xs uppercase font-semibold">TỔNG SỐ PHÒNG (THEO LỌC)</p>
        <p className="text-2xl font-bold text-blue-600">{stats.totalRooms}</p>
      </div>
    </div>
  );
}