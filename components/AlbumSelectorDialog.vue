<template>
  <v-dialog v-model="isOpen" max-width="600" @update:model-value="handleDialogChange">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-folder-multiple-image</v-icon>
        Add to Album
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="close"
        ></v-btn>
      </v-card-title>
      
      <v-card-text>
        <div v-if="assetCount > 1" class="mb-4">
          <v-alert type="info" variant="tonal" density="compact">
            Adding {{ assetCount }} photos to album
          </v-alert>
        </div>

        <!-- Search albums -->
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search albums..."
          variant="outlined"
          density="compact"
          clearable
          class="mb-4"
        ></v-text-field>

        <!-- Create new album -->
        <v-card variant="outlined" class="mb-4 cursor-pointer" @click="toggleCreateMode">
          <v-card-text class="d-flex align-center py-3">
            <v-icon :color="createMode ? 'primary' : 'default'" class="me-3">
              {{ createMode ? 'mdi-minus-circle' : 'mdi-plus-circle' }}
            </v-icon>
            <span :class="createMode ? 'text-primary' : ''">
              {{ createMode ? 'Cancel' : 'Create New Album' }}
            </span>
          </v-card-text>
        </v-card>

        <!-- Create album form -->
        <v-expand-transition>
          <v-card v-if="createMode" variant="outlined" class="mb-4">
            <v-card-text>
              <v-form ref="createForm" v-model="createFormValid">
                <v-text-field
                  v-model="newAlbumTitle"
                  label="Album Name"
                  :rules="[v => !!v || 'Album name is required']"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-folder"
                  class="mb-2"
                ></v-text-field>
                
                <v-textarea
                  v-model="newAlbumDescription"
                  label="Description (optional)"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  class="mb-2"
                ></v-textarea>
                
                <v-btn
                  color="primary"
                  block
                  @click="createAndAddToAlbum"
                  :disabled="!createFormValid"
                  :loading="creatingAlbum"
                >
                  Create & Add Photos
                </v-btn>
              </v-form>
            </v-card-text>
          </v-card>
        </v-expand-transition>

        <!-- Album list -->
        <div v-if="!createMode" class="album-list">
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <div class="text-caption mt-2">Loading albums...</div>
          </div>

          <v-alert v-else-if="filteredAlbums.length === 0" type="info" variant="outlined">
            {{ searchQuery ? 'No albums found matching your search' : 'No albums yet. Create your first album above!' }}
          </v-alert>

          <v-list v-else lines="two">
            <v-list-item
              v-for="album in filteredAlbums"
              :key="album.id"
              @click="addToAlbum(album.id)"
              :disabled="addingToAlbum"
              class="album-item"
            >
              <template v-slot:prepend>
                <v-avatar size="56" rounded>
                  <v-img
                    v-if="album.cover_url"
                    :src="album.cover_url"
                    cover
                  ></v-img>
                  <v-icon v-else size="32">mdi-folder-image</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title>{{ album.title || album.name }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ album.photo_count || 0 }} photos
                <span v-if="album.description" class="ms-2">
                  • {{ album.description.substring(0, 50) }}{{ album.description.length > 50 ? '...' : '' }}
                </span>
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="text"
                  color="primary"
                ></v-btn>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>
    </v-card>

    <!-- Success snackbar -->
    <v-snackbar
      v-model="showSuccess"
      color="success"
      :timeout="3000"
    >
      <v-icon class="me-2">mdi-check-circle</v-icon>
      {{ successMessage }}
    </v-snackbar>

    <!-- Error snackbar -->
    <v-snackbar
      v-model="showError"
      color="error"
      :timeout="5000"
    >
      <v-icon class="me-2">mdi-alert-circle</v-icon>
      {{ errorMessage }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Album } from '@/api/types/albums'

const props = defineProps<{
  modelValue: boolean
  assetIds: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'added': [albumId: string, albumTitle: string]
}>()

const api = useApi()

// Dialog state
const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Albums data
const albums = ref<Album[]>([])
const loading = ref(false)
const searchQuery = ref('')

// Create mode
const createMode = ref(false)
const createFormValid = ref(false)
const creatingAlbum = ref(false)
const newAlbumTitle = ref('')
const newAlbumDescription = ref('')

