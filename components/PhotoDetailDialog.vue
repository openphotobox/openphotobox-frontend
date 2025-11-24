<template>
  <v-dialog v-model="isOpen" max-width="1200" fullscreen>
    <v-card v-if="asset" class="photo-detail-dialog">
      <!-- Header -->
      <v-toolbar color="primary" dark class="photo-toolbar">
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        
        <v-toolbar-title class="d-flex align-center">
          <v-icon class="me-2">mdi-image</v-icon>
          Photo Details
        </v-toolbar-title>
        
        <v-spacer></v-spacer>
        
        <!-- Action buttons -->
        <v-btn icon @click="downloadPhoto" title="Download">
          <v-icon>mdi-download</v-icon>
        </v-btn>
        
        <v-btn icon @click="sharePhoto" title="Share">
          <v-icon>mdi-share</v-icon>
        </v-btn>
        
        <v-btn icon @click="toggleFavorite" :color="isFavorite ? 'yellow' : 'white'" title="Favorite">
          <v-icon>{{ isFavorite ? 'mdi-heart' : 'mdi-heart-outline' }}</v-icon>
        </v-btn>
        
        <v-btn icon @click="deletePhoto" color="error" title="Delete">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </v-toolbar>
      
      <!-- Content -->
      <div class="photo-detail-content">
        <!-- Image Section -->
        <div class="image-section">
          <div class="image-container">
            <!-- Navigation arrows -->
            <v-btn
              v-if="hasPrevious"
              icon
              @click="goToPrevious"
              class="nav-arrow nav-arrow-left"
              size="large"
              color="white"
              variant="elevated"
            >
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>
            
            <v-btn
              v-if="hasNext"
              icon
              @click="goToNext"
              class="nav-arrow nav-arrow-right"
              size="large"
              color="white"
              variant="elevated"
            >
              <v-icon>mdi-chevron-right</v-icon>
            </v-btn>
            
            <!-- Image with face overlays -->
            <div class="image-wrapper" ref="imageWrapperRef">
              <div 
                class="image-container" 
                ref="imageContainerRef"
                @mouseenter="handleMouseEnter"
                @mouseleave="handleMouseLeave"
              >
                <!-- Show fallback message if no valid image URL -->
                <div v-if="!hasValidImageUrl" class="image-fallback">
                  <v-icon size="64" color="grey">mdi-image-off</v-icon>
                  <p class="text-h6 mt-4">No image available</p>
                  <p class="text-body-2 text-grey">Image URL is missing or invalid</p>
                </div>
                
                <!-- Show image if URL is valid -->
                <v-img
                  v-else
                  ref="imageRef"
                  :src="currentImageUrl"
                  :alt="asset.description || 'Photo'"
                  class="detail-image"
                  :class="{ 'panning': isPanning, 'loading': isImageLoading || isFullImageLoading }"
                  contain
                  @load="onImageLoad"
                  @error="onImageError"
                  @mousedown="startPan"
                  @mousemove="pan"
                  @mouseup="endPan"
                  @mouseleave="endPan"
                >
                  <template v-slot:placeholder>
                    <v-row class="fill-height ma-0" align="center" justify="center">
                      <v-progress-circular size="64" indeterminate color="primary"></v-progress-circular>
                    </v-row>
                  </template>
                </v-img>
                
                <!-- Face detection overlays (only show if image is valid) -->
                <div
                  v-for="face in asset.faces"
                  :key="face.id"
                  class="face-overlay"
                  :style="getFaceOverlayStyle(face)"
                  @mouseenter="hoveredFace = face"
                  @mouseleave="hoveredFace = null"
                  @click="selectFace(face)"
                >
                  <div class="face-box">
                    <div class="face-label" v-if="hoveredFace?.id === face.id">
                      {{ face.person?.display_name || 'Unknown Person' }}
                      <span class="confidence">({{ Math.round(face.confidence * 100) }}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Image controls -->
          <div class="image-controls">
            <v-btn
              icon
              @click="zoomOut"
              :disabled="zoomLevel <= 0.5"
            >
              <v-icon>mdi-magnify-minus</v-icon>
            </v-btn>
            
            <v-slider
              v-model="zoomLevel"
              min="0.5"
              max="3"
              step="0.1"
              class="zoom-slider"
              hide-details
            ></v-slider>
            
            <v-btn
              icon
              @click="zoomIn"
              :disabled="zoomLevel >= 3"
            >
              <v-icon>mdi-magnify-plus</v-icon>
            </v-btn>
            
            <v-btn
              icon
              @click="resetZoom"
            >
              <v-icon>mdi-fit-to-screen</v-icon>
            </v-btn>
          </div>
        </div>
        
        <!-- Details Section -->
        <div class="details-section">
          <v-card elevation="0" class="details-card">
            <v-card-text class="pa-6">
              <!-- Description (at the top) -->
              <div v-if="asset.description" class="info-section mb-6">
                <h3 class="section-title mb-4">
                  <v-icon class="me-2">mdi-text</v-icon>
                  Description
                </h3>
                <div class="caption-text" v-html="formatDescription(asset.description)"></div>
              </div>
              
              <!-- Basic Info -->
              <div class="info-section mb-6">
                <h3 class="section-title mb-4">
                  <v-icon class="me-2">mdi-information</v-icon>
                  Information
                </h3>
                
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">📅 Date Taken</span>
                    <span class="info-value">{{ formatDate(asset.taken_at) }}</span>
                  </div>
                  
                  <div class="info-item">
                    <span class="info-label">📏 Image Size</span>
                    <span class="info-value">{{ actualImageDimensions.width }} × {{ actualImageDimensions.height }} pixels</span>
                  </div>
                  
                  <div class="info-item">
                    <span class="info-label">📁 File Type</span>
                    <span class="info-value">{{ asset.mime_type || 'Unknown' }}</span>
                  </div>
                  
                  <div class="info-item">
                    <span class="info-label">⬆️ Uploaded</span>
                    <span class="info-value">{{ formatDate(asset.created_at) }}</span>
                  </div>
                  
                  <div class="info-item">
                    <span class="info-label">👁️ Visibility</span>
                    <v-chip
                      :color="asset.visibility === 'shared' ? 'success' : 'warning'"
                      variant="tonal"
                      size="small"
                    >
                      {{ asset.visibility }}
                    </v-chip>
                  </div>
                </div>
              </div>
              
              <!-- Keywords -->
              <div v-if="asset.keywords?.length" class="info-section mb-6">
                <h3 class="section-title mb-4">
                  <v-icon class="me-2">mdi-tag</v-icon>
                  Keywords
                </h3>
                <div class="keywords-container">
                  <v-chip
                    v-for="keyword in asset.keywords"
                    :key="keyword"
                    size="small"
                    class="ma-1"
                    color="primary"
                    variant="tonal"
                  >
                    {{ keyword }}
                  </v-chip>
                </div>
              </div>
              
              <!-- People -->
              <div v-if="asset.faces?.length" class="info-section mb-6">
                <h3 class="section-title mb-4">
                  <v-icon class="me-2">mdi-account-group</v-icon>
                  People
                </h3>
                <div class="people-container">
                  <div
                    v-for="face in asset.faces"
                    :key="face.id"
                    class="person-item"
                  >
                    <v-avatar size="40" class="me-3">
                      <v-img :src="face.person?.avatar_url || '/placeholder-avatar.jpg'"></v-img>
                    </v-avatar>
                    <div class="person-info">
                      <div class="person-name">{{ face.person?.display_name || 'Unknown' }}</div>
                      <div class="person-confidence">Confidence: {{ Math.round(face.confidence * 100) }}%</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- EXIF Data (if available) -->
              <div v-if="asset.metadata" class="info-section">
                <h3 class="section-title mb-4">
                  <v-icon class="me-2">mdi-camera</v-icon>
                  Camera Details
                </h3>
                <div class="info-grid">
                  <div v-if="asset.metadata.camera_make || asset.metadata.camera_model" class="info-item">
                    <span class="info-label">Camera</span>
                    <span class="info-value">{{ asset.metadata.camera_make }} {{ asset.metadata.camera_model }}</span>
                  </div>
                  
                  <div v-if="asset.metadata.lens_model" class="info-item">
                    <span class="info-label">Lens</span>
                    <span class="info-value">{{ asset.metadata.lens_model }}</span>
                  </div>
                  
                  <div v-if="asset.metadata.aperture" class="info-item">
                    <span class="info-label">Aperture</span>
                    <span class="info-value">{{ asset.metadata.aperture }}</span>
                  </div>
                  
                  <div v-if="asset.metadata.shutter_speed" class="info-item">
                    <span class="info-label">Shutter Speed</span>
                    <span class="info-value">{{ asset.metadata.shutter_speed }}</span>
                  </div>
                  
                  <div v-if="asset.metadata.focal_length" class="info-item">
                    <span class="info-label">Focal Length</span>
                    <span class="info-value">{{ asset.metadata.focal_length }}</span>
                  </div>
                  
                  <div v-if="asset.metadata.iso" class="info-item">
                    <span class="info-label">ISO</span>
                    <span class="info-value">{{ asset.metadata.iso }}</span>
                  </div>
                  
                  <div v-if="asset.metadata.white_balance" class="info-item">
                    <span class="info-label">White Balance</span>
                    <span class="info-value">{{ asset.metadata.white_balance }}</span>
                  </div>
                  
                  <div v-if="asset.metadata.flash_fired !== null" class="info-item">
                    <span class="info-label">Flash</span>
                    <span class="info-value">{{ asset.metadata.flash_fired ? 'Fired' : 'No Flash' }}</span>
                  </div>
                  
                  <div v-if="asset.metadata.location_name" class="info-item">
                    <span class="info-label">Location</span>
                    <span class="info-value">{{ asset.metadata.location_name }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Processing Status -->
              <div v-else class="info-section">
                <h3 class="section-title mb-4">
                  <v-icon class="me-2">mdi-camera</v-icon>
                  Camera Details
                </h3>
                <div class="processing-notice">
                  <v-icon class="me-2" color="warning">mdi-clock-outline</v-icon>
                  <span class="text-body-2">Metadata is being processed...</span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  asset: {
    type: Object,
    default: null
  },
  assets: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'asset-deleted', 'asset-changed'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const zoomLevel = ref(1) // Start with normal size, will be adjusted by fitToWindow when dialog opens
const isFavorite = ref(false)
const api = useApi()

// Lazy loading for full images
const {
  currentImageUrl,
  isFullImageLoaded,
  isFullImageLoading,
  startLoadingFullImage,
  loadFullImage,
  handleMouseEnter,
  handleMouseLeave
} = useLazyImage(toRef(props, 'asset'), {
  loadDelay: 500, // Load full image after 500ms
  preloadOnHover: true
})

// Pan functionality
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const panOffset = ref({ x: 0, y: 0 })
const imageRef = ref(null)
const imageContainerRef = ref(null)
const imageWrapperRef = ref(null)

// Image loading state
const isImageLoading = ref(false)
const imageLoadTimeout = ref(null)

// Face overlay functionality
const hoveredFace = ref(null)

// Computed property to check if image URL is valid
const hasValidImageUrl = computed(() => {
  return props.asset?.original_url && typeof props.asset.original_url === 'string' && props.asset.original_url.length > 0
})

// Face overlay functions
const getFaceOverlayStyle = (face) => {
  if (!imageRef.value || !imageContainerRef.value) {
    return { display: 'none' }
  }

  const img = imageRef.value.$el?.querySelector('img')
  if (!img) {
    return { display: 'none' }
  }

  // Get the displayed image dimensions (after CSS scaling)
  const displayedWidth = img.offsetWidth
  const displayedHeight = img.offsetHeight
  
  if (!displayedWidth || !displayedHeight) {
    return { display: 'none' }
  }

  // Calculate face position based on displayed image dimensions
  // Face coordinates are normalized (0-1), so multiply by displayed dimensions
  const left = (face.x * displayedWidth) + 'px'
  const top = (face.y * displayedHeight) + 'px'
  const width = (face.w * displayedWidth) + 'px'
  const height = (face.h * displayedHeight) + 'px'

  return {
    position: 'absolute',
    left,
    top,
    width,
    height,
    pointerEvents: 'auto',
    zIndex: 10
  }
}

const selectFace = (face) => {
  // You can add functionality here to show face details or navigate to person
  console.log('Selected face:', face)
}


// Panning functions
function startPan(event) {
  if (zoomLevel.value <= 1) return // Only allow panning when zoomed in
  
  isPanning.value = true
  panStart.value = {
    x: event.clientX - panOffset.value.x,
    y: event.clientY - panOffset.value.y
  }
  event.preventDefault()
}

function pan(event) {
  if (!isPanning.value) return
  
  panOffset.value = {
    x: event.clientX - panStart.value.x,
    y: event.clientY - panStart.value.y
  }
  event.preventDefault()
}

function endPan() {
  isPanning.value = false
}

// Navigation logic
const currentAssetIndex = computed(() => {
  if (!props.asset || !props.assets.length) return -1
  return props.assets.findIndex(a => a.id === props.asset.id)
})

const hasPrevious = computed(() => currentAssetIndex.value > 0)
const hasNext = computed(() => currentAssetIndex.value < props.assets.length - 1)

// Get actual image dimensions from the loaded image
const actualImageDimensions = computed(() => {
  if (!imageRef.value) {
    return { width: 0, height: 0 }
  }
  
  const img = imageRef.value.$el?.querySelector('img')
  if (!img) {
    return { width: 0, height: 0 }
  }
  
  return {
    width: img.naturalWidth || img.offsetWidth || 0,
    height: img.naturalHeight || img.offsetHeight || 0
  }
})

const close = () => {
  isOpen.value = false
  resetZoom()
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown size'
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

const formatDescription = (description) => {
  if (!description) return ''
  
  // Escape HTML and convert newlines to <br> tags
  return description
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')
}

const zoomIn = () => {
  if (zoomLevel.value < 3) {
    zoomLevel.value = Math.min(3, zoomLevel.value + 0.2)
  }
}

const zoomOut = () => {
  if (zoomLevel.value > 0.5) {
    zoomLevel.value = Math.max(0.5, zoomLevel.value - 0.2)
  }
}

const fitToWindow = () => {
  // Calculate the optimal zoom level to fit the image in the container
  if (imageRef.value && imageContainerRef.value) {
    const img = imageRef.value.$el.querySelector('img')
    const container = imageContainerRef.value
    
    if (img && container) {
      const imgWidth = img.naturalWidth
      const imgHeight = img.naturalHeight
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      
      // Calculate scale factors for both dimensions
      const scaleX = containerWidth / imgWidth
      const scaleY = containerHeight / imgHeight
      
      // Use the smaller scale to ensure the image fits completely
      let scale = Math.min(scaleX, scaleY, 1)
      
      // Set minimum zoom to 0.7 to prevent images from being too small
      scale = Math.max(0.7, scale)
      
      zoomLevel.value = scale
      panOffset.value = { x: 0, y: 0 }
    }
  }
}

const resetZoom = () => {
  fitToWindow()
}


const downloadPhoto = () => {
  if (props.asset?.original_url) {
    const link = document.createElement('a')
    link.href = props.asset.original_url
    link.download = `photo-${props.asset.id}.jpg`
    link.click()
  }
}

const sharePhoto = () => {
  if (navigator.share && props.asset?.original_url) {
    navigator.share({
      title: 'Check out this photo',
      url: props.asset.original_url
    })
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(props.asset.original_url)
    // You could show a toast notification here
  }
}

const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
  // Here you would typically make an API call to update the favorite status
}

// Navigation functions
const goToPrevious = () => {
  if (hasPrevious.value) {
    isImageLoading.value = true
    startImageLoadTimeout()
    const prevAsset = props.assets[currentAssetIndex.value - 1]
    emit('asset-changed', prevAsset)
  }
}

const goToNext = () => {
  if (hasNext.value) {
    isImageLoading.value = true
    startImageLoadTimeout()
    const nextAsset = props.assets[currentAssetIndex.value + 1]
    emit('asset-changed', nextAsset)
  }
}

// Delete function
const deletePhoto = async () => {
  if (!props.asset) return
  
  // Show confirmation dialog
  const confirmed = confirm(`Are you sure you want to delete this photo? This action cannot be undone.`)
  if (!confirmed) return
  
  try {
    const response = await api.assets.delete(props.asset.id)
    if (response.success) {
      // Emit delete event to parent
      emit('asset-deleted', props.asset)
      
      // Navigate to next/previous photo or close dialog
      if (hasNext.value) {
        goToNext()
      } else if (hasPrevious.value) {
        goToPrevious()
      } else {
        close()
      }
    } else {
      alert('Failed to delete photo: ' + response.error)
    }
  } catch (error) {
    console.error('Error deleting photo:', error)
    alert('Failed to delete photo: ' + error.message)
  }
}

const onImageLoad = () => {
  // Clear any existing timeout
  if (imageLoadTimeout.value) {
    clearTimeout(imageLoadTimeout.value)
    imageLoadTimeout.value = null
  }
  
  // Image loaded successfully
  isImageLoading.value = false
  console.log('Image loaded successfully:', {
    asset: props.asset,
    url: props.asset?.original_url,
    faces: props.asset?.faces,
    facesLength: props.asset?.faces?.length
  })
  
  // Force re-render of face overlays after image loads
  nextTick(() => {
    // Trigger reactivity for face overlays
    if (props.asset?.faces?.length) {
      // Force update by triggering a reactive change
      hoveredFace.value = null
    }
  })
}

const onImageError = (error) => {
  // Clear any existing timeout
  if (imageLoadTimeout.value) {
    clearTimeout(imageLoadTimeout.value)
    imageLoadTimeout.value = null
  }
  
  // Image failed to load
  isImageLoading.value = false
  console.error('Image failed to load:', {
    error,
    asset: props.asset,
    url: props.asset?.original_url
  })
}

const startImageLoadTimeout = () => {
  // Clear any existing timeout
  if (imageLoadTimeout.value) {
    clearTimeout(imageLoadTimeout.value)
  }
  
  // Set a timeout to reset loading state if image doesn't load within 10 seconds
  imageLoadTimeout.value = setTimeout(() => {
    console.warn('Image load timeout - resetting loading state')
    isImageLoading.value = false
    imageLoadTimeout.value = null
  }, 10000)
}

// Watch for zoom level and pan changes to apply to image and face overlays
watch([zoomLevel, panOffset], ([newZoom, newPan]) => {
  const imageContainer = imageContainerRef.value
  if (imageContainer) {
    const transform = `scale(${newZoom}) translate(${newPan.x}px, ${newPan.y}px)`
    imageContainer.style.transform = transform
    imageContainer.style.transformOrigin = 'center center'
  }
}, { deep: true })

// Watch for asset changes to reset loading state and fit image
watch(() => props.asset, (newAsset, oldAsset) => {
  if (newAsset && newAsset.id !== oldAsset?.id) {
    console.log('Asset changed:', {
      newAsset,
      oldAsset,
      url: newAsset?.original_url
    })
    isImageLoading.value = true
    startImageLoadTimeout()
    // Reset zoom and pan when changing images
    panOffset.value = { x: 0, y: 0 }
    // Start loading full image after a short delay
    setTimeout(() => {
      startLoadingFullImage()
      fitToWindow()
    }, 50)
  }
})

// Watch for dialog opening to fit image to window (only on first open)
watch(isOpen, (newValue, oldValue) => {
  if (newValue && !oldValue && props.asset) {
    console.log('Dialog opened with asset:', {
      asset: props.asset,
      url: props.asset?.original_url
    })
    isImageLoading.value = true
    startImageLoadTimeout()
    // Start loading full image and fit to window when dialog first opens
    setTimeout(() => {
      startLoadingFullImage()
      fitToWindow()
    }, 100)
  }
})


// Keyboard event handling
const handleKeydown = (event) => {
  if (!isOpen.value) return
  
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      goToPrevious()
      break
    case 'ArrowRight':
      event.preventDefault()
      goToNext()
      break
    case 'Escape':
      event.preventDefault()
      close()
      break
    case 'Delete':
    case 'Backspace':
      event.preventDefault()
      deletePhoto()
      break
  }
}

// Add/remove event listeners
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  // Clean up any pending timeouts
  if (imageLoadTimeout.value) {
    clearTimeout(imageLoadTimeout.value)
    imageLoadTimeout.value = null
  }
})
</script>

