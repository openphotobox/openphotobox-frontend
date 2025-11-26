
<script setup lang="ts">
// Require authentication and setup
definePageMeta({
  middleware: ['setup', 'auth']
})

// Import components
import JustifiedGallery from '~/components/JustifiedGallery.vue'
import AlbumSelectorDialog from '~/components/AlbumSelectorDialog.vue'

// Using custom photo grid layout (Justified Gallery style)

const api = useApi()
const authStore = useAuthStore()
const { $events } = useNuxtApp()

// Check if user is admin
const isAdmin = computed(() => authStore.isAdmin)

// State management
const assets = ref([])
const pending = ref(true)
const error = ref(null)
const showAssetDialog = ref(false)
const selectedAsset = ref(null)
const sidebarCollapsed = ref(true)

// Selection mode
const selectionMode = ref(false)
const selectedAssetIds = ref<Set<string>>(new Set())
const showAlbumSelector = ref(false)

// Fetch assets when component mounts
onMounted(async () => {
  await fetchTimeline()
  sectionObserver.current = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const date = elToDate.get(entry.target)
        if (date) {
          currentDate.value = date
          loadDateAssets(date)
        }
      }
    }
  }, { root: null, rootMargin: '200px', threshold: 0.1 })

  // Preload the first couple of dates so content appears immediately
  if (timelineItems.value && timelineItems.value.length) {
    const preload = timelineItems.value.slice(0, 2)
    for (const item of preload) {
      loadDateAssets(item.date)
    }
  }

  // SSE: refresh the currently visible date section on asset_ready
  if ($events?.onAssetReady) {
    $events.onAssetReady(async () => {
      try {
        // Reload current date bucket and maybe the previous one for smoothness
        const cur = currentDate.value
        if (cur) {
          // Clear and reload the date assets
          delete dateAssets[cur]
          await loadDateAssets(cur)
        }
      } catch {}
    })
  }

  // Initialize scroll tracking after mount
  // Track active date smoothly on scroll (bind after DOM paints)
  setTimeout(() => {
    updateActiveOnScroll()
    if (contentRef.value && contentRef.value.addEventListener) {
      contentRef.value.addEventListener('scroll', updateActiveOnScroll, { passive: true })
    } else {
      window.addEventListener('scroll', updateActiveOnScroll, { passive: true })
    }
  }, 0)
})

onUnmounted(() => {
  if (sectionObserver.current) {
    sectionObserver.current.disconnect()
    sectionObserver.current = null
  }
  elToDate.clear()
  // No window resize handler required
  if (contentRef.value && contentRef.value.removeEventListener) {
    contentRef.value.removeEventListener('scroll', updateActiveOnScroll)
  } else {
    window.removeEventListener('scroll', updateActiveOnScroll)
  }
})

const openAsset = (asset) => {
  if (selectionMode.value) {
    toggleSelection(asset.id)
  } else {
    selectedAsset.value = asset
    showAssetDialog.value = true
  }
}

const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    selectedAssetIds.value.clear()
  }
}

const toggleSelection = (assetId: string) => {
  if (selectedAssetIds.value.has(assetId)) {
    selectedAssetIds.value.delete(assetId)
  } else {
    selectedAssetIds.value.add(assetId)
  }
}

const isSelected = (assetId: string) => {
  return selectedAssetIds.value.has(assetId)
}

const selectAll = () => {
  for (const item of timelineItems.value) {
    const arr = dateAssets[item.date]
    if (Array.isArray(arr)) {
      arr.forEach(asset => selectedAssetIds.value.add(asset.id))
    }
  }
}

const clearSelection = () => {
  selectedAssetIds.value.clear()
}

const openAlbumSelectorForSelection = () => {
  if (selectedAssetIds.value.size === 0) return
  showAlbumSelector.value = true
}

const handlePhotosAddedToAlbum = () => {
  // Clear selection after adding
  clearSelection()
  selectionMode.value = false
}


