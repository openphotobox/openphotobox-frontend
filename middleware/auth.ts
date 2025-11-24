import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useAuthStore } from '../stores/auth'
export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore()

  // Avoid SSR redirects: only redirect on client, let pages render server-side
  if (process.server) {
    return
  }

  // Wait a microtask for store hydration if navigating on first load
  if (!authStore.isAuthenticated) {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('user_data')
    if (storedToken && storedUser) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  if (!authStore.isAuthenticated) {
    const redirect = encodeURIComponent(to.fullPath || '/')
    return navigateTo(`/login?redirect=${redirect}`)
  }

  // Optionally refresh profile if token exists but user absent
  if (authStore.token && !authStore.user) {
    try {
      await authStore.getProfile()
    } catch (error) {
      const redirect = encodeURIComponent(to.fullPath || '/')
      return navigateTo(`/login?redirect=${redirect}`)
    }
  }
})
