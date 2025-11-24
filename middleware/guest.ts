export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()
  
  // Avoid SSR redirects; only act on client
  if (process.server) return

  // If already authenticated, redirect to intended page or home
  if (authStore.isAuthenticated) {
    const redirect = to.query?.redirect as string | undefined
    if (redirect) {
      return navigateTo(decodeURIComponent(redirect))
    }
    return navigateTo('/')
  }
})
