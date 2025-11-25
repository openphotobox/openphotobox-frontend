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
          <!-- Like button with count -->
          <div class="like-button-group">
            <v-btn
              icon
              variant="text"
              color="white"
              @click="toggleLike"
              :disabled="!currentAsset || likesLoading"
            >
              <v-icon :color="currentAsset?.liked_by_user ? 'red' : 'white'">
                {{ currentAsset?.liked_by_user ? 'mdi-heart' : 'mdi-heart-outline' }}
              </v-icon>
            </v-btn>
            
            <!-- Like count (clickable to show who liked) -->
            <span
              v-if="currentAsset?.likes_count"
              class="like-count"
              @click="showLikesDialog = true"
            >
              {{ currentAsset.likes_count }}
            </span>
          </div>
          
          <!-- Add to Album -->
          <v-btn
            v-if="showAddToAlbum"
            icon
            variant="text"
            color="white"
            @click="showAlbumSelector = true"
            :disabled="!currentAsset"
          >
            <v-icon>mdi-folder-plus</v-icon>
          </v-btn>
          <!-- Delete photo -->
          <v-btn
            v-if="showDelete"
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
                <div class="image-placeholder">
                  <!-- Show thumbnail while full image loads for instant feedback -->
                  <img 
                    v-if="currentAsset?.thumbnail_url && displayedImageUrl !== currentAsset.thumbnail_url"
                    :src="currentAsset.thumbnail_url" 
                    class="placeholder-thumbnail"
                    alt="Loading..."
                  />
                  <v-progress-circular 
                    v-else
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
                    <div class="person-name">
                      {{ face.person_name }}{{ face.confirmed === false ? '?' : '' }}
                    </div>
                    <div class="person-actions mt-1">
                      <!-- For unconfirmed faces (candidates), show confirm/reject buttons -->
                      <template v-if="face.confirmed === false && !editFacesMode">
                        <v-btn
                          size="x-small"
                          variant="text"
                          icon
                          color="success"
                          @click.stop="confirmFace(face)"
                          :title="'Confirm this assignment'"
                        >
                          <v-icon size="small">mdi-check</v-icon>
                        </v-btn>
                        <v-btn
                          size="x-small"
                          variant="text"
                          icon
                          color="error"
                          @click.stop="unassignFace(face)"
                          :title="'Reject (unassign)'"
                        >
                          <v-icon size="small">mdi-close</v-icon>
                        </v-btn>
                      </template>
                      <!-- For confirmed faces in edit mode, show edit/unassign/delete -->
                      <template v-if="editFacesMode">
                        <v-btn
                          size="x-small"
                          variant="text"
                          icon
                          @click.stop="openAssignDialog(face)"
                          :title="'Edit assignment'"
                        >
                          <v-icon size="small">mdi-pencil</v-icon>
                        </v-btn>
                        <v-btn
                          size="x-small"
                          variant="text"
                          icon
                          color="error"
                          @click.stop="unassignFace(face)"
                          :title="'Unmatch (set to Unknown)'"
                        >
                          <v-icon size="small">mdi-link-off</v-icon>
                        </v-btn>
                        <v-btn
                          size="x-small"
                          variant="text"
                          icon
                          color="error"
                          @click.stop="deleteFace(face)"
                          :title="'Delete face'">
                          <v-icon size="small">mdi-delete</v-icon>
                        </v-btn>
                      </template>
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
                          <v-btn size="x-small" variant="tonal" color="primary" @click.stop="openAssignDialog(face)">Assign</v-btn>
                          <v-btn v-if="editFacesMode" size="x-small" variant="text" color="error" class="ms-1" @click.stop="deleteFace(face)">Delete</v-btn>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Comments Section -->
            <div class="info-section mt-4">
              <h3 class="section-title">
                <v-icon class="me-2">mdi-comment-multiple</v-icon>
                Comments ({{ currentAsset?.comments_count || 0 }})
              </h3>
              
              <!-- Comments list -->
              <div class="comments-container">
                <div v-if="commentsLoading" class="text-center py-4">
                  <v-progress-circular indeterminate size="24"></v-progress-circular>
                </div>
                
                <div v-else-if="!currentAsset?.comments || currentAsset.comments.length === 0" class="empty-comments-message">
                  No comments yet. Be the first to comment!
                </div>
                
                <div v-else class="comments-list">
                  <div
                    v-for="comment in currentAsset.comments"
                    :key="comment.id"
                    class="comment-item"
                  >
                    <v-avatar size="32" color="rgba(255, 255, 255, 0.1)">
                      <v-icon size="20" color="rgba(255, 255, 255, 0.7)">mdi-account-circle</v-icon>
                    </v-avatar>
                    <div class="comment-content">
                      <div class="comment-header">
                        <strong class="comment-author">{{ comment.user_username || comment.user_name || `User ${comment.user}` }}</strong>
                        <span class="comment-time">
                          {{ formatRelativeTime(comment.created_at) }}
                        </span>
                      </div>
                      
                      <!-- Edit mode -->
                      <div v-if="editingComment?.id === comment.id">
                        <v-textarea
                          v-model="editingComment.content"
                          variant="outlined"
                          density="compact"
                          rows="2"
                          auto-grow
                          class="mt-1"
                        ></v-textarea>
                        <div class="d-flex gap-2 mt-1">
                          <v-btn size="small" color="primary" @click="saveComment">Save</v-btn>
                          <v-btn size="small" variant="text" @click="editingComment = null">Cancel</v-btn>
                        </div>
                      </div>
                      
                      <!-- View mode -->
                      <div v-else>
                        <div class="comment-text">{{ comment.content }}</div>
                        <div v-if="authStore.user?.id === comment.user" class="comment-actions">
                          <v-btn size="x-small" variant="text" class="text-none" style="opacity: 0.7;" @click="editComment(comment)">Edit</v-btn>
                          <v-btn size="x-small" variant="text" color="error" class="text-none" style="opacity: 0.7;" @click="deleteComment(comment.id)">Delete</v-btn>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Add comment -->
              <div class="add-comment mt-4">
                <v-textarea
                  v-model="commentText"
                  variant="outlined"
                  density="compact"
                  placeholder="Add a comment..."
                  rows="2"
                  auto-grow
                  :disabled="commentsLoading"
                  hide-details
                ></v-textarea>
                <div class="d-flex justify-end mt-2">
                  <v-btn
                    color="primary"
                    size="small"
                    :disabled="!commentText.trim() || commentsLoading"
                    :loading="commentsLoading"
                    @click="addComment"
                  >
                    Post Comment
                  </v-btn>
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

  <!-- Album Selector Dialog -->
  <AlbumSelectorDialog
    v-model="showAlbumSelector"
    :asset-ids="currentAssetIds"
  />

  <!-- Likes Dialog -->
  <v-dialog v-model="showLikesDialog" max-width="400">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon color="red" class="me-2">mdi-heart</v-icon>
        Liked by {{ currentAsset?.likes_count || 0 }}
      </v-card-title>
      <v-card-text>
        <v-list v-if="currentAsset?.likes && currentAsset.likes.length > 0">
          <v-list-item v-for="username in currentAsset.likes" :key="username">
            <template v-slot:prepend>
              <v-avatar size="32" color="primary">
                <span class="text-white">{{ username.charAt(0).toUpperCase() }}</span>
              </v-avatar>
            </template>
            <v-list-item-title>{{ username }}</v-list-item-title>
          </v-list-item>
        </v-list>
        <div v-else class="text-caption text-medium-emphasis py-4">
          No likes yet
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="showLikesDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import AlbumSelectorDialog from '~/components/AlbumSelectorDialog.vue'
import { useAuthStore } from '~/stores/auth'

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
  },
  showDelete: {
    type: Boolean,
    default: true
  },
  showAddToAlbum: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'asset-changed', 'asset-deleted'])

