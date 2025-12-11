"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Kiểm tra xem đã có thông tin đăng nhập chưa
    // Lưu ý: Cần check window để tránh lỗi server-side render
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("accessToken");
    const role = localStorage.getItem("userRole");

    if (token && role) {
      // 2. Nếu ĐÃ đăng nhập -> Điều hướng vào Dashboard tương ứng
      if (role === "Owner") {
        router.push("/owner/dashboard");
      } else if (role === "Tenant") {
        router.push("/tenant/dashboard");
      } else {
        // Trường hợp role lạ (Admin hoặc lỗi) -> cứ cho về Login cho an toàn
        router.push("/public/login");
      }
    } else {
      // 3. Nếu CHƯA đăng nhập -> Đá về trang Login
      router.push("/public/login");
    }
  }, [router]);

  // Trong lúc chờ check, hiển thị màn hình chờ (Loading)
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner xoay xoay */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-gray-600 font-medium">Đang tải hệ thống...</p>
      </div>
    </div>
  );
}