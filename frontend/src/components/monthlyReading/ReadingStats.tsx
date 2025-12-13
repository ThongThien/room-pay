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
  isLoading?: boolean; 
}

export default function ReadingStats({ 
  stats, 
  isCurrentMonthView, 
  onRemindAllPending, 
  isLoading = false 
}: ReadingStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Đã nộp */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
        <p className="text-gray-500 text-xs uppercase font-semibold">ĐÃ NỘP CHỈ SỐ</p>
        <p className="text-2xl font-bold text-green-600">{stats.countConfirmed}</p>
      </div>

      {/* Card 2: Chưa nộp */}
      <div
        className={`bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex flex-col justify-between transition-colors relative overflow-hidden
          ${!isCurrentMonthView || isLoading ? "cursor-default" : "cursor-pointer hover:bg-orange-50"}
        `}
        onClick={(e) => {
            if (isCurrentMonthView && !isLoading) onRemindAllPending(e);
        }}
      >
        {/* Loading Overlay */}
        {isLoading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
        )}

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
          disabled={!isCurrentMonthView || stats.countNotSubmitted === 0 || isLoading}
        >
          {isCurrentMonthView
            ? isLoading 
                ? "Đang gửi..."
                : stats.countNotSubmitted > 0
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