// Reactive state
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const { assets: assetsApi, people, faces, utils, comments, likes } = useApi()
const authStore = useAuthStore()

const detailedAsset = ref(props.asset)
const currentAsset = computed(() => detailedAsset.value)
const panelCollapsed = ref(false)
const showUnassigned = ref(false)
// Delete dialog state
const deleteDialog = reactive({ open: false, loading: false, error: '' })
// Album selector dialog state
const showAlbumSelector = ref(false)

const currentAssetIds = computed(() => {
  return currentAsset.value ? [currentAsset.value.id] : []
})

// Likes and comments state
const likesLoading = ref(false)
const commentsLoading = ref(false)
const commentText = ref('')
const editingComment = ref(null)
const showLikesDialog = ref(false)

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

// Direct image URL - use preview/display size for optimal viewing
const displayedImageUrl = computed(() => {
  // Prefer preview/display size (2048px) for viewing - perfect for screens, much smaller than original
  // Fall back to original if preview not available yet (during migration)
  return currentAsset.value?.preview_url || currentAsset.value?.display_url || 
         currentAsset.value?.original_url || currentAsset.value?.storage_url || 
         currentAsset.value?.thumbnail_url || ''
})

// Navigation computed properties
const currentIndex = computed(() => {
  if (!currentAsset.value || !props.assets.length) return -1
  return props.assets.findIndex(a => a.id === currentAsset.value.id)
})

