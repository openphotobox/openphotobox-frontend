<template>
  <div class="pa-8">
    <v-card>
      <v-card-title>Runtime Configuration Debug</v-card-title>
      <v-card-text>
        <div class="mb-4">
          <strong>API Base URL:</strong>
          <code class="ml-2">{{ apiBase }}</code>
        </div>
        
        <v-alert type="info" class="mb-4">
          <div><strong>Expected:</strong> The URL you set via NUXT_PUBLIC_API_BASE</div>
          <div><strong>Default:</strong> http://localhost:8000</div>
        </v-alert>

        <div class="mb-4">
          <strong>Test API Call:</strong>
          <v-btn @click="testApi" :loading="testing" class="ml-2">
            Test Connection
          </v-btn>
        </div>

        <v-alert v-if="testResult" :type="testResult.success ? 'success' : 'error'" class="mt-4">
          <div v-if="testResult.success">
            ✅ Successfully connected to: {{ testResult.url }}
          </div>
          <div v-else>
            ❌ Failed to connect: {{ testResult.error }}
          </div>
        </v-alert>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
const config = useRuntimeConfig()
const apiBase = computed(() => config.public.apiBase)

const testing = ref(false)
const testResult = ref(null)

const testApi = async () => {
  testing.value = true
  testResult.value = null
  
  try {
    const response = await fetch(`${apiBase.value}/api/assets/storage/status/`, {
      headers: {
        'Accept': 'application/json'
      }
    })
    
    if (response.ok) {
      testResult.value = {
        success: true,
        url: apiBase.value
      }
    } else {
      testResult.value = {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
  } catch (error) {
    testResult.value = {
      success: false,
      error: error.message
    }
  } finally {
    testing.value = false
  }
}
</script>

