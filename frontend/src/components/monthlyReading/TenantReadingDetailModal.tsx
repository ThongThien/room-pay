"use client";

import React from "react";
import { MonthlyReading } from "@/types/monthlyReading";

interface Props {
  reading: MonthlyReading;
  onClose: () => void;
}

export default function TenantReadingDetailModal({ reading, onClose }: Props) {
  const electricUsage = (reading.electricNew || 0) - (reading.electricOld || 0);
  const waterUsage = (reading.waterNew || 0) - (reading.waterOld || 0);

  // Format ngày tháng
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 animate-slideIn relative" onClick={(e) => e.stopPropagation()}>
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-light">&times;</button>

        {/* Header */}
        <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-gray-800">Phiếu Ghi Chỉ Số</h3>
            <p className="text-sm text-gray-500 mt-1">Ngày tạo: {formatDate(reading.createdAt)}</p>
        </div>

        {/* Body */}
        <div className="space-y-4">
            {/* Điện */}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">⚡</span>
                    <span className="font-bold text-amber-700">Điện (kWh)</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Số cũ: <b>{reading.electricOld}</b></span>
                    <span>Số mới: <b>{reading.electricNew}</b></span>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-200 flex justify-between font-bold text-amber-800">
                    <span>Tiêu thụ:</span>
                    <span>{electricUsage} kWh</span>
                </div>
                {reading.electricPhotoUrl && (
                    <a href={reading.electricPhotoUrl} target="_blank" className="text-xs text-amber-600 underline mt-2 block text-right">Xem ảnh công tơ</a>
                )}
            </div>

            {/* Nước */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">💧</span>
                    <span className="font-bold text-blue-700">Nước (m³)</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Số cũ: <b>{reading.waterOld}</b></span>
                    <span>Số mới: <b>{reading.waterNew}</b></span>
                </div>
                <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between font-bold text-blue-800">
                    <span>Tiêu thụ:</span>
                    <span>{waterUsage} m³</span>
                </div>
                {reading.waterPhotoUrl && (
                    <a href={reading.waterPhotoUrl} target="_blank" className="text-xs text-blue-600 underline mt-2 block text-right">Xem ảnh công tơ</a>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="mt-6">
            <button onClick={onClose} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition">
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
}