const hasPrevious = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.assets.length - 1)

// Enhanced preloading: Load current image + multiple neighbors for smooth navigation
const imageCache = new Map()

const preloadImage = (asset) => {
  if (!asset) return
  // Use preview/display size for preloading (much smaller than original)
  const url = asset.preview_url || asset.display_url || asset.original_url || asset.storage_url
  if (!url) return
  
  // Check if already cached
  if (imageCache.has(url)) return
  
  // Preload the image
  const img = new Image()
  img.onload = () => {
    imageCache.set(url, img)
  }
  img.onerror = () => {
    // Remove from cache on error
    imageCache.delete(url)
  }
  img.src = url
}

// Preload strategy: Load current + 5 in each direction when viewer opens or navigates
watch(() => currentIndex.value, (idx) => {
  if (idx < 0) return
  
  // Preload range (5 images in each direction for smoother navigation)
  const preloadRange = 5
  for (let i = idx - preloadRange; i <= idx + preloadRange; i++) {
    if (i >= 0 && i < props.assets.length) {
      preloadImage(props.assets[i])
    }
  }
}, { immediate: true })

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
  // Always download the full original, not the preview
  const originalUrl = currentAsset.value?.original_url || currentAsset.value?.storage_url
  if (originalUrl) {
    const link = document.createElement('a')
    link.href = originalUrl
    link.download = `photo-${currentAsset.value.id}.jpg`
    link.click()
  }
}

// Toggle like/unlike
const toggleLike = async () => {
  if (!currentAsset.value || likesLoading.value) return
  
  likesLoading.value = true
  const assetId = currentAsset.value.id
  const wasLiked = currentAsset.value.liked_by_user
  
  try {
    if (wasLiked) {
      // Unlike: need to find the like ID first
      const likesRes = await likes.list({ asset: assetId })
      if (likesRes.success && likesRes.data) {
        const results = likesRes.data.results || likesRes.data
        const userLike = Array.isArray(results) ? results.find(like => like.user === authStore.user?.id) : null
        
        if (userLike) {
          const res = await likes.delete(userLike.id)
          if (res.success) {
            // Optimistically update UI
            if (currentAsset.value) {
              currentAsset.value.liked_by_user = false
              currentAsset.value.likes_count = Math.max(0, (currentAsset.value.likes_count || 0) - 1)
              // Remove current user from likes array
              if (currentAsset.value.likes && authStore.user?.username) {
                currentAsset.value.likes = currentAsset.value.likes.filter(u => u !== authStore.user.username)
              }
            }
          }
        }
      }
    } else {
      // Like
      const res = await likes.create({ asset: assetId })
      if (res.success) {
        // Optimistically update UI
        if (currentAsset.value) {
          currentAsset.value.liked_by_user = true
          currentAsset.value.likes_count = (currentAsset.value.likes_count || 0) + 1
          // Add current user to likes array
          if (!currentAsset.value.likes) currentAsset.value.likes = []
          if (authStore.user?.username) {
            currentAsset.value.likes.push(authStore.user.username)
          }
        }
      }
    }
    
    // Refresh the asset to get accurate data
    const refreshed = await assetsApi.get(assetId)
    if (refreshed && refreshed.success && refreshed.data) {
      detailedAsset.value = cacheBustAssetFaces({ ...currentAsset.value, ...refreshed.data })
    }
  } catch (error) {
    console.error('Failed to toggle like:', error)
  } finally {
    likesLoading.value = false
  }
}

// Add comment
const addComment = async () => {
  if (!currentAsset.value || !commentText.value.trim() || commentsLoading.value) return
  
  commentsLoading.value = true
  try {
    const res = await comments.create({
      asset: currentAsset.value.id,
      content: commentText.value.trim()
    })
    
    if (res.success && res.data) {
      // Update UI
      if (!currentAsset.value.comments) currentAsset.value.comments = []
      currentAsset.value.comments.push(res.data)
      currentAsset.value.comments_count = (currentAsset.value.comments_count || 0) + 1
      commentText.value = ''
      
      // Refresh asset to get complete data
      const refreshed = await assetsApi.get(currentAsset.value.id)
      if (refreshed && refreshed.success && refreshed.data) {
        detailedAsset.value = cacheBustAssetFaces({ ...currentAsset.value, ...refreshed.data })
      }
    }
  } catch (error) {
    console.error('Failed to add comment:', error)
  } finally {
    commentsLoading.value = false
  }
}

