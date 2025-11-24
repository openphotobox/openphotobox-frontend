<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2">mdi-upload</v-icon>
            Upload Photos
            <v-spacer></v-spacer>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-cog"
              @click="showBatchSettings = true"
            >
              Batch Settings
            </v-btn>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <!-- File dropzone -->
            <v-file-input
              v-model="selectedFiles"
              multiple
              accept="image/*,video/*"
              label="Drop photos here or click to browse"
              prepend-icon="mdi-camera"
              show-size
              counter
              :rules="fileRules"
              @change="handleFileSelection"
            ></v-file-input>

            <!-- Upload progress -->
            <div v-if="uploading" class="mt-4">
              <div class="d-flex align-center mb-2">
                <v-icon class="me-2">mdi-progress-upload</v-icon>
                Uploading files...
              </div>
              <v-progress-linear
                v-model="uploadProgress"
                color="primary"
                height="8"
                rounded
              ></v-progress-linear>
              <div class="text-caption text-grey mt-1">
                {{ uploadedCount }} of {{ totalFiles }} files uploaded
              </div>
            </div>

            <!-- Batch defaults -->
            <v-expand-transition>
              <div v-if="showBatchDefaults">
                <v-divider class="my-4"></v-divider>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="batchDefaults.caption"
                      label="Default Caption"
                      hint="Applied to all photos in this batch"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="batchDefaults.keywords"
                      label="Default Keywords"
                      hint="Comma separated"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="batchDefaults.album"
                      :items="albumOptions"
                      label="Add to Album"
                      clearable
                    ></v-select>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="batchDefaults.visibility"
                      :items="visibilityOptions"
                      label="Visibility"
                    ></v-select>
                  </v-col>
                </v-row>
              </div>
            </v-expand-transition>

            <!-- Action buttons -->
            <div class="d-flex align-center mt-4">
              <v-btn
                color="primary"
                size="large"
                prepend-icon="mdi-upload"
                @click="startUpload"
                :disabled="!selectedFiles.length || uploading"
                :loading="uploading"
              >
                Upload {{ selectedFiles.length }} Files
              </v-btn>
              
              <v-btn
                variant="text"
                class="ms-2"
                @click="showBatchDefaults = !showBatchDefaults"
                v-if="selectedFiles.length > 0"
              >
                {{ showBatchDefaults ? 'Hide' : 'Show' }} Batch Settings
              </v-btn>
              
              <v-spacer></v-spacer>
              
              <v-btn
                variant="outlined"
                @click="clearSelection"
                :disabled="!selectedFiles.length"
              >
                Clear Selection
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Batch Settings Dialog -->
    <v-dialog v-model="showBatchSettings" max-width="600">
      <v-card>
        <v-card-title>Batch Upload Settings</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="globalSettings.defaultCaption"
                label="Default Caption"
                hint="Applied to all uploads"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="globalSettings.defaultKeywords"
                label="Default Keywords"
                hint="Comma separated"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="globalSettings.defaultAlbum"
                :items="albumOptions"
                label="Default Album"
                clearable
              ></v-select>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="globalSettings.defaultVisibility"
                :items="visibilityOptions"
                label="Default Visibility"
              ></v-select>
            </v-col>
            <v-col cols="12">
              <v-switch
                v-model="globalSettings.autoProcess"
                label="Auto-process faces and generate thumbnails"
                color="primary"
              ></v-switch>
            </v-col>
            <v-col cols="12">
              <v-switch
                v-model="globalSettings.generateClipEmbeddings"
                label="Generate CLIP embeddings for search"
                color="primary"
              ></v-switch>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showBatchSettings = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Upload Results Dialog -->
    <v-dialog v-model="showResults" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2" color="success">mdi-check-circle</v-icon>
          Upload Complete
        </v-card-title>
        <v-card-text>
          <div class="mb-4">
            <div class="text-h6 mb-2">Summary</div>
            <div class="d-flex flex-wrap">
              <v-chip color="success" class="ma-1">
                {{ uploadResults.success }} uploaded
              </v-chip>
              <v-chip v-if="uploadResults.failed > 0" color="error" class="ma-1">
                {{ uploadResults.failed }} failed
              </v-chip>
              <v-chip v-if="uploadResults.skipped > 0" color="warning" class="ma-1">
                {{ uploadResults.skipped }} skipped
              </v-chip>
            </div>
          </div>
          
          <div v-if="uploadResults.errors.length" class="mb-4">
            <div class="text-h6 mb-2">Errors</div>
            <v-list density="compact">
              <v-list-item
                v-for="error in uploadResults.errors"
                :key="error.file"
                :title="error.file"
                :subtitle="error.message"
                prepend-icon="mdi-alert-circle"
                color="error"
              ></v-list-item>
            </v-list>
          </div>
          
          <div class="text-caption text-grey">
            Files are being processed in the background. You can view them in the Timeline once processing is complete.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showResults = false">Close</v-btn>
          <v-btn
            color="primary"
            @click="navigateTo('/timeline')"
          >
            View Timeline
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
const selectedFiles = ref([])
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadedCount = ref(0)
const totalFiles = ref(0)
const showBatchDefaults = ref(false)
const showBatchSettings = ref(false)
const showResults = ref(false)

