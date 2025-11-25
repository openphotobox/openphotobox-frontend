<script setup lang="ts">
// Require authentication and setup
definePageMeta({
  middleware: ['setup', 'auth']
})

// Import components
import JustifiedGallery from '~/components/JustifiedGallery.vue'
import ImageViewerV2 from '~/components/ImageViewerV2.vue'
import { useAuthStore } from '~/stores/auth'

const api = useApi()
const authStore = useAuthStore()

// Check if user is admin
const isAdmin = computed(() => authStore.isAdmin)

// Fetch liked assets
const assets = ref([])
const pending = ref(true)
const error = ref(null)
const showAssetDialog = ref(false)
const selectedAsset = ref(null)

// Fetch liked photos
const fetchLikedPhotos = async () => {
  try {
    pending.value = true
    error.value = null
    
    const response = await api.likes.getLikedPhotos({ limit: 1000 })
    
    if (response.success) {
      // Handle both array and paginated response formats
      const data = response.data
      const assetsList = data?.results || (Array.isArray(data) ? data : [])
      
      assets.value = assetsList.map((asset: any) => ({
        ...asset,
        src: asset.thumbnail_urls?.md || asset.thumbnail_urls?.sm || asset.thumbnail_url || asset.original_url || asset.storage_url,
        width: asset.width || 1920,
        height: asset.height || 1080,
        alt: asset.description || 'Photo'
      }))
    } else {
      error.value = new Error(response.error || 'Failed to fetch liked photos')
    }
  } catch (err: any) {
    error.value = err
  } finally {
    pending.value = false
  }
}

const openAsset = (asset: any) => {
  selectedAsset.value = asset
  showAssetDialog.value = true
}

const handleAssetDeleted = (deletedId: string) => {
  // Remove from assets list
  assets.value = assets.value.filter(a => a.id !== deletedId)
  selectedAsset.value = null
}

// Fetch liked photos on mount
onMounted(fetchLikedPhotos)

// Set page title
useHead({
  title: 'Liked Photos - OpenPhotobox'
})
</script>

<template>
  <div class="liked-photos">
    <!-- Loading State -->
    <div v-if="pending" class="loading-container">
      <v-progress-circular size="64" color="primary" indeterminate></v-progress-circular>
      <div class="text-h6 mt-4">Loading liked photos...</div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
      <div class="text-h6 mb-2">Failed to load liked photos</div>
      <div class="text-body-1 text-medium-emphasis mb-4">{{ error?.message || 'Unknown error' }}</div>
      <v-btn color="primary" @click="fetchLikedPhotos">Try Again</v-btn>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="assets.length === 0" class="empty-container">
      <v-icon size="64" color="grey" class="mb-4">mdi-heart-outline</v-icon>
      <div class="text-h6 mb-2">No liked photos yet</div>
      <div class="text-body-1 text-medium-emphasis mb-4">
        Photos you like will appear here
      </div>
      <v-btn color="primary" to="/" prepend-icon="mdi-home">
        Browse Photos
      </v-btn>
    </div>
    
    <!-- Liked Photos Gallery -->
    <div v-else class="liked-photos-content">
      <v-row>
        <v-col cols="12">
          <v-card class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon class="me-2" color="red">mdi-heart</v-icon>
              Liked Photos
              <v-spacer></v-spacer>
              <v-chip color="primary" variant="flat">
                {{ assets.length }} photo{{ assets.length !== 1 ? 's' : '' }}
              </v-chip>
            </v-card-title>
          </v-card>
        </v-col>
      </v-row>

      <JustifiedGallery
        :images="assets"
        :targetRowHeight="220"
        :gap="4"
        lastRow="left"
        @item-click="openAsset"
      />
    </div>

    <!-- Image Viewer V2 -->
    <ImageViewerV2
      v-model="showAssetDialog"
      :asset="selectedAsset"
      :assets="assets"
      :show-delete="isAdmin"
      :show-add-to-album="isAdmin"
      @asset-changed="(newAsset) => selectedAsset = newAsset"
      @asset-deleted="handleAssetDeleted"
    />
  </div>
</template>

<style scoped>
.liked-photos {
  min-height: 100vh;
  padding: 1rem;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
  padding: 2rem;
}

.loading-container {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.error-container {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.empty-container {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.liked-photos-content {
  width: 100%;
  max-width: 100%;
}

/* Dark theme adjustments */
:deep(.v-theme--dark) .loading-container {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

:deep(.v-theme--dark) .error-container {
  background: linear-gradient(135deg, #1f1a1a 0%, #2d1a1a 100%);
}

:deep(.v-theme--dark) .empty-container {
  background: linear-gradient(135deg, #1f1a1a 0%, #2d1a1a 100%);
}
</style>

