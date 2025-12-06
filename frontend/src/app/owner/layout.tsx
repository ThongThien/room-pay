'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/auth/RoleGuard'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const router = useRouter()

  const handleLogout = () => {
    // Xóa toàn bộ thông tin đăng nhập
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
    router.push('/public/login')
  }

  //Lấy tên user từ localStorage để hiển thị 
  const userFullName = typeof window !== 'undefined' ? localStorage.getItem('userFullName') : 'Owner'

  return (
    //Bọc RoleGuard chỉ cho phép Owner truy cập
    <RoleGuard allowedRoles={['Owner']}>
      <div className="flex h-screen bg-gray-100">
        {/*SIDEBAR*/}
        <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-gray-800 text-white transition-all duration-300 flex flex-col`}>
          <div className="p-4 border-b border-gray-700 font-bold text-center truncate">
            {isSidebarOpen ? 'Trang quản lý' : 'Admin'}
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Link href="/owner/dashboard" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Tổng quan'}
            </Link>


            <Link href="/owner/invoices" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Quản lý hóa đơn'}
            </Link>

            <Link href="/owner/monthlyreading" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Quản lý nộp chỉ số'}
            </Link>

            <Link href="/owner/createtenant" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Thêm khách thuê'}
            </Link>

            <Link href="/owner/houses" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Danh sách nhà - Nam'}
            </Link>

            <Link href="/owner/rooms" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Danh sách phòng - Nam'}
            </Link>

            <Link href="/owner/tenants" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Khách thuê - Mạnh'}
            </Link>

            <Link href="/owner/contracts" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Hợp đồng - Mạnh'}
            </Link>

            <Link href="/owner/tickets" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Yêu cầu sửa chữa - Nam'}
            </Link>

            <Link href="/owner/notification" className="block p-2 hover:bg-gray-700 rounded flex items-center gap-2">
              {isSidebarOpen && 'Thông báo'}
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left block p-2 hover:bg-red-600 text-red-200 hover:text-white rounded flex items-center gap-2 mt-4"
            >
              {isSidebarOpen && 'Đăng xuất'}
            </button>
          </nav>

          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-4 bg-gray-900 text-center hover:bg-gray-700">
            {isSidebarOpen ? 'Thu gọn' : '>'}
          </button>
        </aside>

        {/*MAIN CONTENT*/}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow p-4 flex justify-between items-center">
            <h1 className="font-bold text-gray-950 text-xl">Khu vực chủ nhà</h1>
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center">
                <Image
                  src="/bell.svg"
                  alt="nofi"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span className="absolute top-1.5 right-2 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{userFullName}</p>
                  <p className="text-xs text-gray-500">Chủ nhà</p>
                </div>

                <div className="relative w-10 h-10">
                  <Image
                    src="/logo.png"
                    alt="Avatar"
                    fill
                    className="rounded-full object-cover border"
                  />
                </div>
              </div>
            </div>
          </header>

          {/* CHILD */}
          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}