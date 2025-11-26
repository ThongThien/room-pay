import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loginAPI, logoutAPI, getCurrentUserAPI } from '../api/auth.api'

const STORAGE_KEY = 'auth_token'
const REFRESH_STORAGE_KEY = 'auth_refresh_token'
const USER_STORAGE_KEY = 'auth_user'

export const authKeys = {
  all: ['auth'],
  user: () => [...authKeys.all, 'user'],
  currentUser: () => [...authKeys.user(), 'current'],
}

const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem(USER_STORAGE_KEY)
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}

export const useCurrentUser = () => {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: async () => {
      const token = localStorage.getItem(STORAGE_KEY)
      if (!token) return null

      try {
        const user = await getCurrentUserAPI(token)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
        return user
      } catch {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(REFRESH_STORAGE_KEY)
        localStorage.removeItem(USER_STORAGE_KEY)
        return null
      }
    },
    initialData: getStoredUser(), 
    retry: false,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password }) => {
      const result = await loginAPI(email, password)

      localStorage.setItem(STORAGE_KEY, result.accessToken)
      if (result.refreshToken) {
        localStorage.setItem(REFRESH_STORAGE_KEY, result.refreshToken)
      }

      let user = result.user
      if (!user) {
        try {
          user = await getCurrentUserAPI(result.accessToken)
        } catch {
          user = null
        }
      }

      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      }

      return { user, token: result.accessToken }
    },
    onSuccess: (data) => {
      if (data.user) {
        queryClient.setQueryData(authKeys.currentUser(), data.user)
      }
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await logoutAPI()
      } catch {
        console.log("Logout processed") 
      }
      
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(REFRESH_STORAGE_KEY)
      localStorage.removeItem(USER_STORAGE_KEY)
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.currentUser(), null)
      queryClient.removeQueries({ queryKey: authKeys.all })
    },
  })
}

export const useIsAuthenticated = () => {
  const { data: user, isLoading } = useCurrentUser()
  return {
    isAuthenticated: !!user,
    isLoading,
    user,
    role: user?.role || null
  }
}