// Flatten all loaded date buckets into a single, timeline-ordered list for the viewer
const viewerAssets = computed(() => {
  const list = []
  for (const item of timelineItems.value) {
    const arr = dateAssets[item.date]
    if (Array.isArray(arr) && arr.length) {
      // Keep the order as shown in each date's gallery
      list.push(...arr)
    }
  }
  return list
})

// Prefetch next timeline dates when user nears end of viewer list
const prefetchNextDates = async (count = 1) => {
  try {
    // Find last loaded date index
    let lastLoadedIdx = -1
    for (let i = 0; i < timelineItems.value.length; i++) {
      const d = timelineItems.value[i].date
      const arr = dateAssets[d]
      if (Array.isArray(arr) && arr.length) lastLoadedIdx = i
    }
    // Load the next N dates if available and not already loaded
    for (let k = 1; k <= count; k++) {
      const idx = lastLoadedIdx + k
      if (idx >= 0 && idx < timelineItems.value.length) {
        const date = timelineItems.value[idx].date
        if (!Array.isArray(dateAssets[date]) || dateAssets[date].length === 0) {
          await loadDateAssets(date)
        }
      }
    }
  } catch (e) {
    console.warn('Prefetch next dates failed', e)
  }
}

// Event handlers for ImageViewerV2
const handleAssetChanged = async (newAsset) => {
  selectedAsset.value = newAsset
  // If we are near the end of the currently available viewer list, prefetch next date section(s)
  const list = viewerAssets.value
  const idx = list.findIndex(a => a.id === newAsset?.id)
  if (idx >= 0 && idx >= list.length - 6) {
    await prefetchNextDates(2)
  }
}

const handleAssetDeleted = (deletedId) => {
  // Remove from flat assets list
  assets.value = assets.value.filter(a => a.id !== deletedId)
  // Also remove from any date buckets
  for (const k of Object.keys(dateAssets)) {
    const arr = dateAssets[k]
    if (Array.isArray(arr)) {
      dateAssets[k] = arr.filter(a => a.id !== deletedId)
    }
  }
  selectedAsset.value = null
}

// Set page title
useHead({
  title: 'OpenPhotobox - Your Family Photos'
})

// Timeline-based loading
const timelineItems = ref([]) // [{ date: 'YYYY-MM-DD', count: number }]
const dateAssets = reactive({}) // { [date]: Asset[] }
const sectionObserver = { current: null }
const elToDate = new Map()

const fetchTimeline = async () => {
  try {
    pending.value = true
    const res = await api.client.get('/api/assets/timeline/')
    if (res.success && res.data) {
      timelineItems.value = res.data.results || []
    } else {
      timelineItems.value = []
    }
  } catch (e) {
    error.value = e
  } finally {
    pending.value = false
  }
}

const loadDateAssets = async (date) => {
  if (!date || dateAssets[date]) return
  try {
    // placeholder to prevent duplicate requests
    dateAssets[date] = []
    const res = await api.client.get('/api/assets/by_date/', { date })
    const results = (res.success && res.data && res.data.results) ? res.data.results : []
    const mapped = results.map(a => ({
      ...a,
      // Use smaller thumbnails for gallery grid (better performance)
      // Prefer md (600px) for retina displays, fall back to sm (300px) or legacy thumbnail_url
      src: a.thumbnail_urls?.md || a.thumbnail_urls?.sm || a.thumbnail_url || a.original_url || a.storage_url,
      width: a.width || 1920,
      height: a.height || 1080,
      alt: a.description || 'Photo'
    }))
    dateAssets[date] = mapped
    // also append to flat list used by the viewer
    assets.value = assets.value.concat(mapped)
  } catch (e) {
    console.error('Failed to load photos for date', date, e)
    delete dateAssets[date]
  }
}

