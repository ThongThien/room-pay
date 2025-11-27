import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

const MOCK_USERS = [
  { id: 1, email: 'owner@test.com', password: '123', role: 'owner', name: 'Owner' },
  { id: 2, email: 'tenant@test.com', password: '123', role: 'tenant', name: 'Tenant' },
]

export const loginAPI = async (email, password) => {
  await new Promise(resolve => setTimeout(resolve, 1000))
  try {
    const user = MOCK_USERS.find(u => u.email === email)
    
    if (!user) {
      throw new Error('Email không tồn tại (Mock)')
    }
    
    if (user.password !== password) {
      throw new Error('Sai mật khẩu (Mock)')
    }
    const mockPayload = JSON.stringify({ userId: user.id, role: user.role, name: user.name })
    const accessToken = `mock_header.${btoa(mockPayload)}.mock_signature`
    return {
      accessToken,
      user: { 
          id: user.id, 
          role: user.role, 
          name: user.name, 
          email: user.email 
      }
    }
  } catch (error) {
    const message = error.message || 'Login failed'
    throw new Error(message)
  }
}

export const getCurrentUserAPI = async (token) => {
  try {
    const parts = token.split('.')
    if (parts.length < 2) throw new Error('Invalid token')
    const payload = JSON.parse(atob(parts[1]))
    return {
      id: payload.userId,
      role: payload.role,
      name: payload.name
    }
  } catch {
    throw new Error('Invalid token')
  }
}

export const logoutAPI = async () => {
  return { success: true }
}