<style scoped>
.photo-detail-dialog {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.photo-toolbar {
  flex-shrink: 0;
}

.photo-detail-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.image-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
  position: relative;
}

.image-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.image-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease-out;
}

.detail-image {
  max-width: 100%;
  max-height: 100%;
  cursor: grab;
  transition: opacity 0.2s ease;
}

.detail-image.loading {
  opacity: 0.7;
}

.detail-image:active {
  cursor: grabbing;
}

.detail-image.panning {
  cursor: grabbing;
  transition: none; /* Disable transition during panning for smooth movement */
}

.image-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: white;
  text-align: center;
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.nav-arrow:hover {
  opacity: 1;
}

.nav-arrow-left {
  left: 1rem;
}

.nav-arrow-right {
  right: 1rem;
}

.image-controls {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.7);
  padding: 0.5rem 1rem;
  border-radius: 24px;
  backdrop-filter: blur(10px);
}

.zoom-slider {
  width: 100px;
}

.details-section {
  width: 400px;
  background: rgb(var(--v-theme-surface));
  border-left: 1px solid rgba(var(--v-theme-outline), 0.12);
  overflow-y: auto;
}

.details-card {
  height: 100%;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  display: flex;
  align-items: center;
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
  opacity: 0.8;
}

.info-value {
  font-size: 0.95rem;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
}

