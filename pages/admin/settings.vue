<template>
  <div class="admin-settings">
    <v-container>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon class="me-2">mdi-cog</v-icon>
              Admin Settings
            </v-card-title>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Actions Card -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon class="me-2">mdi-lightning-bolt</v-icon>
              Quick Actions
            </v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item
                  prepend-icon="mdi-account-multiple"
                  title="Manage Users"
                  subtitle="Create, edit, and delete user accounts"
                  @click="navigateTo('/admin/users')"
                  class="cursor-pointer"
                >
                  <template v-slot:append>
                    <v-icon>mdi-chevron-right</v-icon>
                  </template>
                </v-list-item>
                
                <v-divider class="my-2"></v-divider>
                
                <v-list-item
                  prepend-icon="mdi-cloud-upload"
                  title="Upload Photos"
                  subtitle="Add new photos to your library"
                  @click="navigateTo('/admin/upload')"
                  class="cursor-pointer"
                >
                  <template v-slot:append>
                    <v-icon>mdi-chevron-right</v-icon>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Storage Status Card -->
      <v-row>
        <v-col cols="12">
          <v-card class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon class="me-2">mdi-folder</v-icon>
              Storage Configuration
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                @click="checkStorageStatus"
                :loading="checkingStatus"
              >
                <v-icon class="me-1">mdi-refresh</v-icon>
                Refresh
              </v-btn>
            </v-card-title>
            
            <v-card-text>
              <div v-if="storageStatus">
                <v-alert
                  :type="storageStatus.configured ? 'success' : 'warning'"
                  class="mb-4"
                >
                  <div class="d-flex align-center">
                    <v-icon class="me-2">
                      {{ storageStatus.configured ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                    </v-icon>
                    <div>
                      <strong>
                        {{ storageStatus.configured ? 'Storage Configured' : 'Storage Setup Required' }}
                      </strong>
                      <div class="text-caption mt-1">
                        {{ storageStatus.configured 
                          ? `Photos are stored at: ${storageStatus.path}` 
                          : 'Configure a storage directory to start uploading photos.' 
                        }}
                      </div>
                    </div>
                  </div>
                </v-alert>

                <!-- Storage Path Info -->
                <v-card v-if="storageStatus.configured && storageStatus.path" variant="outlined">
                  <v-card-text>
                    <div class="text-body-2 mb-2"><strong>Storage Location:</strong></div>
                    <code class="d-block pa-3 bg-grey-lighten-4 rounded">
                      {{ storageStatus.path }}
                    </code>
                    <div class="text-caption mt-2 text-grey">
                      All photos and thumbnails are stored in this directory on your server.
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Storage Setup Form -->
      <v-row v-if="!storageStatus?.configured">
        <v-col cols="12" md="8">
          <v-card class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon class="me-2" color="primary">mdi-folder-plus</v-icon>
              Setup Storage
            </v-card-title>
            <v-card-text>
              <v-alert type="info" class="mb-4">
                <div class="text-body-2">
                  Configure where OpenPhotobox will store photos on your server. 
                  This is a one-time setup that automatically creates all necessary directories.
                </div>
              </v-alert>
              
              <v-form ref="storageSetupForm" v-model="storageSetupValid">
                <v-text-field
                  v-model="storageSetupPath"
                  label="Storage Directory Path"
                  hint="Absolute path on the server (e.g., /home/user/photos)"
                  persistent-hint
                  :rules="[v => !!v || 'Path is required']"
                  prepend-inner-icon="mdi-folder"
                  variant="outlined"
                ></v-text-field>
              </v-form>
              
              <v-alert type="warning" variant="outlined" class="mt-4">
                <div class="text-body-2">
                  <strong>Important:</strong> 
                  <ul class="mt-2">
                    <li>The server must have write permissions to this path</li>
                    <li>The directory will be created automatically if it doesn't exist</li>
                    <li>Once configured with photos, you cannot change the path</li>
                  </ul>
                </div>
              </v-alert>
              
              <div class="d-flex gap-2 mt-4">
                <v-btn
                  color="primary"
                  size="large"
                  @click="setupStorage"
                  :loading="settingUpStorage"
                  :disabled="!storageSetupValid"
                >
                  <v-icon class="me-2">mdi-check</v-icon>
                  Setup Storage
                </v-btn>
                
                <v-btn
                  color="secondary"
                  variant="outlined"
                  @click="checkStorageStatus"
                  :loading="checkingStatus"
                >
                  <v-icon class="me-2">mdi-refresh</v-icon>
                  Check Status
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Success Snackbar -->
    <v-snackbar
      v-model="showSuccessMessage"
      color="success"
      timeout="5000"
    >
      <div class="d-flex align-center">
        <v-icon class="me-2">mdi-check-circle</v-icon>
        {{ successMessage }}
      </div>
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar
      v-model="showErrorMessage"
      color="error"
      timeout="8000"
    >
      <div class="d-flex align-center">
        <v-icon class="me-2">mdi-alert-circle</v-icon>
        {{ errorMessage }}
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
// Require admin authentication
definePageMeta({
  middleware: ['setup', 'auth']
})

const api = useApi()

// Reactive state
const storageStatus = ref(null)
const checkingStatus = ref(false)
const settingUpStorage = ref(false)
const storageSetupValid = ref(false)
const storageSetupPath = ref('/home/user/photos')
const showSuccessMessage = ref(false)
const showErrorMessage = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Load storage status on mount
onMounted(() => {
  checkStorageStatus()
})

const checkStorageStatus = async () => {
  checkingStatus.value = true
  try {
    const response = await api.storage.status()
    if (response.success) {
      storageStatus.value = response.data
      console.log('Storage status:', response.data)
    } else {
      showError('Failed to check storage status: ' + response.error)
    }
  } catch (error) {
    console.error('Failed to check storage status:', error)
    showError('Failed to check storage status: ' + error.message)
  } finally {
    checkingStatus.value = false
  }
}

const setupStorage = async () => {
  settingUpStorage.value = true
  try {
    const response = await api.storage.setup({ path: storageSetupPath.value })
    if (response.success) {
      console.log('Storage setup response:', response.data)
      showSuccess(response.data.message || 'Storage configured successfully!')
      
      // Refresh storage status
      await checkStorageStatus()
    } else {
      // Handle the case where storage is already configured with photos
      const errorData = response.data
      if (errorData && errorData.error === 'Cannot change storage path') {
        showError(
          `Cannot change storage path. Currently configured at ${errorData.current_path} ` +
          `with ${errorData.asset_count} photos. Changing the path would make existing photos inaccessible.`
        )
      } else {
        showError('Failed to setup storage: ' + response.error)
      }
    }
  } catch (error) {
    console.error('Failed to setup storage:', error)
    showError('Failed to setup storage: ' + error.message)
  } finally {
    settingUpStorage.value = false
  }
}


const showSuccess = (message: string) => {
  successMessage.value = message
  showSuccessMessage.value = true
}

const showError = (message: string) => {
  errorMessage.value = message
  showErrorMessage.value = true
}
</script>

<style scoped>
.admin-settings {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem 0;
}
</style>