const registerDateSection = (el, date) => {
  if (!sectionObserver.current) return
  if (el) {
    elToDate.set(el, date)
    sectionObserver.current.observe(el)
  } else {
    for (const [k, v] of elToDate.entries()) {
      if (v === date) {
        sectionObserver.current.unobserve(k)
        elToDate.delete(k)
      }
    }
  }
}

// Compact slider-style timeline (years with month ticks)
const years = computed(() => {
  const set = new Set()
  for (const item of timelineItems.value) {
    const y = new Date(item.date).getFullYear()
    set.add(y)
  }
  return Array.from(set).sort((a, b) => b - a)
})

const monthsByYear = computed(() => {
  const map = {}
  for (const item of timelineItems.value) {
    const d = new Date(item.date)
    const y = d.getFullYear()
    const m = d.getMonth()
    if (!map[y]) map[y] = []
    if (!map[y].includes(m)) map[y].push(m)
  }
  for (const y of Object.keys(map)) {
    map[parseInt(y)].sort((a, b) => a - b)
  }
  return map
})

const scrollToYear = (year) => {
  const target = timelineItems.value.find(i => new Date(i.date).getFullYear() === year)
  if (target) {
    const el = document.getElementById('date-' + target.date)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const scrollToYearMonth = (year, month) => {
  const target = timelineItems.value.find(i => {
    const d = new Date(i.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
  if (target) {
    const el = document.getElementById('date-' + target.date)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Compactness controls for slider (static thinning)
const yearLabelStep = computed(() => {
  const len = years.value.length || 0
  if (len > 40) return 5
  if (len > 20) return 3
  return 2
})
const shouldShowYear = (idx) => (idx % yearLabelStep.value) === 0

// Track current visible date for slider highlight/progress
const currentDate = ref(null)
const activeYear = computed(() => currentDate.value ? new Date(currentDate.value).getFullYear() : null)
const activeMonth = computed(() => currentDate.value ? new Date(currentDate.value).getMonth() : null)
const progressPercent = computed(() => {
  const len = timelineItems.value.length
  if (!len) return 0
  const idx = timelineItems.value.findIndex(i => i.date === currentDate.value)
  if (idx < 0) return 0
  return (idx / Math.max(1, len - 1)) * 100
})

// Content container reference for scroll calculations
const contentRef = ref(null)

// Update active date based on scroll position for smoother indicator
const updateActiveOnScroll = () => {
  if (!contentRef.value) return
  const containerRect = contentRef.value.getBoundingClientRect()
  const headerOffset = 80
  let underTop = -Infinity
  let underDate = null
  let overTop = Infinity
  let overDate = null
  for (const item of timelineItems.value) {
    const el = document.getElementById('date-' + item.date)
    if (!el || !el.getBoundingClientRect) continue
    const r = el.getBoundingClientRect()
    const topRel = r.top - containerRect.top
    if (topRel <= headerOffset && topRel > underTop) {
      underTop = topRel
      underDate = item.date
    } else if (topRel > headerOffset && topRel < overTop) {
      overTop = topRel
      overDate = item.date
    }
  }
  const chosen = underDate || overDate || (timelineItems.value[0] && timelineItems.value[0].date)
  if (chosen) currentDate.value = chosen
}
</script>

<template>
  <div class="modern-timeline">
    <!-- Loading State -->
    <div v-if="pending" class="loading-container">
      <v-progress-circular size="64" color="primary" indeterminate></v-progress-circular>
      <div class="text-h6 mt-4">Loading your photos...</div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
      <div class="text-h6 mb-2">Failed to load photos</div>
      <div class="text-body-1 text-medium-emphasis mb-4">{{ error?.message || 'Unknown error' }}</div>
      <v-btn color="primary" @click="fetchTimeline">Try Again</v-btn>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!timelineItems.length" class="empty-container">
      <v-icon size="64" color="grey" class="mb-4">mdi-image-off</v-icon>
      <div class="text-h6 mb-2">No photos found</div>
      <div class="text-body-1 text-medium-emphasis mb-4">
        Upload some photos to get started with your family archive
      </div>
      <v-btn color="primary" to="/upload" prepend-icon="mdi-cloud-upload">
        Upload Photos
      </v-btn>
    </div>
    
    <!-- Selection Mode Header -->
    <v-app-bar
      v-if="selectionMode"
      color="primary"
      density="compact"
      elevation="2"
      class="selection-bar"
    >
      <v-btn
        icon="mdi-close"
        @click="toggleSelectionMode"
      ></v-btn>
      
      <v-toolbar-title>
        {{ selectedAssetIds.size }} selected
      </v-toolbar-title>
      
      <v-spacer></v-spacer>
      
      <v-btn
        variant="text"
        @click="selectAll"
      >
        Select All
      </v-btn>
      
      <v-btn
        variant="text"
        @click="clearSelection"
        :disabled="selectedAssetIds.size === 0"
      >
        Clear
      </v-btn>
    </v-app-bar>

    <!-- Main Content: Timeline with per-day lazy galleries -->
    <div v-else class="main-content-with-timeline">
      <!-- Photo Grid Content -->
      <div class="photo-grid-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }" ref="contentRef">
        <div class="timeline-photos">
          <div
            v-for="item in timelineItems"
            :key="item.date"
            class="date-section"
            :id="'date-' + item.date"
            :data-year="new Date(item.date).getFullYear()"
            :ref="el => registerDateSection(el, item.date)"
          >
            <!-- Date Header -->
            <div class="date-header">
              <h2 class="date-title">{{ new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</h2>
              <div v-if="dateAssets[item.date]?.length" class="date-count">{{ dateAssets[item.date].length }} photo{{ dateAssets[item.date].length !== 1 ? 's' : '' }}</div>
            </div>

            <!-- Per-date Justified Gallery with selection overlay -->
            <div v-if="dateAssets[item.date]?.length" class="gallery-wrapper" :class="{ 'selection-active': selectionMode }">
              <JustifiedGallery
                :images="dateAssets[item.date]"
                :targetRowHeight="220"
                :gap="4"
                :overscanPx="800"
                :externalScrollEl="'.photo-grid-content'"
                lastRow="left"
                @item-click="openAsset"
              />
              
              <!-- Selection overlays -->
              <div v-if="selectionMode && dateAssets[item.date]" class="selection-overlays">
                <div
                  v-for="asset in dateAssets[item.date]"
                  :key="asset.id"
                  class="selection-overlay"
                  :class="{ 'selected': isSelected(asset.id) }"
                  @click="toggleSelection(asset.id)"
                >
                  <v-checkbox
                    :model-value="isSelected(asset.id)"
                    color="primary"
                    hide-details
                    @click.stop="toggleSelection(asset.id)"
                  ></v-checkbox>
                </div>
              </div>
            </div>

            <div v-else class="loading-more-container">
              <v-progress-circular size="32" color="primary" indeterminate></v-progress-circular>
              <div class="text-body-2 mt-2">Loading photos...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    

    <!-- Floating Action Buttons (admin only) -->
    <div v-if="isAdmin" class="fab-container">
      <!-- Selection Mode FAB -->
      <v-btn
        v-if="!selectionMode"
        icon
        size="large"
        color="primary"
        class="fab-button"
        @click="toggleSelectionMode"
      >
        <v-icon>mdi-checkbox-multiple-marked</v-icon>
        <v-tooltip activator="parent" location="left">
          Select Photos
        </v-tooltip>
      </v-btn>
      
      <!-- Add to Album FAB (shown when photos are selected) -->
      <v-btn
        v-if="selectionMode && selectedAssetIds.size > 0"
        icon
        size="large"
        color="success"
        class="fab-button fab-album"
        @click="openAlbumSelectorForSelection"
      >
        <v-badge
          :content="selectedAssetIds.size"
          color="error"
          overlap
        >
          <v-icon>mdi-folder-plus</v-icon>
        </v-badge>
        <v-tooltip activator="parent" location="left">
          Add to Album
        </v-tooltip>
      </v-btn>
    </div>

    <!-- Album Selector Dialog -->
    <AlbumSelectorDialog
      v-model="showAlbumSelector"
      :asset-ids="Array.from(selectedAssetIds)"
      @added="handlePhotosAddedToAlbum"
    />

    <!-- Image Viewer V2 -->
    <ImageViewerV2
      v-model="showAssetDialog"
      :asset="selectedAsset"
      :assets="viewerAssets"
      :show-delete="isAdmin"
      :show-add-to-album="isAdmin"
      @asset-changed="handleAssetChanged"
      @asset-deleted="handleAssetDeleted"
    />
  </div>
</template>

<style scoped>
.modern-timeline { min-height: 100vh; overflow: hidden; }

.loading-container,
.error-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
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
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

/* Dark theme adjustments */
:deep(.v-theme--dark) .loading-container {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

:deep(.v-theme--dark) .error-container {
  background: linear-gradient(135deg, #1f1a1a 0%, #2d1a1a 100%);
}

:deep(.v-theme--dark) .empty-container {
  background: linear-gradient(135deg, #1a1f1a 0%, #1a2d1a 100%);
}

.main-content-with-timeline { 
  min-height: 100vh; 
  width: 100%; 
  max-width: 100%; 
  overflow: hidden; 
}


.photo-grid-content { 
  overflow-y: auto; 
  overflow-x: hidden; 
  transition: all 0.3s ease; 
  overflow-anchor: none; 
  width: 100%; 
  max-width: 100%; 
  box-sizing: border-box;
}

.photo-grid-content.sidebar-collapsed {
  margin-left: 0;
}

.timeline-photos { 
  padding: 1rem; 
  width: 100%; 
  max-width: 100%; 
  margin: 0 auto;
  overflow-anchor: none; 
  box-sizing: border-box; 
}

.date-section {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.date-section { margin-bottom: 1.5rem; }

.date-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  margin-bottom: 0.75rem; 
  padding-bottom: 0.25rem; 
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.2);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.date-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.date-count {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.15);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 600;
}

/* JustifiedGallery component handles all photo grid styling */
/* Ensure gallery doesn't overflow container */
:deep(.jg-host) {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

:deep(.jg-phantom) {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

:deep(.jg-row) {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

.debug-info {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-size: 12px;
  z-index: 1000;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .timeline-photos {
    padding: 1rem;
  }
  
  .date-title {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .date-title {
    font-size: 1.1rem;
  }
}

/* Selection mode styles */
.selection-bar {
  position: fixed !important;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.gallery-wrapper {
  position: relative;
}

.selection-overlays {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}

.selection-overlay {
  position: absolute;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 8px;
  transition: background-color 0.2s;
}

.selection-overlay:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.selection-overlay.selected {
  background-color: rgba(var(--v-theme-primary), 0.2);
}

.selection-overlay :deep(.v-checkbox) {
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* FAB styles */
.fab-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fab-button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.fab-album {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}


/* Loading more and end of content indicators */
.loading-more-container,
.load-more-container,
.end-of-content,
.debug-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  margin: 2rem 0;
}

.debug-container {
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  text-align: center;
}

.debug-info {
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
}

.debug-info p {
  margin: 0.25rem 0;
}

.loading-more-container {
  background: rgba(var(--v-theme-primary), 0.05);
  border-radius: 12px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.2);
}

.load-more-container {
  position: relative;
  z-index: 1;
}

.load-more-btn {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border: 2px solid rgb(var(--v-theme-primary));
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
  min-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.load-more-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
}

.load-more-btn:disabled {
  background: rgba(var(--v-theme-primary), 0.5);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.end-of-content {
  color: rgb(var(--v-theme-on-surface-variant));
  font-style: italic;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .photo-grid-content {
    width: 100%;
  }
  
  .timeline-photos {
    padding: 0.75rem;
  }
}
</style>