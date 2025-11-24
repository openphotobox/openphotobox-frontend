<template>
  <div class="photo-masonry-container">
    <!-- Debug info -->
    <div class="component-debug">
      <p>PhotoMasonry Component Loaded</p>
      <p>Assets: {{ props.assets?.length || 0 }}</p>
      <p>Grouped Assets: {{ groupedAssets?.length || 0 }}</p>
    </div>
    
    <!-- Image Viewer V2 -->
    <ImageViewerV2
      v-model="viewerOpen"
      :asset="selectedAsset"
      :assets="props.assets"
      @asset-changed="onAssetChanged"
      @asset-deleted="onAssetDeleted"
    />
    
    <!-- Timeline Navigation Sidebar -->
    <div class="timeline-sidebar" :class="{ 'collapsed': sidebarCollapsed }">
      <v-btn
        icon
        size="small"
        class="sidebar-toggle"
        @click="sidebarCollapsed = !sidebarCollapsed"
      >
        <v-icon>{{ sidebarCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
      </v-btn>
      
      <div v-if="!sidebarCollapsed" class="timeline-nav">
        <div class="timeline-header">
          <h3 class="text-h6 font-weight-bold mb-2">Timeline</h3>
        </div>
        
        <div class="timeline-years">
          <div
            v-for="yearData in timelineYears"
            :key="yearData.year"
            class="timeline-year-group"
          >
            <div
              class="timeline-year"
              :class="{ 'active': selectedYear === yearData.year }"
              @click="selectYear(yearData.year)"
            >
              <div class="year-label">{{ yearData.year }}</div>
              <div class="year-count">{{ yearData.count }} photos</div>
            </div>
            
            <!-- Months for this year -->
            <div v-if="selectedYear === yearData.year" class="timeline-months">
              <div
                v-for="month in yearData.months"
                :key="month.month"
                class="timeline-month"
                @click="selectMonth(yearData.year, month.month)"
              >
                <div class="month-label">{{ month.name }}</div>
                <div class="month-count">{{ month.count }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="masonry-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <!-- Date Headers and Photos -->
      <div class="timeline-content">
        <div
          v-for="dateGroup in groupedAssets"
          :key="dateGroup.date"
          class="date-group"
        >
          <!-- Date Header -->
          <div class="date-header">
            <h2 class="date-title">{{ formatDateHeader(dateGroup.date) }}</h2>
            <div class="date-count">{{ dateGroup.assets.length }} photos</div>
          </div>

          <!-- Justified Gallery for this date -->
          <JustifiedGallery
            :images="dateGroup.assets.map(asset => ({
              src: asset.thumbnail_url || asset.original_url || asset.storage_url,
              width: asset.width || 1920,
              height: asset.height || 1080,
              alt: asset.description || 'Photo',
              id: asset.id,
              ...asset // Pass through all asset properties
            }))"
            :targetRowHeight="220"
            :gap="2"
            lastRow="left"
            @item-click="openAsset"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Import components
import JustifiedGallery from './JustifiedGallery.vue'

const props = defineProps({
  assets: {
    type: Array,
    default: () => []
  }
})

// Debug logging
watch(() => props.assets, (newAssets) => {
  console.log('PhotoMasonry received assets:', newAssets?.length || 0)
  if (newAssets?.length > 0) {
    console.log('First asset:', newAssets[0])
  }
}, { immediate: true })

const emit = defineEmits(['open-asset'])

// Image Viewer V2 state
const viewerOpen = ref(false)
const selectedAsset = ref(null)

const sidebarCollapsed = ref(false)
const selectedYear = ref(null)

// Group assets by date
const groupedAssets = computed(() => {
  const groups = {}
  
  props.assets.forEach(asset => {
    const date = new Date(asset.taken_at || asset.created_at)
    const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD format
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        assets: []
      }
    }
    groups[dateKey].assets.push(asset)
  })
  
  // Sort by date (newest first)
  return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
})

