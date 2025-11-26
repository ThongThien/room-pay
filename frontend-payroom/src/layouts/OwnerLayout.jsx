import { useState } from 'react'
import { useCurrentUser, useLogout } from '../store/auth.store'
import { useNavigate, NavLink, Link } from 'react-router-dom'
import Button from '../components/ui/Button'

function OwnerLayout({ children }) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { mutate: logout } = useLogout()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        navigate('/login', { replace: true })
      },
      onError: (error) => {
        console.error('Logout error:', error)
      }
    })
  }

  const menuItems = [
    { 
      path: '/owner/dashboard', 
      label: 'Dashboard', 
    },
    { 
      path: '/owner/dashboard', 
      label: 'Nhà + Phòng', 
    },
    { 
      path: '/owner/dashboard', 
      label: 'Khách thuê', 
    },
    { 
      path: '/owner/dashboard', 
      label: 'Hợp đồng', 
    },
    { 
      path: '/owner/dashboard', 
      label: 'Chỉ số điện nước', 
    },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-800 text-white transition-all duration-300 flex flex-col shadow-2xl z-20`}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-700">
          <Link to="/owner" className="flex items-center gap-2 overflow-hidden px-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0">
               TEST
            </div>
            {isSidebarOpen && <span className="font-bold text-xl whitespace-nowrap">PayRoom</span>}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1 px-3">
            {menuItems.map((item, idx) => (
              <li key={idx}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'}
                  `}
                  title={!isSidebarOpen ? item.label : ''}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                  {!isSidebarOpen && (
                    <div className="absolute left-16 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        {item.label}
                    </div>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            {isSidebarOpen && <span className="text-sm font-medium">Thu gọn</span>}
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white shadow-sm z-10 border-b border-gray-200">
          <div className="px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 truncate">TEST</h2>
            
            <div className="flex items-center gap-4 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user?.name || user?.email}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role === 'owner' ? 'Chủ Nhà' : 'Người thuê'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleLogout}
                className="ml-2"
              >
                Đăng xuất
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                 {children}
            </div>
        </main>
      </div>
    </div>
  )
}

export default OwnerLayout