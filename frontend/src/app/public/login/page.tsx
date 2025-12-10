"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginAPI } from "@/services/authService";

export default function LoginPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // API
      const result = await loginAPI(formData.email, formData.password);

      if (result.success) {
        // Lưu Token và thông tin User
        if (result.token) {
            localStorage.setItem("accessToken", result.token);
        }
        
        // Lưu thông tin user để hiển thị
        if (result.user) {
            localStorage.setItem("userRole", result.user.role);
            localStorage.setItem("userFullName", result.user.fullName);
            localStorage.setItem("userId", result.user.id);
        }

        // Điều hướng
        if (result.user?.role === "Owner") {
            router.push("/owner/dashboard"); 
        } else if (result.user?.role === "Tenant") {
            router.push("/tenant/dashboard");
        } else {
            router.push("/");
        }

      } else {
        setError(result.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Đã xảy ra lỗi không mong muốn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Đăng nhập</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Email */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>
          
          {/* Input Password */}
          <div>
            <label className="block mb-1 font-medium text-gray-700">Mật khẩu</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 text-white font-bold rounded transition duration-200 ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}