// Edit comment
const editComment = (comment) => {
  editingComment.value = { ...comment }
}

// Save edited comment
const saveComment = async () => {
  if (!editingComment.value || !editingComment.value.content.trim() || commentsLoading.value) return
  
  commentsLoading.value = true
  try {
    const res = await comments.update(editingComment.value.id, {
      content: editingComment.value.content.trim()
    })
    
    if (res.success && res.data && currentAsset.value) {
      // Update the comment in the list
      const index = currentAsset.value.comments?.findIndex(c => c.id === editingComment.value.id)
      if (index !== undefined && index >= 0 && currentAsset.value.comments) {
        currentAsset.value.comments[index] = res.data
      }
      editingComment.value = null
    }
  } catch (error) {
    console.error('Failed to save comment:', error)
  } finally {
    commentsLoading.value = false
  }
}

// Delete comment
const deleteComment = async (commentId) => {
  if (!currentAsset.value || commentsLoading.value) return
  
  commentsLoading.value = true
  try {
    const res = await comments.delete(commentId)
    
    if (res.success && currentAsset.value) {
      // Remove comment from list
      currentAsset.value.comments = currentAsset.value.comments?.filter(c => c.id !== commentId)
      currentAsset.value.comments_count = Math.max(0, (currentAsset.value.comments_count || 0) - 1)
    }
  } catch (error) {
    console.error('Failed to delete comment:', error)
  } finally {
    commentsLoading.value = false
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

const formatRelativeTime = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  
  // For older dates, show short date format
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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

// Confirm a face assignment
const confirmFace = async (face) => {
  if (!face) return
  try {
    const res = await faces.bulkConfirm({ face_ids: [face.id] })
    if (!res || res.success === false) {
      alert(res?.error || 'Failed to confirm face')
      return
    }
    // Refresh asset to reflect updated faces
    const refreshed = await assetsApi.get(currentAsset.value.id)
    if (refreshed && refreshed.success && refreshed.data) {
      detailedAsset.value = cacheBustAssetFaces({ ...currentAsset.value, ...refreshed.data })
    }
  } catch (e) {
    console.error('Confirm failed', e)
    alert('Failed to confirm face')
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

// Watch for asset changes to fetch details
watch(() => props.asset, (newAsset) => {
  if (newAsset) {
    clearHighlight()
    detailedAsset.value = newAsset
    
    // Immediately preload the current image
    preloadImage(newAsset)
    
    // Fetch full asset details (includes faces) so People section can render
    assetsApi.get(newAsset.id).then((res) => {
      if (res && res.success && res.data) {
        // Merge and cache-bust to force v-img reloads
        detailedAsset.value = cacheBustAssetFaces({ ...newAsset, ...res.data })
      }
    }).catch(() => { /* ignore */ })
  }
}, { immediate: true })

// When dialog opens, trigger preloading of nearby images
watch(isOpen, (newValue) => {
  if (newValue && currentIndex.value >= 0) {
    // Trigger the preload watcher
    const idx = currentIndex.value
    const preloadRange = 5
    for (let i = idx - preloadRange; i <= idx + preloadRange; i++) {
      if (i >= 0 && i < props.assets.length) {
        preloadImage(props.assets[i])
      }
    }
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
  position: relative;
}

.placeholder-thumbnail {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: blur(2px);
  opacity: 0.8;
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
  right: 1rem;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5) !important;
  backdrop-filter: blur(10px);
}

.panel-content {
  padding: 1.5rem;
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

.like-button-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.like-count {
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background 0.2s ease;
  min-width: 24px;
  text-align: center;
}

.like-count:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Comments Styling */
.comments-container {
  margin-top: 1rem;
}

.empty-comments-message {
  text-align: center;
  padding: 2rem 1rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.comments-list::-webkit-scrollbar {
  width: 6px;
}

.comments-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.comment-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  transition: background 0.2s ease;
}

.comment-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
}

.comment-author {
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
}

.comment-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
}

.comment-text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  word-wrap: break-word;
  white-space: pre-wrap;
}

.comment-actions {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.comment-actions .v-btn {
  min-width: auto;
  padding: 0 0.5rem;
  height: 24px;
  font-size: 0.75rem;
}

.comment-actions .v-btn:hover {
  opacity: 1 !important;
}

.add-comment {
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .side-panel {
    width: 320px;
  }
  
  .panel-content {
    padding: 1rem;
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
    right: 1rem;
    left: auto;
    transform: none;
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
