
<template>
  <div class="upload-page">
    <v-container>
      <v-row justify="center">
        <v-col cols="12" md="8">
          <v-card class="pa-6">
            <v-card-title class="text-h4 mb-4">
              <v-icon class="me-2" color="primary">mdi-cloud-upload</v-icon>
              Upload Photos
            </v-card-title>
            
            <v-card-text>
              <p class="text-body-1 mb-6">
                Select photos to upload to your family archive. Supported formats: JPEG, PNG, HEIC, WebP
              </p>

              <!-- Storage Configuration Warning -->
              <v-alert
                v-if="checkingStorage"
                type="info"
                class="mb-4"
              >
                <v-progress-circular indeterminate size="20" class="me-2"></v-progress-circular>
                Checking storage configuration...
              </v-alert>
              
              <v-alert
                v-else-if="!storageConfigured"
                type="warning"
                class="mb-4"
                prominent
              >
                <div class="d-flex align-center">
                  <v-icon class="me-2">mdi-alert-circle</v-icon>
                  <div>
                    <strong>Storage Configuration Required</strong>
                    <div class="text-body-2 mt-1">{{ storageMessage }}</div>
                  </div>
                </div>
                
                <template v-slot:actions>
                  <v-btn
                    color="warning"
                    variant="outlined"
                    @click="$router.push('/admin/settings')"
                  >
                    <v-icon class="me-1">mdi-cog</v-icon>
                    Configure Storage
                  </v-btn>
                </template>
              </v-alert>
              
              <!-- File Upload -->
              <v-file-input
                v-model="selectedFiles"
                multiple
                accept="image/*"
                label="Select photos to upload"
                prepend-icon="mdi-camera"
                variant="outlined"
                :loading="uploading || checkingStorage"
                :disabled="uploading || checkingStorage || !storageConfigured"
                @change="handleFileChange"
              ></v-file-input>
              
              <!-- Album Selection -->
              <v-row class="mt-1" align="center">
                <v-col cols="12" md="7">
                  <v-autocomplete
                    v-model="selectedAlbumId"
                    :items="albumOptions"
                    item-title="title"
                    item-value="id"
                    label="Add to album (optional)"
                    prepend-inner-icon="mdi-folder-multiple-image"
                    variant="outlined"
                    :disabled="uploading || checkingStorage"
                    :loading="albumsLoading"
                    clearable
                    @update:search="onAlbumSearch"
                  />
                </v-col>
                <v-col cols="12" md="5">
                  <v-text-field
                    v-model="newAlbumTitle"
                    label="Or create new album"
                    placeholder="e.g., Summer 2025"
                    prepend-inner-icon="mdi-plus"
                    variant="outlined"
                    :disabled="uploading || checkingStorage"
                  />
                </v-col>
              </v-row>

              <!-- Caption Input -->
              <v-text-field
                v-model="caption"
                label="Caption (optional)"
                variant="outlined"
                class="mt-4"
                :disabled="uploading || !storageConfigured"
                placeholder="Add a caption for all uploaded photos"
              ></v-text-field>
              
              <!-- Upload Progress -->
              <div v-if="uploading" class="mt-4">
                <v-progress-linear
                  :model-value="uploadProgress"
                  color="primary"
                  height="8"
                  rounded
                ></v-progress-linear>
                <div class="text-caption mt-2">
                  Uploading... {{ uploadProgress }}%
                </div>
              </div>
              
              <!-- Upload Button -->
              <div class="mt-6">
                <v-btn
                  color="primary"
                  size="large"
                  :loading="uploading"
                  :disabled="!selectedFiles?.length || !storageConfigured || checkingStorage"
                  @click="uploadFiles"
                >
                  <v-icon class="me-2">mdi-cloud-upload</v-icon>
                  Upload {{ selectedFiles?.length || 0 }} Photo{{ selectedFiles?.length !== 1 ? 's' : '' }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
          
          <!-- Upload Results -->
          <v-card v-if="uploadResults.length" class="mt-6">
            <v-card-title>Upload Results</v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item
                  v-for="result in uploadResults"
                  :key="result.id"
                  class="mb-2"
                >
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>{{ result.filename }}</v-list-item-title>
                  <v-list-item-subtitle>
                    Size: {{ formatFileSize(result.size) }} | Type: {{ result.mime }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
    
    <!-- Success Snackbar -->
    <v-snackbar
      v-model="showSuccessSnackbar"
      color="success"
      timeout="5000"
      location="top"
    >
      <div class="d-flex align-center">
        <v-icon class="me-2">mdi-check-circle</v-icon>
        {{ successMessage }}
      </div>
      
      <template v-slot:actions>
        <v-btn
          color="white"
          variant="text"
          @click="showSuccessSnackbar = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
// Require authentication and setup
definePageMeta({
  middleware: ['setup', 'auth']
})

const selectedFiles = ref(null)
const caption = ref('')
const selectedAlbumId = ref<string | null>(null)
const newAlbumTitle = ref('')
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadResults = ref([])
const showSuccessSnackbar = ref(false)
const successMessage = ref('')

const { uploadFiles: smartUploadFiles, checkStorageConfiguration } = useSmartUpload()
const api = useApi()

// Storage configuration state
const storageConfigured = ref(false)
const storageMessage = ref('')
const checkingStorage = ref(true)
const albumsLoading = ref(false)
const albumOptions = ref<any[]>([])

const normalizeTitle = (title?: string) => (title || '').trim().toLowerCase()

const findAlbumIdByTitle = (title: string) => {
  const normalized = normalizeTitle(title)
  const candidates = (albumOptions.value || []).filter((album) => {
    const candidateTitle = normalizeTitle(album.title || album.name)
    return candidateTitle === normalized
  })
  if (!candidates.length) return null
  candidates.sort((a, b) => {
    const aDate = new Date(a.created_at || a.updated_at || 0).getTime()
    const bDate = new Date(b.created_at || b.updated_at || 0).getTime()
    return bDate - aDate
  })
  return candidates[0]?.id || null
}

// Check storage configuration on mount
onMounted(async () => {
  const result = await checkStorageConfiguration()
  storageConfigured.value = result.configured
  if (!result.configured) {
    storageMessage.value = result.message || 'Storage not configured'
  }
  checkingStorage.value = false

  // Preload albums for selection
  await loadAlbums()
})

const handleFileChange = (files) => {
  console.log('Selected files:', files)
}

const loadAlbums = async () => {
  try {
    albumsLoading.value = true
    const res = await api.albums.list({ limit: 100 })
    if (res.success) {
      const results = (res.data?.results || []) as any[]
      albumOptions.value = results
    }
  } finally {
    albumsLoading.value = false
  }
}

const onAlbumSearch = async () => {
  if (!albumOptions.value?.length) await loadAlbums()
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const uploadFiles = async () => {
  if (!selectedFiles.value?.length) return
  
  uploading.value = true
  uploadProgress.value = 0
  uploadResults.value = []
  
  try {
    console.log('Starting smart upload for files:', selectedFiles.value)
    
    // Use the smart upload system
    // If a new album title is provided, create the album first
    let albumIdForUpload: string | undefined = selectedAlbumId.value || undefined
    const trimmedNewAlbumTitle = newAlbumTitle.value.trim()
    if (trimmedNewAlbumTitle) {
      const res = await api.albums.create({ title: trimmedNewAlbumTitle })
      if (res.success) {
        albumIdForUpload = (res.data as any)?.id
        // refresh album selector so the new album is selectable
        await loadAlbums()
        if (!albumIdForUpload) {
          const resolvedId = findAlbumIdByTitle(trimmedNewAlbumTitle)
          if (resolvedId) {
            albumIdForUpload = resolvedId
          } else {
            console.warn('Created album but could not resolve its ID; photos will not be linked automatically.')
          }
        }
        if (albumIdForUpload) {
          selectedAlbumId.value = albumIdForUpload
        }
      } else {
        alert(res.error || 'Failed to create album')
      }
    }

    const results = await smartUploadFiles(
      selectedFiles.value,
      // Progress callback for individual files
      (fileId, progress) => {
        console.log(`File ${fileId}: ${progress}%`)
        // Calculate overall progress (simple average)
        uploadProgress.value = Math.round(progress / selectedFiles.value.length)
      },
      // File completion callback
      (fileId, result) => {
        console.log(`File ${fileId} completed:`, result)
        uploadResults.value.push({
          id: result.assetId,
          filename: selectedFiles.value.find(f => f.name)?.name || 'Unknown',
          size: selectedFiles.value.find(f => f.name)?.size || 0,
          mime: selectedFiles.value.find(f => f.name)?.type || 'Unknown'
        })
      },
      // Error callback
      (fileId, error) => {
        console.error(`File ${fileId} failed:`, error)
        // You could show individual file errors here
      },
      { caption: caption.value || undefined }
    )
    
    uploadProgress.value = 100
    
    // If an album was selected/created, add uploaded assets to it
    const completedIds = (results || [])
      .filter(r => r.status === 'completed' && r.assetId)
      .map(r => r.assetId)
    if (albumIdForUpload && completedIds.length) {
      try {
        const addRes = await api.albums.addPhotos(albumIdForUpload, completedIds)
        if (!addRes.success) {
          console.warn('Failed to add photos to album:', addRes.error)
        }
      } catch (e) {
        console.warn('Album addPhotos error:', e)
      }
    }
    
    // Reset form
    selectedFiles.value = null
    caption.value = ''
    selectedAlbumId.value = null
    newAlbumTitle.value = ''
    
    // Show success message
    const successCount = results.filter(r => r.status === 'completed').length
    const errorCount = results.filter(r => r.status === 'error').length
    
    if (successCount > 0) {
      successMessage.value = `Successfully uploaded ${successCount} photo${successCount !== 1 ? 's' : ''}!`
      if (errorCount > 0) {
        successMessage.value += ` (${errorCount} failed)`
      }
      showSuccessSnackbar.value = true
    } else {
      alert('All uploads failed. Please try again.')
    }
    
  } catch (error) {
    console.error('Upload failed:', error)
    alert('Upload failed: ' + error.message)
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}
</script>

<style scoped>
.upload-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem 0;
}
</style>
