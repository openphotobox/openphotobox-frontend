<template>
  <v-container fluid class="fill-height">
    <v-row justify="center" align="center" class="fill-height">
      <v-col cols="12">
        <v-card class="pa-6 mx-auto elevation-12 glass-effect" max-width="560" rounded="xl" style="width: 100%">
          <!-- Header -->
          <v-card-title class="text-center mb-4 pa-0">
            <div class="text-center">
              <v-avatar size="64" class="mb-4" color="primary">
                <v-icon size="32" color="white">mdi-camera</v-icon>
              </v-avatar>
              <h1 class="text-h4 font-weight-bold mb-2">Login</h1>
              <p class="text-body-2 text-medium-emphasis">Access your family photo archive</p>
            </div>
          </v-card-title>

          <!-- Login Form -->
          <v-form @submit.prevent="handleLogin" ref="formRef" v-model="formValid">
            <v-text-field
              v-model="username"
              label="Username"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              :rules="usernameRules"
              class="mb-3"
              autocomplete="username"
            ></v-text-field>

            <v-text-field
              v-model="password"
              label="Password"
              prepend-inner-icon="mdi-lock"
              variant="outlined"
              type="password"
              :rules="passwordRules"
              class="mb-4"
              autocomplete="current-password"
            ></v-text-field>

            <!-- Error Message -->
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              @click:close="error = ''"
            >
              {{ error }}
            </v-alert>

            <!-- Login Button -->
            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              :loading="isLoading"
              :disabled="isLoading"
              class="mb-4"
            >
              <template #prepend>
                <v-icon>mdi-login</v-icon>
              </template>
              LOGIN
            </v-btn>
          </v-form>

          <!-- Footer -->
          <v-card-text class="text-center pa-0">
            <p class="text-caption text-medium-emphasis">
              Contact your admin to create an account
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

// Use guest middleware to redirect if already authenticated, and setup middleware to check if setup is needed
// Also use no layout to make this a standalone page
definePageMeta({
  middleware: ['setup', 'guest'],
  layout: 'auth'
})

const authStore = useAuthStore()

// Form refs
const formRef = ref()
const formValid = ref(false)

// Form state - simple individual refs
const username = ref('')
const password = ref('')

const error = ref('')
const isLoading = ref(false)

// Simple validation rules
const usernameRules = [
  (v: string) => !!v || 'Username is required'
]

const passwordRules = [
  (v: string) => !!v || 'Password is required'
]

const handleLogin = async () => {
  // Validate form first
  const { valid } = await formRef.value.validate()
  if (!valid) {
    return
  }

  error.value = ''
  isLoading.value = true
  
  try {
    // Create a plain object from the simple refs
    const loginData = {
      username: username.value,
      password: password.value
    }
    
    console.log('Attempting login with:', { username: loginData.username, password: '[HIDDEN]' })
    
    await authStore.login(loginData)
    const redirect = (useRoute().query.redirect as string) || '/'
    await navigateTo(decodeURIComponent(redirect))
  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.response?.data?.error || err.message || 'Login failed. Please check your credentials.'
  } finally {
    isLoading.value = false
  }
}

// Set page title
useHead({
  title: 'Login - OpenPhotobox'
})
</script>

<style scoped>
/* Styles are now handled by the auth layout */
</style>
