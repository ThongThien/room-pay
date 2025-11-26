import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import Login from '../pages/auth/login' 
import OwnerDashboard from '../pages/owner/dashboard'
import TenantDashboard from '../pages/tenant/dashboard'
import OwnerLayout from '../layouts/OwnerLayout'
import TenantLayout from '../layouts/TenantLayout'

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/owner',
    element: <OwnerLayout><Outlet /></OwnerLayout>,
    children: [
      { index: true, element: <OwnerDashboard /> },
      { path: 'dashboard', element: <OwnerDashboard /> },
    ]
  },


  {
    path: '/tenant',
    element: <TenantLayout><Outlet /></TenantLayout>,
    children: [
      { index: true, element: <TenantDashboard /> },
      { path: 'dashboard', element: <TenantDashboard /> },
    ]
  },

  {
    path: '/',
    element: <Navigate to="/login" />,
  }
])