const batchDefaults = ref({
  caption: '',
  keywords: '',
  album: null,
  visibility: 'shared'
})

const globalSettings = ref({
  defaultCaption: '',
  defaultKeywords: '',
  defaultAlbum: null,
  defaultVisibility: 'shared',
  autoProcess: true,
  generateClipEmbeddings: true
})

const albumOptions = ref(['Christmas 2023', 'Summer Vacation', 'Birthday Party', 'Family Reunion'])
const visibilityOptions = ref([
  { title: 'Shared', value: 'shared' },
  { title: 'Private', value: 'private' }
])

const uploadResults = ref({
  success: 0,
  failed: 0,
  skipped: 0,
  errors: []
})

const fileRules = [
  value => {
    if (!value || value.length === 0) return true
    const maxSize = 50 * 1024 * 1024 // 50MB
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov']
    
    for (const file of value) {
      if (file.size > maxSize) {
        return 'File size must be less than 50MB'
      }
      if (!validTypes.includes(file.type)) {
        return 'Only image and video files are allowed'
      }
    }
    return true
  }
]

const handleFileSelection = (files) => {
  if (files && files.length > 0) {
    // Apply global defaults
    batchDefaults.value.caption = globalSettings.value.defaultCaption
    batchDefaults.value.keywords = globalSettings.value.defaultKeywords
    batchDefaults.value.album = globalSettings.value.defaultAlbum
    batchDefaults.value.visibility = globalSettings.value.defaultVisibility
  }
}

const startUpload = async () => {
  if (!selectedFiles.value.length) return
  
  uploading.value = true
  uploadProgress.value = 0
  uploadedCount.value = 0
  totalFiles.value = selectedFiles.value.length
  
  const api = useApi()
  const uploadedFiles = []
  const errors = []
  
  try {
    // Process each file
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
      
      try {
        // Create FormData for direct upload
        const formData = new FormData()
        formData.append('file', file)
        
        // Add metadata if provided
        const metadata = {}
        if (batchDefaults.value.caption) {
          metadata.description = batchDefaults.value.caption
        }
        if (Object.keys(metadata).length > 0) {
          formData.append('metadata', JSON.stringify(metadata))
        }
        
        // Direct upload to backend
        const uploadResponse = await api.upload.uploadFile(formData)
        
        if (!uploadResponse.success) {
          throw new Error(uploadResponse.error || 'Failed to upload file')
        }
        
        const asset = uploadResponse.data
        
        // Add to uploaded files list
        uploadedFiles.push({
          id: asset.id,
          filename: file.name,
          size: file.size,
          caption: batchDefaults.value.caption,
          keywords: batchDefaults.value.keywords ? batchDefaults.value.keywords.split(',').map(k => k.trim()) : [],
          album_id: batchDefaults.value.album,
          visibility: batchDefaults.value.visibility
        })
        
        uploadedCount.value++
        uploadProgress.value = (uploadedCount.value / totalFiles.value) * 100
        
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        errors.push({
          file: file.name,
          message: error.message || 'Upload failed'
        })
      }
    }
    
    // Log completed uploads
    if (uploadedFiles.length > 0) {
      console.log('Upload completed:', uploadedFiles)
      
      uploadResults.value = {
        success: uploadedFiles.length,
        failed: errors.length,
        skipped: 0,
        errors: errors
      }
    } else {
      uploadResults.value = {
        success: 0,
        failed: selectedFiles.value.length,
        skipped: 0,
        errors: errors
      }
    }
    
    showResults.value = true
    clearSelection()
    
  } catch (error) {
    console.error('Upload failed:', error)
    uploadResults.value = {
      success: 0,
      failed: selectedFiles.value.length,
      skipped: 0,
      errors: [{ file: 'Upload failed', message: error.message }]
    }
    showResults.value = true
  } finally {
    uploading.value = false
  }
}

const clearSelection = () => {
  selectedFiles.value = []
  batchDefaults.value = {
    caption: '',
    keywords: '',
    album: null,
    visibility: 'shared'
  }
}
</script>