// Add to album
const addingToAlbum = ref(false)

// Notifications
const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const assetCount = computed(() => props.assetIds.length)

const filteredAlbums = computed(() => {
  if (!searchQuery.value) return albums.value
  
  const query = searchQuery.value.toLowerCase()
  return albums.value.filter(album => {
    const title = (album.title || album.name || '').toLowerCase()
    const description = (album.description || '').toLowerCase()
    return title.includes(query) || description.includes(query)
  })
})

const loadAlbums = async () => {
  loading.value = true
  try {
    const response = await api.albums.list({ limit: 100 })
    if (response.success) {
      albums.value = (response.data?.results || response.data || []) as Album[]
    } else {
      showErrorMessage('Failed to load albums: ' + response.error)
    }
  } catch (error: any) {
    showErrorMessage('Error loading albums: ' + error.message)
  } finally {
    loading.value = false
  }
}

const toggleCreateMode = () => {
  createMode.value = !createMode.value
  if (!createMode.value) {
    newAlbumTitle.value = ''
    newAlbumDescription.value = ''
  }
}

const createAndAddToAlbum = async () => {
  if (!createFormValid.value) return
  
  creatingAlbum.value = true
  try {
    // Create the album
    const createResponse = await api.albums.create({
      title: newAlbumTitle.value,
      description: newAlbumDescription.value
    })
    
    if (!createResponse.success) {
      showErrorMessage('Failed to create album: ' + createResponse.error)
      return
    }
    
    const newAlbum = createResponse.data as Album
    
    // Add photos to the new album
    const addResponse = await api.albums.addPhotos(newAlbum.id, props.assetIds)
    
    if (addResponse.success) {
      const albumName = newAlbum.title || newAlbum.name || 'new album'
      showSuccessMessage(`Added ${assetCount.value} photo${assetCount.value > 1 ? 's' : ''} to "${albumName}"`)
      emit('added', newAlbum.id, albumName)
      
      // Reset form and reload albums
      newAlbumTitle.value = ''
      newAlbumDescription.value = ''
      createMode.value = false
      await loadAlbums()
      
      // Close dialog after a short delay
      setTimeout(() => {
        close()
      }, 1500)
    } else {
      showErrorMessage('Failed to add photos: ' + addResponse.error)
    }
  } catch (error: any) {
    showErrorMessage('Error: ' + error.message)
  } finally {
    creatingAlbum.value = false
  }
}

const addToAlbum = async (albumId: string) => {
  addingToAlbum.value = true
  try {
    // Find the album name from the local list before making the API call
    const selectedAlbum = albums.value.find(a => a.id === albumId)
    const albumName = selectedAlbum?.title || selectedAlbum?.name || 'album'
    
    const response = await api.albums.addPhotos(albumId, props.assetIds)
    
    if (response.success) {
      showSuccessMessage(`Added ${assetCount.value} photo${assetCount.value > 1 ? 's' : ''} to "${albumName}"`)
      emit('added', albumId, albumName)
      
      // Close dialog after a short delay
      setTimeout(() => {
        close()
      }, 1500)
    } else {
      showErrorMessage('Failed to add photos: ' + response.error)
    }
  } catch (error: any) {
    showErrorMessage('Error: ' + error.message)
  } finally {
    addingToAlbum.value = false
  }
}

const close = () => {
  isOpen.value = false
}

const handleDialogChange = (val: boolean) => {
  if (val) {
    loadAlbums()
  } else {
    // Reset state when closing
    searchQuery.value = ''
    createMode.value = false
    newAlbumTitle.value = ''
    newAlbumDescription.value = ''
  }
}

const showSuccessMessage = (message: string) => {
  successMessage.value = message
  showSuccess.value = true
}

const showErrorMessage = (message: string) => {
  errorMessage.value = message
  showError.value = true
}

// Load albums when dialog opens
watch(isOpen, (newVal) => {
  if (newVal) {
    loadAlbums()
  }
})
</script>

<style scoped>
.album-list {
  max-height: 400px;
  overflow-y: auto;
}

.album-item {
  cursor: pointer;
  transition: background-color 0.2s;
}

.album-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.cursor-pointer {
  cursor: pointer;
}
</style>

