import { useCurrentUser, useLogout } from '../store/auth.store'
import { useNavigate, NavLink, Link } from 'react-router-dom' // Nhớ import Link và NavLink
import Button from '../components/ui/Button'

function TenantLayout({ children }) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { mutate: logout } = useLogout()

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

  const navItems = [
    { 
      path: '/tenant/dashboard', 
      label: 'Tổng quan', 
    },
    { 
      path: '/tenant/dashboard', 
      label: 'Phòng của tôi', 
    },
    { 
      path: '/tenant/dashboard', 
      label: 'Hóa đơn', 
    },
    { 
      path: '/tenant/dashboard', 
      label: 'Phản ánh/Sự cố', 
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/tenant" className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm">
                    TEST
                 </div>
                 <span className="font-bold text-xl text-gray-800 hidden sm:block">PayRoom</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-semibold text-gray-700">{user?.name || user?.email}</span>
                <span className="text-xs text-green-600 font-medium capitalize">
                  {user?.role === 'tenant' ? 'Khách thuê' : user?.role}
                </span>
              </div>

              <div className="h-6 w-px bg-gray-300 mx-1"></div>

              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleLogout}
                className="!px-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:hidden">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                <span className="hidden sm:inline">Thoát</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 bg-gray-50/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${isActive 
                      ? 'border-green-600 text-green-700' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  `}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-6 text-center text-sm text-gray-500">
            Hệ thống quản lý phòng trọ
        </div>
      </footer>
    </div>
  )
}

export default TenantLayout