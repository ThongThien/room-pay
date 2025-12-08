"use client";

import React from "react";
import { MonthlyReading } from "@/types/monthlyReading";

interface UtilityReadingDetailModalProps {
  reading: MonthlyReading;
  onClose: () => void;
}

export default function UtilityReadingDetailModal({ reading, onClose }: UtilityReadingDetailModalProps) {
  // Tính toán lượng tiêu thụ
  const electricUsage = (reading.electricNew || 0) - (reading.electricOld || 0);
  const waterUsage = (reading.waterNew || 0) - (reading.waterOld || 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4 animate-slideIn" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Chi tiết Điện/Nước</h3>
            <p className="text-sm text-gray-500">{reading.houseName} - {reading.roomName}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            {/* Chỉ số Cũ */}
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="font-bold text-gray-500 mb-3 text-sm border-b border-gray-200 pb-1">CHỈ SỐ CŨ</h4>
              <div className="space-y-2">
                <p className="text-sm flex justify-between">
                  <span className="text-amber-600 font-medium">⚡ Điện:</span>
                  <span className="font-bold text-gray-700">{reading.electricOld}</span>
                </p>
                <p className="text-sm flex justify-between">
                  <span className="text-blue-600 font-medium">💧 Nước:</span>
                  <span className="font-bold text-gray-700">{reading.waterOld}</span>
                </p>
              </div>
            </div>

            {/* Chỉ số Mới */}
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h4 className="font-bold text-blue-600 mb-3 text-sm border-b border-blue-200 pb-1">CHỈ SỐ MỚI</h4>
              <div className="space-y-2">
                <p className="text-sm flex justify-between">
                  <span className="text-amber-600 font-medium">⚡ Điện:</span>
                  <span className="font-bold text-blue-800">{reading.electricNew}</span>
                </p>
                <p className="text-sm flex justify-between">
                  <span className="text-blue-600 font-medium">💧 Nước:</span>
                  <span className="font-bold text-blue-800">{reading.waterNew}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Ảnh minh chứng */}
          <div className="flex gap-4 justify-center text-sm text-blue-600 underline cursor-pointer pt-2">
            {reading.electricPhotoUrl && (
              <a href={reading.electricPhotoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-800">
                Xem ảnh đồng hồ Điện
              </a>
            )}
            {reading.waterPhotoUrl && (
              <a href={reading.waterPhotoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-800">
                Xem ảnh đồng hồ Nước
              </a>
            )}
          </div>
        </div>

        {/* Footer (Tính toán) */}
        <div className="mt-6 pt-4 border-t text-sm">
          <p className="flex justify-between font-medium">
            <span>⚡ Điện tiêu thụ:</span>
            <span className="font-bold text-gray-800">{electricUsage > 0 ? electricUsage : 0} kWh</span>
          </p>
          <p className="flex justify-between font-medium mt-1">
            <span>💧 Nước tiêu thụ:</span>
            <span className="font-bold text-gray-800">{waterUsage > 0 ? waterUsage : 0} m³</span>
          </p>
        </div>
      </div>
    </div>
  );
}