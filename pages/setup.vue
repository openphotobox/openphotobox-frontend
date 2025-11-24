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
              <h1 class="text-h4 font-weight-bold mb-2">Welcome to OpenPhotobox</h1>
              <p class="text-body-2 text-medium-emphasis">Let's set up your admin account to get started</p>
            </div>
          </v-card-title>

          <!-- Setup Form -->
          <v-form @submit.prevent="handleSetup" ref="formRef">
            <v-text-field
              v-model="form.username"
              label="Admin Username"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              required
              :rules="[rules.required]"
              class="mb-3"
            ></v-text-field>

            <v-text-field
              v-model="form.email"
              label="Admin Email"
              prepend-inner-icon="mdi-email"
              variant="outlined"
              type="email"
              required
              :rules="[rules.required, rules.email]"
              class="mb-3"
            ></v-text-field>

            <v-text-field
              v-model="form.password"
              label="Admin Password"
              prepend-inner-icon="mdi-lock"
              variant="outlined"
              type="password"
              required
              :rules="[rules.required, rules.minLength]"
              class="mb-3"
            ></v-text-field>

            <v-text-field
              v-model="form.confirmPassword"
              label="Confirm Password"
              prepend-inner-icon="mdi-lock-check"
              variant="outlined"
              type="password"
              required
              :rules="[rules.required, rules.passwordMatch]"
              class="mb-4"
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

            <!-- Success Message -->
            <v-alert
              v-if="success"
              type="success"
              variant="tonal"
              class="mb-4"
            >
              {{ success }}
            </v-alert>

            <!-- Setup Button -->
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
                <v-icon>mdi-account-plus</v-icon>
              </template>
              CREATE ADMIN ACCOUNT
            </v-btn>
          </v-form>

          <!-- Footer -->
          <v-card-text class="text-center pa-0">
            <p class="text-caption text-medium-emphasis">
              This will create the first admin user
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

// Use no layout for this page to make it standalone
definePageMeta({
  layout: 'auth'
})

const authStore = useAuthStore()

// Form state - using ref with reactive object to ensure persistence
const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const error = ref('')
const success = ref('')
const isLoading = ref(false)
const formRef = ref()

// Validation rules
const rules = {
  required: (value: string) => !!value || 'This field is required',
  email: (value: string) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(value) || 'Please enter a valid email address'
  },
  minLength: (value: string) => value.length >= 6 || 'Password must be at least 6 characters',
  passwordMatch: (value: string) => value === form.value.password || 'Passwords do not match'
}

const handleSetup = async () => {
  error.value = ''
  success.value = ''
  isLoading.value = true
  
  try {
    // Validate form first
    const { valid } = await formRef.value.validate()
    if (!valid) {
      isLoading.value = false
      return
    }

    const api = useApi()
    
    // Call the setup endpoint to create the first admin user
    const response = await api.setup.createAdmin({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
      confirm_password: form.value.confirmPassword
    })
    
    if (response.success) {
      // The setup endpoint returns a token, so set auth directly
      authStore.setAuth(response.data.token, response.data.user)
    } else {
      throw new Error(response.error || 'Setup failed')
    }
    
    // Redirect to the main app
    await navigateTo('/')
  } catch (err: any) {
    error.value = err.message || 'Setup failed. Please try again.'
  } finally {
    isLoading.value = false
  }
}

// Set page title
useHead({
  title: 'Setup - OpenPhotobox'
})
</script>

<style scoped>
/* Styles are now handled by the auth layout */
</style>
