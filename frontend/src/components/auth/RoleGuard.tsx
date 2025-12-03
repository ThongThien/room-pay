"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[]; // Mảng các role được phép truy cập, vd: ["Owner"]
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Lấy thông tin từ localStorage
    // Kiểm tra window để chắc chắn code chạy ở client
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("accessToken");
    const userRole = localStorage.getItem("userRole");

    // Kiểm tra nếu chưa đăng nhập
    if (!token || !userRole) {
      router.push("/public/login");
      return;
    }

    // Kiểm tra Role có khớp không
    if (!allowedRoles.includes(userRole)) {
      // Nếu role hiện tại không nằm trong danh sách cho phép
      if (userRole === "Owner") {
        router.push("/owner/dashboard");
      } else if (userRole === "Tenant") {
        router.push("/tenant/dashboard");
      } else {
        router.push("/public/login");
      }
    } else {
      // Nếu hợp lệ
      const timer = setTimeout(() => {
        setAuthorized(true);
      }, 0);

      // Cleanup function để xóa timer nếu component bị hủy
      return () => clearTimeout(timer);
    }
  }, [router, allowedRoles]);

  // Trong lúc đang kiểm tra (authorized = false), hiện Loading Spinner
  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Nếu hợp lệ thì render nội dung bên trong
  return <>{children}</>;
}