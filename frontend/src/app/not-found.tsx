"use client";

import { useRouter } from 'next/navigation'; 

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-4">

      {/* Tiêu đề */}
      <h2 className="text-3xl font-bold mb-2 text-center text-gray-900">
        Chức năng đang phát triển
      </h2>

      <p className="text-gray-500 text-center mb-8 max-w-md">
        Tính năng này chưa được cập nhật hoặc đang trong quá trình xây dựng. Vui lòng quay lại sau!
      </p>

      <div className="flex gap-4">
        <button 
          onClick={() => router.back()} 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-md flex items-center gap-2"
        >
          Quay lại trang trước
        </button>
      </div>
    </div>
  );
}