"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { createUserAPI } from "@/services/userService"; 

export default function CreateTenantPage() {
  
  const [formData, setFormData] = useState({ fullName: "", email: "" });
  const [createdUser, setCreatedUser] = useState<{email: string, password: string} | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setCreatedUser(null);
    setLoading(true);

    try {
      const result = await createUserAPI(formData.fullName, formData.email);
      
      if (result.success) {
        setCreatedUser({
            email: result.data.email,
            password: result.generatedPassword 
        });
        setFormData({ fullName: "", email: "" }); // Reset form để nhập người tiếp theo
      } else {
        setError(result.message || "Tạo tài khoản thất bại");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi kết nối hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (createdUser) {
        const text = `TÀI KHOẢN PHÒNG TRỌ\n----------------\nEmail: ${createdUser.email}\nMật khẩu: ${createdUser.password}\n----------------`;
        navigator.clipboard.writeText(text);
        alert("Đã sao chép thông tin vào bộ nhớ tạm!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Thêm khách thuê mới</h1>
        <p className="text-sm text-gray-500 mt-1">Tạo tài khoản đăng nhập hệ thống cho người thuê phòng</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form nhập liệu */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-1 h-6 bg-blue-600 rounded-r-md inline-block"></span>
                        Thông tin khách thuê
                    </h2>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Họ và tên</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Ví dụ: Nguyễn Văn Trường"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-800 text-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Email (Tên đăng nhập)</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="tenant@gmail.com"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-800 text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full sm:w-auto px-8 py-3 rounded-lg text-white font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${
                                    loading 
                                    ? "bg-gray-400 cursor-not-allowed" 
                                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-md"
                                }`}
                            >
                                {loading ? "Đang xử lý..." : "Tạo tài khoản"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        {/* Cột Phải: Chỉ hiển thị khi có kết quả */}
        <div className="lg:col-span-1 space-y-6">
            {createdUser && (
                <div className="bg-white rounded-xl shadow-lg border-t-4 border-green-500 overflow-hidden animate-fade-in-up">
                    <div className="p-6 text-center border-b border-gray-100">
                        <div className="mx-auto bg-green-100 w-14 h-14 rounded-full flex items-center justify-center mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-green-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">Tạo thành công!</h3>
                        <p className="text-gray-500 text-sm mt-1">Thông tin đăng nhập của khách thuê:</p>
                    </div>
                    
                    <div className="p-6 bg-gray-50/50 space-y-4">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                            <p className="text-gray-800 font-medium break-all">{createdUser.email}</p>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mật khẩu</p>
                            <div className="bg-white border border-gray-200 rounded-md p-3 text-center">
                                <span className="text-red-600 font-mono font-bold text-xl tracking-widest selection:bg-red-100">
                                    {createdUser.password}
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={copyToClipboard}
                            className="w-full mt-2 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                            </svg>
                            Sao chép
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}