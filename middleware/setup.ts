import {defineNuxtRouteMiddleware} from "nuxt/app";
import {useAuthStore} from "../stores/auth";
import {navigateTo} from "nuxt/app";

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip setup check for setup page itself
  if (to.path === '/setup') {
    return
  }

  const authStore = useAuthStore()
  
  // If user is already authenticated, we know the system is set up
  if (authStore.isAuthenticated) {
    return
  }

  try {
    // Only check backend setup status if user is not authenticated
    const api = useApi()
    const response = await api.setup.check()
    
    if (response.success && response.data.needs_setup) {
      return navigateTo('/setup')
    }
    
    // System is set up, continue
    return
  } catch (error) {
    console.error('Setup check failed:', error)
    // If setup check fails, redirect to setup - could be server down or needs setup
    return navigateTo('/setup')
  }
})
