'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import RoleGuard from '@/components/auth/RoleGuard'
import NotificationDropdown from '@/components/noti/NotificationDropdown'
import ConfirmModal from '@/components/common/ConfirmModal'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const router = useRouter()

  const performLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear()
    }
    router.push('/public/login')
    setShowLogoutModal(false)
  }

  const userFullName =
    typeof window !== 'undefined'
      ? localStorage.getItem('userFullName')
      : 'Owner'

  return (
    <RoleGuard allowedRoles={['Owner']}>
      <div className="flex h-screen bg-gray-100">
        {/* SIDEBAR */}
        <aside
          className={`${
            isSidebarOpen ? 'w-64' : 'w-20'
          } bg-gray-800 text-white transition-all duration-300 flex flex-col`}
        >
          <div className="p-4 border-b border-gray-700 font-bold text-center truncate">
            {isSidebarOpen ? 'Trang quản lý' : 'Admin'}
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Link href="/owner/dashboard" className="block p-2 hover:bg-gray-700 rounded">
              {isSidebarOpen && 'Tổng quan'}
            </Link>

            <Link href="/owner/houses" className="block p-2 hover:bg-gray-700 rounded">
              {isSidebarOpen && 'Quản lý nhà'}
            </Link>

            <Link href="/owner/rooms" className="block p-2 hover:bg-gray-700 rounded">
              {isSidebarOpen && 'Quản lý phòng'}
            </Link>

            <Link href="/owner/tenants" className="block p-2 hover:bg-gray-700 rounded">
              {isSidebarOpen && 'Quản lý khách thuê'}
            </Link>

            <Link href="/owner/contracts" className="block p-2 hover:bg-gray-700 rounded">
              {isSidebarOpen && 'Hợp đồng thuê'}
            </Link>

            <Link href="/owner/monthlyreading" className="block p-2 hover:bg-gray-700 rounded">
              {isSidebarOpen && 'Quản lý nộp chỉ số'}
            </Link>

            <Link href="/owner/invoices" className="block p-2 hover:bg-gray-700 rounded">
              {isSidebarOpen && 'Quản lý hóa đơn'}
            </Link>

            <Link href="/owner/tickets" className="block p-2 hover:bg-gray-700 rounded">
              {isSidebarOpen && 'Yêu cầu sửa chữa'}
            </Link>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full text-left p-2 hover:bg-red-600 text-red-200 hover:text-white rounded mt-4"
            >
              {isSidebarOpen && 'Đăng xuất'}
            </button>
          </nav>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-4 bg-gray-900 text-center hover:bg-gray-700"
          >
            {isSidebarOpen ? 'Thu gọn' : '>'}
          </button>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white shadow p-4 flex justify-between items-center">
            <h1 className="font-bold text-gray-950 text-xl">Khu vực chủ nhà</h1>

            <div className="flex items-center gap-4">
              <NotificationDropdown />

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

          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            {children}
          </main>
        </div>

        <ConfirmModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={performLogout}
          title="Đăng xuất"
          message="Bạn có chắc chắn muốn đăng xuất không?"
          confirmText="Đăng xuất"
          cancelText="Không"
        />
      </div>
    </RoleGuard>
  )
}