// Generate timeline years from assets with months
const timelineYears = computed(() => {
  const yearData = {}
  
  props.assets.forEach(asset => {
    const date = new Date(asset.taken_at || asset.created_at)
    const year = date.getFullYear()
    const month = date.getMonth()
    
    if (!yearData[year]) {
      yearData[year] = {
        year: year,
        count: 0,
        months: {}
      }
    }
    
    yearData[year].count++
    
    if (!yearData[year].months[month]) {
      yearData[year].months[month] = 0
    }
    yearData[year].months[month]++
  })
  
  return Object.values(yearData)
    .sort((a, b) => b.year - a.year)
    .map(yearData => ({
      ...yearData,
      months: Object.entries(yearData.months)
        .map(([month, count]) => ({
          month: parseInt(month),
          count,
          name: new Date(0, month).toLocaleString('default', { month: 'short' })
        }))
        .sort((a, b) => b.month - a.month)
    }))
})

const formatDateHeader = (dateString) => {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}

const selectYear = (year) => {
  selectedYear.value = selectedYear.value === year ? null : year
  // Scroll to first photo of that year
  const yearElement = document.querySelector(`[data-year="${year}"]`)
  if (yearElement) {
    yearElement.scrollIntoView({ behavior: 'smooth' })
  }
}

const selectMonth = (year, month) => {
  // Find the first photo from this year/month and scroll to it
  const targetDate = new Date(year, month, 1)
  const dateGroups = document.querySelectorAll('.date-group')
  
  for (const group of dateGroups) {
    const dateHeader = group.querySelector('.date-title')
    if (dateHeader) {
      const groupDate = new Date(dateHeader.textContent)
      if (groupDate.getFullYear() === year && groupDate.getMonth() === month) {
        group.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }
}

const openAsset = (asset) => {
  selectedAsset.value = asset
  viewerOpen.value = true
  // Keep the emit for backward compatibility if needed
  emit('open-asset', asset)
}

const onAssetChanged = (asset) => {
  selectedAsset.value = asset
}

const onAssetDeleted = (id) => {
  // No direct mutation of props; just close the viewer
  viewerOpen.value = false
  selectedAsset.value = null
}

// JustifiedGallery component handles all layout logic
</script>

<style scoped>
.photo-masonry-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.component-debug {
  position: fixed;
  top: 10px;
  left: 10px;
  background: rgba(255, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-size: 12px;
  z-index: 1000;
}

.timeline-sidebar {
  width: 280px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
  position: relative;
  overflow-y: auto;
}

.timeline-sidebar.collapsed {
  width: 60px;
}

.sidebar-toggle {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(10px);
}

.timeline-nav {
  padding: 1rem;
  padding-top: 3rem;
}

.timeline-header {
  margin-bottom: 1.5rem;
}

.timeline-years {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.timeline-year-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.timeline-year {
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.timeline-year:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.timeline-year.active {
  background: rgba(var(--v-theme-primary), 0.15);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.year-label {
  font-weight: 600;
  font-size: 1.1rem;
  color: rgb(var(--v-theme-on-surface));
}

.year-count {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 0.25rem;
}

.timeline-months {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-left: 1rem;
  padding-left: 0.5rem;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.2);
}

.timeline-month {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-month:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}

.month-label {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
}

.month-count {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  background: rgba(var(--v-theme-primary), 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
}

.masonry-content {
  flex: 1;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.masonry-content.sidebar-collapsed {
  margin-left: 0;
}

.timeline-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.date-group {
  margin-bottom: 3rem;
}

.date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.2);
}

.date-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.date-count {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  background: rgba(var(--v-theme-primary), 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

/* JustifiedGallery component handles all photo grid styling */

/* Dark theme adjustments */
:deep(.v-theme--dark) .timeline-sidebar {
  background: rgba(26, 26, 26, 0.95);
  border-right-color: rgba(255, 255, 255, 0.12);
}

:deep(.v-theme--dark) .sidebar-toggle {
  background: rgba(26, 26, 26, 0.9) !important;
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .column-count {
    --column-count: 3;
  }
}

@media (max-width: 768px) {
  .timeline-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 1000;
    transform: translateX(-100%);
  }
  
  .timeline-sidebar:not(.collapsed) {
    transform: translateX(0);
  }
  
  .masonry-content {
    width: 100%;
  }
  
  .timeline-content {
    padding: 1rem;
  }
  
  .column-count {
    --column-count: 2;
  }
}

@media (max-width: 480px) {
  .column-count {
    --column-count: 1;
  }
}
</style>
