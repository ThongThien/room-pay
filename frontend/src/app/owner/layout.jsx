'use client' 
import { useState } from 'react'
import Link from 'next/link' 
import Image from 'next/image'

export default function OwnerLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-100">
      {/*SIDEBAR*/}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-gray-800 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700 font-bold text-center">
          {isSidebarOpen ? 'OWNER' : 'OW'}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">  
          <Link href="/owner" className="block p-2 hover:bg-gray-700 rounded">
            {isSidebarOpen && 'Dashboard'}
          </Link>
        </nav>

        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-4 bg-gray-900 text-center hover:bg-gray-700">
           {isSidebarOpen ? 'Thu gọn' : '>'}
        </button>
      </aside>

      {/*MAIN CONTENT*/}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow p-4 flex justify-between items-center">
            <h2 className="font-bold">Hệ thống quản lý phòng trọ</h2>
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
                        <p className="text-sm font-bold">Owner</p>
                        <p className="text-xs">Chủ nhà</p>
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
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}