import { defineStore } from 'pinia'

export interface User {
  id: string
  username: string
  email: string
  is_admin: boolean
  last_login?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.is_admin || false)

  // Actions
  const setAuth = (authToken: string, userData: User) => {
    token.value = authToken
    user.value = userData
    
    // Store in localStorage for persistence (using 'auth-token' for consistency with new API)
    if (process.client) {
      localStorage.setItem('auth-token', authToken)
      localStorage.setItem('auth_token', authToken) // Keep for backwards compat
      try {
        // Create a clean object without circular references
        const cleanUserData = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          is_admin: userData.is_admin,
          last_login: userData.last_login
        }
        localStorage.setItem('user_data', JSON.stringify(cleanUserData))
      } catch (error) {
        console.error('Failed to serialize user data:', error)
        // Store minimal data if serialization fails
        localStorage.setItem('user_data', JSON.stringify({
          id: userData.id,
          username: userData.username,
          is_admin: userData.is_admin
        }))
      }
    }
  }

  const clearAuth = () => {
    token.value = null
    user.value = null
    
    // Clear from localStorage
    if (process.client) {
      localStorage.removeItem('auth-token')
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
    }
  }

  const login = async (credentials: LoginRequest) => {
    isLoading.value = true
    try {
      const api = useApi()
      const response = await api.client.post<LoginResponse>('/api/auth/login/', credentials)
      if (response.success && response.data) {
        setAuth(response.data.token, response.data.user)
        return response.data
      } else {
        throw new Error(response.error || 'Login failed')
      }
    } catch (error) {
      clearAuth()
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    try {
      if (token.value) {
        const api = useApi()
        await api.client.post('/api/auth/logout/', {})
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuth()
      isLoading.value = false
      
      // Redirect to login page after logout
      if (process.client) {
        await navigateTo('/login')
      }
    }
  }

  const getProfile = async () => {
    if (!token.value) return null
    
    isLoading.value = true
    try {
      const api = useApi()
      const response = await api.client.get<{ user: User }>('/api/auth/me/')
      if (response.success && response.data) {
        user.value = response.data.user
        return response.data.user
      } else {
        throw new Error(response.error || 'Failed to get profile')
      }
    } catch (error) {
      clearAuth()
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const initializeAuth = () => {
    if (process.client) {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('user_data')
      
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setAuth(storedToken, userData)
        } catch (error) {
          console.error('Failed to parse stored user data:', error)
          clearAuth()
        }
      }
    }
  }

  // Initialize auth immediately if we're on client side
  if (process.client) {
    initializeAuth()
  }

  return {
    // State
    user: readonly(user),
    token: readonly(token),
    isLoading: readonly(isLoading),
    
    // Getters
    isAuthenticated,
    isAdmin,
    
    // Actions
    login,
    logout,
    getProfile,
    setAuth,
    clearAuth,
    initializeAuth,
  }
})