.caption-text {
  font-size: 1rem;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
  white-space: pre-wrap; /* Preserve whitespace and newlines */
}

.keywords-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.people-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.person-item {
  display: flex;
  align-items: center;
}

.person-info {
  display: flex;
  flex-direction: column;
}

.person-name {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.person-confidence {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  font-weight: 500;
}

.processing-notice {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: rgba(var(--v-theme-warning), 0.1);
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-warning), 0.2);
}

/* Dark theme adjustments */
:deep(.v-theme--dark) .details-section {
  background: rgb(var(--v-theme-surface));
  border-left-color: rgba(var(--v-theme-outline), 0.12);
}

/* Responsive adjustments */
@media (max-width: 900px) {
  .photo-detail-content {
    flex-direction: column;
  }
  
  .details-section {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(var(--v-theme-outline), 0.12);
    max-height: 40vh;
  }
}

@media (max-width: 600px) {
  .image-controls {
    bottom: 0.5rem;
    padding: 0.25rem 0.75rem;
    gap: 0.5rem;
  }
  
  .zoom-slider {
    width: 80px;
  }
}

/* Face overlay styles */
.face-overlay {
  position: absolute;
  pointer-events: none;
  transition: all 0.2s ease;
  z-index: 10;
  opacity: 0.8;
}

.face-overlay:hover {
  pointer-events: auto;
  opacity: 1;
}

.face-box {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  position: relative;
  transition: all 0.2s ease;
  background: transparent;
}

.face-overlay:hover .face-box {
  border-color: #2196F3;
  background-color: rgba(33, 150, 243, 0.1);
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.3);
}

.face-label {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 11;
  pointer-events: none;
}

.confidence {
  opacity: 0.7;
  margin-left: 4px;
}

</style>
