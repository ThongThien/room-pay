import { useCurrentUser, useLogin, useLogout } from '../store/auth.store'

export const useAuth = () => {
  const { data: user, isLoading } = useCurrentUser()
  const { mutateAsync: login, isPending: loginPending, error: loginError } = useLogin()
  const { mutate: logout, isPending: logoutPending, error: logoutError } = useLogout()

  const handleLogin = async (email, password) => {
    try {
      await login({ email, password })
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message || "Đăng nhập thất bại" }
    }
  }

  const handleLogout = async () => {
    return new Promise((resolve) => {
      logout(undefined, {
        onSuccess: () => resolve({ success: true }),
        onError: (err) => resolve({ success: false, error: err.message })
      })
    })
  }

  return {
    user,
    token: localStorage.getItem('auth_token'),
    loading: isLoading || loginPending || logoutPending,
    error: loginError?.message || logoutError?.message || null,
    login: handleLogin,
    logout: handleLogout,
    isAuthenticated: !!user && !!localStorage.getItem('auth_token'),
    role: user?.role || null 
  }
}