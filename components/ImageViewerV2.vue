<template>
  <v-dialog 
    v-model="isOpen" 
    fullscreen 
    transition="dialog-bottom-transition"
    class="image-viewer-v2"
  >
    <div v-if="currentAsset" class="viewer-container">
      <!-- Header Bar -->
      <div class="viewer-header">
        <v-btn
          icon
          variant="text"
          color="white"
          @click="close"
          class="close-btn"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        
        <div class="header-info">
          <span class="photo-counter">
            {{ currentIndex + 1 }} of {{ assets.length }}
          </span>
        </div>
        
        <div class="header-actions">
          <!-- Delete photo -->
          <v-btn
            icon
            variant="text"
            color="red-lighten-2"
            @click="deleteDialog.open = true"
            :disabled="!currentAsset"
          >
            <v-icon>mdi-delete</v-icon>
          </v-btn>
          <v-btn
            icon
            variant="text"
            color="white"
            @click="downloadPhoto"
          >
            <v-icon>mdi-download</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="viewer-main-content">
        <!-- Image Area -->
        <div class="viewer-content" @click="handleContentClick">
          <!-- Navigation Arrows -->
          <v-btn
            v-if="hasPrevious"
            icon
            size="large"
            color="white"
            variant="elevated"
            class="nav-arrow nav-arrow-left"
            @click.stop="goToPrevious"
          >
            <v-icon size="large">mdi-chevron-left</v-icon>
          </v-btn>
          
          <v-btn
            v-if="hasNext"
            icon
            size="large"
            color="white"
            variant="elevated"
            class="nav-arrow nav-arrow-right"
            @click.stop="goToNext"
          >
            <v-icon size="large">mdi-chevron-right</v-icon>
          </v-btn>

          <!-- Image Container -->
          <div class="image-container" :class="{ 'crosshair': addFaceMode }" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseLeave">
            <div class="img-wrap" ref="imgWrap">
            <v-img
              ref="imageRef"
              :src="displayedImageUrl"
              :lazy-src="thumbnailUrl"
              :transition="false"
              :eager="true"
              :alt="currentAsset.description || 'Photo'"
              class="main-image"
              contain
              @load="onImageLoad"
              @error="onImageError"
            >
              <template #default>
                <div class="overlay-layer">
                  <div v-if="highlightedFace" class="face-highlight" :style="faceStyle(highlightedFace)"></div>
                  <div v-if="drawnBox" class="face-highlight" :style="drawnBoxStyle"></div>
                </div>
              </template>
              <template v-slot:placeholder>
                <div v-if="!displayedImageUrl && !thumbnailUrl" class="image-placeholder">
                  <v-progress-circular 
                    size="64" 
                    indeterminate 
                    color="white"
                  />
                </div>
              </template>
            </v-img>
            </div>
          </div>
        </div>

        <!-- Side Panel -->
        <div class="side-panel" :class="{ 'collapsed': panelCollapsed }">
          <!-- Panel Toggle Button -->
          <v-btn
            icon
            variant="text"
            color="white"
            class="panel-toggle"
            @click="panelCollapsed = !panelCollapsed"
          >
            <v-icon>{{ panelCollapsed ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
          </v-btn>

          <div v-if="!panelCollapsed" class="panel-content">
            <!-- Photo Information -->
            <div class="info-section">
              <h3 class="section-title">
                <v-icon class="me-2">mdi-information</v-icon>
                Photo Details
              </h3>
              
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">📅 Date Taken</span>
                  <span class="info-value">{{ formatDate(currentAsset.taken_at) || 'Unknown' }}</span>
                </div>
                
                <div class="info-item">
                  <span class="info-label">⬆️ Date Uploaded</span>
                  <span class="info-value">{{ formatDate(currentAsset.created_at) || 'Unknown' }}</span>
                </div>
                
                <div v-if="currentAsset.mime_type" class="info-item">
                  <span class="info-label">📁 File Type</span>
                  <span class="info-value">{{ currentAsset.mime_type }}</span>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div v-if="currentAsset.description" class="info-section">
              <h3 class="section-title">
                <v-icon class="me-2">mdi-text</v-icon>
                Description
              </h3>
              <div class="description-text">
                {{ currentAsset.description }}
              </div>
            </div>

            <!-- Keywords -->
            <div v-if="currentAsset.keywords?.length" class="info-section">
              <h3 class="section-title">
                <v-icon class="me-2">mdi-tag</v-icon>
                Keywords
              </h3>
              <div class="keywords-container">
                <v-chip
                  v-for="keyword in currentAsset.keywords"
                  :key="keyword"
                  size="small"
                  color="primary"
                  variant="tonal"
                  class="ma-1"
                >
                  {{ keyword }}
                </v-chip>
              </div>
            </div>

            <!-- People (if faces are detected) -->
            <div class="info-section">
              <h3 class="section-title">
                <v-icon class="me-2">mdi-account-group</v-icon>
                People
                <v-spacer />
                <v-btn size="small" variant="text" :color="editFacesMode ? 'primary' : 'default'" @click="toggleEditFacesMode">
                  <v-icon size="small" class="me-1">{{ editFacesMode ? 'mdi-check' : 'mdi-pencil' }}</v-icon>
                  {{ editFacesMode ? 'Done' : 'Edit' }}
                </v-btn>
                <v-btn v-if="editFacesMode" size="small" color="primary" variant="tonal" class="ms-2" @click="toggleAddFaceMode">
                  <v-icon size="small" class="me-1">mdi-account-plus</v-icon>
                  Add face
                </v-btn>
              </h3>
              <div class="people-container">
                <!-- Assigned faces (linked to a person) -->
                <div
                  v-for="face in assignedFaces"
                  :key="face.id"
                  class="person-item"
                  @mouseenter="() => highlightFace(face)"
                  @mouseleave="clearHighlight"
                >
                  <v-avatar size="36" class="me-3">
                    <v-img :src="face.person_headshot_url || face.thumbnail_url || '/placeholder-avatar.jpg'" cover></v-img>
                  </v-avatar>
                  <div class="person-info">
                    <div class="person-name">{{ face.person_name }}</div>
                    <div class="person-actions mt-1">
                      <v-btn v-if="editFacesMode"
                        size="x-small"
                        variant="text"
                        icon
                        @click.stop="openAssignDialog(face)"
                        :title="'Edit assignment'"
                      >
                        <v-icon size="small">mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn v-if="editFacesMode"
                        size="x-small"
                        variant="text"
                        icon
                        color="error"
                        @click.stop="unassignFace(face)"
                        :title="'Unmatch (set to Unknown)'"
                      >
                        <v-icon size="small">mdi-link-off</v-icon>
                      </v-btn>
                      <v-btn v-if="editFacesMode"
                        size="x-small"
                        variant="text"
                        icon
                        color="error"
                        @click.stop="deleteFace(face)"
                        :title="'Delete face'">
                        <v-icon size="small">mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </div>

                <!-- Unassigned faces toggle -->
                <v-divider class="my-2" v-if="unassignedFaces.length"></v-divider>
                <div v-if="unassignedFaces.length">
                  <v-btn
                    variant="tonal"
                    size="small"
                    @click="showUnassigned = !showUnassigned"
                    class="mt-1"
                  >
                    <v-icon class="me-2">{{ showUnassigned ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
                    {{ showUnassigned ? 'Hide' : 'Show' }} unassigned faces ({{ unassignedFaces.length }})
                  </v-btn>

                  <div v-show="showUnassigned" class="mt-3">
                    <div
                      v-for="face in unassignedFaces"
                      :key="face.id"
                      class="person-item"
                      @mouseenter="() => highlightFace(face)"
                      @mouseleave="clearHighlight"
                    >
                      <v-avatar size="36" class="me-3">
                        <v-img :src="face.thumbnail_url || '/placeholder-avatar.jpg'" cover></v-img>
                      </v-avatar>
                      <div class="person-info">
                        <div class="person-name">Unknown</div>
                        <div class="person-actions mt-1">
                          <v-btn v-if="editFacesMode" size="x-small" variant="tonal" color="primary" @click.stop="openAssignDialog(face)">Assign</v-btn>
                          <v-btn v-if="editFacesMode" size="x-small" variant="text" color="error" class="ms-1" @click.stop="deleteFace(face)">Delete</v-btn>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </v-dialog>

  <!-- Delete Confirmation Dialog -->
  <v-dialog v-model="deleteDialog.open" max-width="480">
    <v-card>
      <v-card-title class="text-h6">Delete this photo?</v-card-title>
      <v-card-text>
        This action cannot be undone. The photo will be permanently removed.
        <div v-if="deleteDialog.error" class="mt-3 text-error">{{ deleteDialog.error }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="deleteDialog.open = false" :disabled="deleteDialog.loading">Cancel</v-btn>
        <v-btn color="error" @click="confirmDelete" :loading="deleteDialog.loading">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Assign Face Dialog -->
  <v-dialog v-model="assignDialog.open" max-width="520">
    <v-card>
      <v-card-title>
        Assign face
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="assignDialog.search"
          label="Search people by name"
          prepend-inner-icon="mdi-magnify"
          density="comfortable"
          variant="outlined"
          hide-details
        />

        <div v-if="assignDialog.loading" class="d-flex align-center justify-center py-4">
          <v-progress-circular size="24" indeterminate color="primary" />
        </div>

        <v-list v-else class="people-picker-list">
          <template v-if="paginatedPeople.length">
            <v-list-item
              v-for="p in paginatedPeople"
              :key="p.id"
              :title="p.display_name || 'Unnamed person'"
              @click="assignToPerson(p)"
            >
              <template #prepend>
                <v-avatar size="36">
                  <v-img :src="p.headshot_url || '/placeholder-avatar.jpg'" />
                </v-avatar>
              </template>
              <template #append>
                <div class="d-flex align-center" style="gap:8px;">
                  <template v-if="typeof p.similarity === 'number'">
                    <v-chip
                      size="x-small"
                      variant="tonal"
                      :color="(p.similarity ?? 0) >= 0.8 ? 'success' : (p.similarity ?? 0) >= 0.65 ? 'warning' : 'grey'"
                      :title="`Similarity: ${Math.round(((p.similarity ?? 0) * 100))}%`"
                    >
                      {{ Math.round(((p.similarity ?? 0) * 100)) }}%
                    </v-chip>
                  </template>
                  <span class="text-caption text-medium-emphasis">{{ p.face_count || 0 }} faces</span>
                </div>
              </template>
            </v-list-item>
          </template>
          <template v-else>
            <div class="text-caption text-medium-emphasis py-4 px-2">No people match your search.</div>
          </template>
        </v-list>

        <div class="d-flex align-center justify-space-between mt-2" v-if="filteredPeople.length > 0">
          <div class="text-caption text-medium-emphasis">
            Showing {{ pageFrom + 1 }}–{{ pageTo }} of {{ filteredPeople.length }}
          </div>
          <v-pagination
            v-model="assignDialog.page"
            :length="pageCount"
            density="comfortable"
            size="small"
            total-visible="5"
          />
        </div>

        <v-divider class="my-3" />

        <div class="d-flex align-center justify-space-between">
          <div class="text-caption text-medium-emphasis">
            Can't find the right person?
          </div>
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            :disabled="!assignDialog.search.trim() || assignDialog.creating"
            :loading="assignDialog.creating"
            @click="createAndAssign()"
          >
            <v-icon class="me-1" size="small">mdi-account-plus</v-icon>
            Create "{{ assignDialog.search.trim() }}"
          </v-btn>
        </div>

        <div v-if="assignDialog.error" class="mt-2 text-error text-caption">{{ assignDialog.error }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="assignDialog.open = false">Cancel</v-btn>
      </v-card-actions>
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

const emit = defineEmits(['update:modelValue', 'asset-changed', 'asset-deleted'])

// Reactive state
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const { assets: assetsApi, people, utils } = useApi()

const detailedAsset = ref(props.asset)
const currentAsset = computed(() => detailedAsset.value)
const panelCollapsed = ref(false)
const showUnassigned = ref(false)
// Delete dialog state
const deleteDialog = reactive({ open: false, loading: false, error: '' })

const confirmDelete = async () => {
  if (!currentAsset.value) return
  deleteDialog.loading = true
  deleteDialog.error = ''
  try {
    const res = await assetsApi.delete(currentAsset.value.id)
    // Successful delete returns 204; our wrapper returns success boolean
    if (res && res.success !== false) {
      emit('asset-deleted', currentAsset.value.id)
      deleteDialog.open = false
      close()
    } else {
      deleteDialog.error = (res && res.error) || 'Failed to delete photo'
    }
  } catch (e) {
    deleteDialog.error = e?.message || 'Failed to delete photo'
  } finally {
    deleteDialog.loading = false
  }
}


// Assign dialog state
const assignDialog = reactive({
  open: false,
  face: null,
  search: '',
  loading: false,
  people: [],
  creating: false,
  error: '',
  page: 1,
  pageSize: 12
})

const openAssignDialog = async (face) => {
  assignDialog.face = face
  assignDialog.open = true
  assignDialog.search = ''
  assignDialog.loading = true
  assignDialog.error = ''
  try {
    // Prefer ranked candidates for this face (no artificial delays)
    const candidates = await utils.createEndpoint('get', `/api/people/faces/${face.id}/candidates/`)(undefined, { limit: 50 })
    if (candidates && candidates.success && candidates.data && candidates.data.results) {
      assignDialog.people = candidates.data.results
    } else {
      // Fallback: list people (unranked)
      const res = await people.list({ limit: 50, offset: 0 })
      const items = (res && res.success && res.data && (res.data.results || res.data)) ? (res.data.results || res.data) : []
      assignDialog.people = Array.isArray(items) ? items : []
    }
  } catch {
    assignDialog.people = []
  } finally {
    assignDialog.loading = false
    assignDialog.page = 1
  }
}

const filteredPeople = computed(() => {
  const q = (assignDialog.search || '').toLowerCase().trim()
  if (!q) return assignDialog.people
  return assignDialog.people.filter(p => (p.display_name || '').toLowerCase().includes(q))
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredPeople.value.length / Math.max(assignDialog.pageSize, 1))))
const paginatedPeople = computed(() => {
  const size = Math.max(assignDialog.pageSize, 1)
  const page = Math.min(Math.max(assignDialog.page, 1), Math.max(1, Math.ceil(filteredPeople.value.length / size)))
  const start = (page - 1) * size
  const end = start + size
  return filteredPeople.value.slice(start, end)
})
const pageFrom = computed(() => {
  const size = Math.max(assignDialog.pageSize, 1)
  return Math.min((Math.max(assignDialog.page, 1) - 1) * size, Math.max(filteredPeople.value.length - 1, 0))
})
const pageTo = computed(() => Math.min(pageFrom.value + Math.max(assignDialog.pageSize, 1), filteredPeople.value.length))

// Reset/clamp pagination on search/results change
watch(() => assignDialog.search, () => { assignDialog.page = 1 })
watch(filteredPeople, (list) => {
  const maxPage = Math.max(1, Math.ceil(list.length / Math.max(assignDialog.pageSize, 1)))
  if (assignDialog.page > maxPage) assignDialog.page = maxPage
})

const assignedFaces = computed(() => {
  const faces = currentAsset.value?.faces || []
  return faces.filter((f) => !!f.person)
})

const unassignedFaces = computed(() => {
  const faces = currentAsset.value?.faces || []
  return faces.filter((f) => !f.person)
})

// Lazy loading for full images
const {
  currentImageUrl,
  isFullImageLoaded,
  isFullImageLoading,
  startLoadingFullImage,
  loadFullImage
} = useLazyImage(toRef(props, 'asset'), {
  loadDelay: 300, // Load full image after 300ms
  preloadOnHover: true
})

// Keep thumbnail visible while full image preloads; only show spinner when no URL
const displayedImageUrl = computed(() => {
  // During transitions, currentImageUrl already points to thumbnail, and swaps to full when ready.
  // When navigating quickly, ensure we always have a URL to show.
  return currentImageUrl.value || currentAsset.value?.thumbnail_url || currentAsset.value?.original_url || ''
})

const thumbnailUrl = computed(() => currentAsset.value?.thumbnail_url || '')

// Navigation computed properties
const currentIndex = computed(() => {
  if (!currentAsset.value || !props.assets.length) return -1
  return props.assets.findIndex(a => a.id === currentAsset.value.id)
})

const hasPrevious = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.assets.length - 1)

// Preload neighbors to avoid visible swaps when navigating quickly
watch(() => currentIndex.value, (idx) => {
  if (idx < 0) return
  const preload = (asset) => {
    if (!asset) return
    const url = asset.original_url || asset.storage_url
    if (!url) return
    const img = new Image()
    img.src = url
  }
  // Next and previous in the provided assets list
  const next = props.assets[idx + 1]
  const prev = props.assets[idx - 1]
  preload(next)
  preload(prev)
})

// Methods
const close = () => {
  isOpen.value = false
  clearHighlight()
}

const goToPrevious = () => {
  if (hasPrevious.value) {
    clearHighlight()
    const prevAsset = props.assets[currentIndex.value - 1]
    emit('asset-changed', prevAsset)
  }
}

const goToNext = () => {
  if (hasNext.value) {
    clearHighlight()
    const nextAsset = props.assets[currentIndex.value + 1]
    emit('asset-changed', nextAsset)
  }
}

const handleContentClick = (event) => {
  // Close on background click (not on image)
  if (event.target.classList.contains('viewer-content')) {
    close()
  }
}

const downloadPhoto = () => {
  if (currentAsset.value?.original_url) {
    const link = document.createElement('a')
    link.href = currentAsset.value.original_url
    link.download = `photo-${currentAsset.value.id}.jpg`
    link.click()
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const onImageLoad = () => {
  console.log('Image loaded:', currentAsset.value?.original_url)
}

const onImageError = (error) => {
  console.error('Image failed to load:', error, currentAsset.value?.original_url)
}
// Face highlight overlay
const highlightedFace = ref(null)
function highlightFace(face) { highlightedFace.value = face }
function clearHighlight() { highlightedFace.value = null }

// Convert normalized face box to absolute CSS for overlay
const imgWrap = ref(null)
const imageRef = ref(null)

function faceStyle(face) {
  if (!face) return {}
  try {
    const m = getRenderMetrics()
    if (!m) return {}
    const left = m.offsetX + (face.x || 0) * m.renderW
    const top = m.offsetY + (face.y || 0) * m.renderH
    const width = (face.w || 0) * m.renderW
    const height = (face.h || 0) * m.renderH
    return { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' }
  } catch { return {} }
}

function getRenderMetrics() {
  const vImgEl = imageRef.value?.$el
  if (!vImgEl) return null
  const containerRect = vImgEl.getBoundingClientRect()
  const containerWidth = containerRect.width || 0
  const containerHeight = containerRect.height || 0
  if (!containerWidth || !containerHeight) return null
  const imageWidth = currentAsset.value?.width || containerWidth
  const imageHeight = currentAsset.value?.height || containerHeight
  const imageAR = imageWidth / Math.max(imageHeight, 1)
  const containerAR = containerWidth / Math.max(containerHeight, 1)
  let renderW = 0, renderH = 0, offsetX = 0, offsetY = 0
  if (imageAR > containerAR) {
    renderW = containerWidth
    renderH = renderW / imageAR
    offsetX = 0
    offsetY = (containerHeight - renderH) / 2
  } else {
    renderH = containerHeight
    renderW = renderH * imageAR
    offsetY = 0
    offsetX = (containerWidth - renderW) / 2
  }
  return { containerWidth, containerHeight, renderW, renderH, offsetX, offsetY }
}

function toImageCoords(clientX, clientY) {
  const vImgEl = imageRef.value?.$el
  if (!vImgEl) return { x: 0, y: 0 }
  const m = getRenderMetrics()
  if (!m) return { x: 0, y: 0 }
  const rect = vImgEl.getBoundingClientRect()
  const x = (clientX - rect.left - m.offsetX) / Math.max(m.renderW, 1)
  const y = (clientY - rect.top - m.offsetY) / Math.max(m.renderH, 1)
  return { x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) }
}

const drawnBoxStyle = computed(() => {
  if (!drawnBox.value) return {}
  const m = getRenderMetrics()
  if (!m) return {}
  const left = m.offsetX + drawnBox.value.x * m.renderW
  const top = m.offsetY + drawnBox.value.y * m.renderH
  const width = drawnBox.value.w * m.renderW
  const height = drawnBox.value.h * m.renderH
  return { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' }
})

// Assign face(s) to a selected person
const assignToPerson = async (person) => {
  if (!assignDialog.face || !person) return
  try {
    const assign = await utils.createEndpoint('post', '/api/people/faces/assign/')({
      face_ids: [assignDialog.face.id],
      person_id: person.id
    })
    if (!assign.success) {
      alert(assign.error || 'Failed to assign face')
      return
    }
    assignDialog.open = false
    // Refresh asset to reflect updated faces
    const refreshed = await assetsApi.get(currentAsset.value.id)
    if (refreshed && refreshed.success && refreshed.data) {
      detailedAsset.value = cacheBustAssetFaces({ ...currentAsset.value, ...refreshed.data })
    }
  } catch (e) {
    console.error('Assign failed', e)
    alert('Failed to assign face')
  }
}

// Create a new person from search text and assign the face
const createAndAssign = async () => {
  const name = assignDialog.search.trim()
  if (!name || !assignDialog.face) return
  assignDialog.creating = true
  assignDialog.error = ''
  try {
    const created = await people.create({ display_name: name })
    if (!created.success || !created.data?.id) {
      throw new Error(created.error || 'Failed to create person')
    }
    await assignToPerson(created.data)
  } catch (e) {
    assignDialog.error = e?.message || 'Failed to create and assign person'
  } finally {
    assignDialog.creating = false
  }
}

// Unassign a face (set to Unknown)
const unassignFace = async (face) => {
  if (!face) return
  try {
    const res = await utils.createEndpoint('post', '/api/people/faces/unassign/')({
      face_ids: [face.id]
    })
    if (!res || res.success === false) {
      alert(res?.error || 'Failed to unassign face')
      return
    }
    // Refresh asset to reflect updated faces
    const refreshed = await assetsApi.get(currentAsset.value.id)
    if (refreshed && refreshed.success && refreshed.data) {
      detailedAsset.value = cacheBustAssetFaces({ ...currentAsset.value, ...refreshed.data })
    }
  } catch (e) {
    console.error('Unassign failed', e)
    alert('Failed to unassign face')
  }
}

// Add-face mode: draw a box and create a manual face
const editFacesMode = ref(false)
const addFaceMode = ref(false)
const drawing = ref(false)
const startPt = ref({ x: 0, y: 0 })
const endPt = ref({ x: 0, y: 0 })
const drawnBox = computed(() => {
  if (!drawing.value) return null
  const x1 = Math.min(startPt.value.x, endPt.value.x)
  const y1 = Math.min(startPt.value.y, endPt.value.y)
  const x2 = Math.max(startPt.value.x, endPt.value.x)
  const y2 = Math.max(startPt.value.y, endPt.value.y)
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
})

function toggleEditFacesMode() {
  editFacesMode.value = !editFacesMode.value
  if (!editFacesMode.value) addFaceMode.value = false
}

function toggleAddFaceMode() {
  if (!editFacesMode.value) editFacesMode.value = true
  addFaceMode.value = !addFaceMode.value
  drawing.value = false
}

function onMouseDown(e) {
  if (!addFaceMode.value || !editFacesMode.value) return
  drawing.value = true
  const p = toImageCoords(e.clientX, e.clientY)
  startPt.value = p
  endPt.value = p
}
function onMouseMove(e) {
  if (!addFaceMode.value || !editFacesMode.value || !drawing.value) return
  endPt.value = toImageCoords(e.clientX, e.clientY)
}
async function onMouseUp(e) {
  if (!addFaceMode.value || !editFacesMode.value || !drawing.value) return
  const box = drawnBox.value // capture while drawing is still true
  drawing.value = false
  if (!box || box.w < 0.01 || box.h < 0.01) {
    return
  }
  try {
    const payload = { asset_id: currentAsset.value.id, x: box.x, y: box.y, w: box.w, h: box.h }
    const res = await utils.createEndpoint('post', '/api/people/faces/manual-create/')(payload)
    if (!res.success) {
      alert(res.error || 'Failed to create face')
    } else {
      const createdFace = res.data
      if (createdFace && createdFace.id) {
        // Immediately open the assignment dialog with ranked candidates
        openAssignDialog(createdFace)
      }
      const refreshed = await assetsApi.get(currentAsset.value.id)
      if (refreshed && refreshed.success && refreshed.data) {
        detailedAsset.value = cacheBustAssetFaces({ ...currentAsset.value, ...refreshed.data })
      }
    }
  } catch (err) {
    console.error('Manual create failed', err)
    alert('Failed to create face')
  } finally {
    addFaceMode.value = false
  }
}

function onMouseLeave(e) {
  if (!addFaceMode.value || !editFacesMode.value || !drawing.value) return
  // Treat mouse leave like mouse up
  onMouseUp(e)
}

// Delete a face entirely
const deleteFace = async (face) => {
  if (!face?.id) return
  const confirmDel = confirm('Delete this face? This cannot be undone.')
  if (!confirmDel) return
  try {
    const del = await utils.createEndpoint('delete', `/api/people/faces/${face.id}/`)()
    if (del && del.success === false) {
      alert(del.error || 'Failed to delete face')
      return
    }
    // Refresh asset to reflect updated faces
    const refreshed = await assetsApi.get(currentAsset.value.id)
    if (refreshed && refreshed.success && refreshed.data) {
      detailedAsset.value = cacheBustAssetFaces({ ...currentAsset.value, ...refreshed.data })
    }
  } catch (e) {
    console.error('Delete face failed', e)
    alert('Failed to delete face')
  }
}

// Keyboard navigation
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
      if (addFaceMode.value || editFacesMode.value) {
        addFaceMode.value = false
        editFacesMode.value = false
      } else {
        close()
      }
      break
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

// Watch for asset changes to start loading full image
watch(() => props.asset, (newAsset) => {
  if (newAsset) {
    clearHighlight()
    detailedAsset.value = newAsset
    // Fetch full asset details (includes faces) so People section can render
    assetsApi.get(newAsset.id).then((res) => {
      if (res && res.success && res.data) {
        // Merge and cache-bust to force v-img reloads
        detailedAsset.value = cacheBustAssetFaces({ ...newAsset, ...res.data })
      }
    }).catch(() => { /* ignore */ })
    // Start loading full image after a short delay
    setTimeout(() => {
      startLoadingFullImage()
    }, 100)
  }
}, { immediate: true })

// Watch for dialog opening to start loading full image
watch(isOpen, (newValue) => {
  if (newValue && props.asset) {
    // Start loading full image when dialog opens
    setTimeout(() => {
      startLoadingFullImage()
    }, 200)
  }
})

function cacheBustAssetFaces(asset) {
  if (!asset || !Array.isArray(asset.faces)) return asset
  const ts = Date.now()
  const addQ = (url) => url ? (url.includes('?') ? `${url}&v=${ts}` : `${url}?v=${ts}`) : url
  const faces = asset.faces.map((f) => ({
    ...f,
    thumbnail_url: addQ(f.thumbnail_url),
    person_headshot_url: addQ(f.person_headshot_url)
  }))
  return { ...asset, faces }
}
</script>

<style scoped>
.viewer-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
}

.viewer-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  z-index: 10;
}

.close-btn {
  margin-right: 1rem;
}

.header-info {
  flex: 1;
  display: flex;
  justify-content: center;
}

.photo-counter {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.viewer-main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.viewer-content {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.image-container.crosshair { cursor: crosshair; }
.face-highlight { background: rgba(76, 175, 80, 0.15); }

.main-image {
  max-width: 100%;
  max-height: 100%;
  user-select: none;
  pointer-events: none;
}

.face-highlight {
  position: absolute;
  border: 2px solid #4CAF50;
  box-shadow: 0 0 4px rgba(76, 175, 80, 0.6);
  pointer-events: none;
}

.overlay-layer {
  position: absolute;
  inset: 0;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
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
  left: 2rem;
}

.nav-arrow-right {
  right: 2rem;
}

.face-box-overlay {
  position: absolute;
  border: 2px dashed #4CAF50;
  box-shadow: 0 0 4px rgba(76, 175, 80, 0.6);
  pointer-events: none;
  cursor: crosshair;
}


/* Side Panel Styles */
.side-panel {
  width: 400px;
  background: rgba(18, 18, 18, 0.95);
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
  overflow-y: auto;
}

.side-panel.collapsed {
  width: 60px;
}

.panel-toggle {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(10px);
}

.panel-content {
  padding: 3rem 1.5rem 1.5rem;
  color: white;
}

.info-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.info-value {
  font-size: 0.95rem;
  color: white;
  font-weight: 400;
}

.description-text {
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  white-space: pre-wrap;
}

.keywords-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.people-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
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
  color: white;
  font-size: 0.95rem;
}

.person-confidence {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
}

.img-wrap { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }

/* Responsive adjustments */
@media (max-width: 1024px) {
  .side-panel {
    width: 320px;
  }
  
  .panel-content {
    padding: 3rem 1rem 1rem;
  }
}

@media (max-width: 768px) {
  .viewer-main-content {
    flex-direction: column;
  }
  
  .side-panel {
    width: 100%;
    height: 40vh;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    order: 2;
  }
  
  .side-panel.collapsed {
    height: 60px;
    width: 100%;
  }
  
  .panel-toggle {
    top: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
  }
  
  .viewer-content {
    order: 1;
  }
  
  .nav-arrow-left {
    left: 1rem;
  }
  
  .nav-arrow-right {
    right: 1rem;
  }
  
  .viewer-header {
    padding: 0 0.5rem;
  }
}

/* Hide scrollbars */
:deep(.v-dialog) {
  overflow: hidden;
}

:deep(.v-overlay__content) {
  margin: 0 !important;
  max-width: none !important;
  max-height: none !important;
}
</style>
