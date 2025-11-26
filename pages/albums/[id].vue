<script setup lang="ts">
console.log("TEST")
import JustifiedGallery from '~/components/JustifiedGallery.vue'
import ImageViewerV2 from '~/components/ImageViewerV2.vue'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const router = useRouter()
const albumId = computed(() => route.params.id as string)
const api = useApi()
const authStore = useAuthStore()

// Check if user is admin
const isAdmin = computed(() => authStore.isAdmin)

const album = ref<any>(null)
const albumAssets = ref<any[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const currentOffset = ref(0)
const hasMore = ref(true)
const pageSize = 50

const showEditDialog = ref(false)
const showShareDialog = ref(false)
const showAssetDialog = ref(false)
const selectedAsset = ref(null)
const editFormValid = ref(false)
const editForm = ref(null)
const editMode = ref(false)
const selectedPhotoIds = ref<Set<string>>(new Set())
const showRemoveDialog = ref(false)
const removingPhotos = ref(false)
const allUsers = ref<any[]>([])
const selectedUserId = ref('')
const selectedPermission = ref<'view' | 'contribute'>('view')
const loadingUsers = ref(false)
const sharingAlbum = ref(false)

const editAlbum = ref({
  title: '',
  description: '',
  cover: null as any
})

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date'
  return new Date(dateString).toLocaleDateString()
}

const openAsset = (asset) => {
  if (editMode.value) {
    togglePhotoSelection(asset.id)
  } else {
    selectedAsset.value = asset
    showAssetDialog.value = true
  }
}

const toggleEditMode = () => {
  editMode.value = !editMode.value
  if (!editMode.value) {
    selectedPhotoIds.value.clear()
  }
}

const togglePhotoSelection = (photoId: string) => {
  if (selectedPhotoIds.value.has(photoId)) {
    selectedPhotoIds.value.delete(photoId)
  } else {
    selectedPhotoIds.value.add(photoId)
  }
}

const isPhotoSelected = (photoId: string) => {
  return selectedPhotoIds.value.has(photoId)
}

const selectAllPhotos = () => {
  albumAssets.value.forEach(asset => selectedPhotoIds.value.add(asset.id))
}

const clearPhotoSelection = () => {
  selectedPhotoIds.value.clear()
}

const openRemoveDialog = () => {
  if (selectedPhotoIds.value.size === 0) return
  showRemoveDialog.value = true
}

const removePhotos = async () => {
  if (!album.value || selectedPhotoIds.value.size === 0) return
  
  removingPhotos.value = true
  try {
    const res = await api.albums.removePhotos(album.value.id, Array.from(selectedPhotoIds.value))
    if (res.success) {
      // Remove deleted photos from the list
      albumAssets.value = albumAssets.value.filter(asset => !selectedPhotoIds.value.has(asset.id))
      album.value = res.data as any
      selectedPhotoIds.value.clear()
      editMode.value = false
      showRemoveDialog.value = false
    }
  } catch (error) {
    console.error('Failed to remove photos:', error)
  } finally {
    removingPhotos.value = false
  }
}

const handleAssetDeleted = (deletedId: string) => {
  // Remove the deleted asset from the album assets list
  albumAssets.value = albumAssets.value.filter(asset => asset.id !== deletedId)
  selectedAsset.value = null
  
  // Reload album to update photo count
  if (album.value) {
    loadAlbum()
  }
}

const saveAlbum = async () => {
  if (!editFormValid.value || !album.value) return
  try {
    const res = await api.albums.create({ title: editAlbum.value.title || album.value.title, description: editAlbum.value.description })
    if (res.success) {
      album.value = { ...album.value, ...res.data }
      showEditDialog.value = false
    }
  } catch {}
}

const loadUsers = async () => {
  loadingUsers.value = true
  try {
    const res = await api.users.list()
    if (res.success) {
      // Handle different response formats
      const data = res.data as any
      allUsers.value = Array.isArray(data) ? data : (data?.users || data?.results || [])
    }
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loadingUsers.value = false
  }
}

const shareWithUser = async () => {
  if (!selectedUserId.value || !album.value) return
  
  sharingAlbum.value = true
  try {
    const res = await api.albums.shareAlbum(album.value.id, selectedUserId.value, selectedPermission.value)
    if (res.success) {
      console.log('[shareWithUser] Response:', res.data)
      // Reload the album to get the updated shared_with list
      await loadAlbum()
      selectedUserId.value = ''
      selectedPermission.value = 'view'
    } else {
      console.error('[shareWithUser] Failed:', res.error)
    }
  } catch (error) {
    console.error('Failed to share album:', error)
  } finally {
    sharingAlbum.value = false
  }
}

const revokeAccess = async (userId: string) => {
  if (!album.value) return
  
  try {
    const res = await api.albums.unshareAlbum(album.value.id, userId)
    if (res.success) {
      console.log('[revokeAccess] Response:', res.data)
      // Reload the album to get the updated shared_with list
      await loadAlbum()
    } else {
      console.error('[revokeAccess] Failed:', res.error)
    }
  } catch (error) {
    console.error('Failed to revoke access:', error)
  }
}

const getAvailableUsers = computed(() => {
  if (!allUsers.value || allUsers.value.length === 0) {
    console.log('[getAvailableUsers] No users loaded:', allUsers.value)
    return []
  }
  
  if (!album.value) {
    console.log('[getAvailableUsers] No album loaded')
    return allUsers.value
  }
  
  const sharedUserIds = (album.value.shared_with || []).map((s: any) => String(s.user_id))
  console.log('[getAvailableUsers] Shared user IDs:', sharedUserIds)
  console.log('[getAvailableUsers] All users:', allUsers.value)
  
  const available = allUsers.value.filter(u => !sharedUserIds.includes(String(u.id)))
  console.log('[getAvailableUsers] Available users:', available)
  
  return available
})
const loadAlbum = async () => {
  console.log('[AlbumDetail] loadAlbum', albumId.value)
  loading.value = true
  
  // Reset pagination state
  currentOffset.value = 0
  hasMore.value = true
  albumAssets.value = []
  
  try {
    const [albumRes, assetsRes] = await Promise.all([
      api.albums.get(albumId.value),
      api.assets.list({ limit: pageSize, offset: 0, album_id: albumId.value as string })
    ])
    if (albumRes.success) {
      album.value = albumRes.data as any
      editAlbum.value.title = (album.value.title || album.value.name)
      editAlbum.value.description = album.value.description || ''
    }
    if (assetsRes.success) {
      const list = (assetsRes.data?.results || assetsRes.data || []) as any[]
      albumAssets.value = list
      currentOffset.value = list.length
      
      // Check if there are more results
      // If we got fewer items than requested, we've reached the end
      if (assetsRes.data?.next != null) {
        hasMore.value = true
      } else {
        hasMore.value = list.length === pageSize
      }
      console.log('[AlbumDetail] Initial load:', list.length, 'assets, hasMore:', hasMore.value, 'pageSize:', pageSize)
    }
  } finally {
    loading.value = false
  }
}

const loadMoreAssets = async () => {
  if (loadingMore.value || !hasMore.value || loading.value) {
    console.log('[InfiniteScroll] Skipping load:', { loadingMore: loadingMore.value, hasMore: hasMore.value, loading: loading.value })
    return
  }
  
  console.log('[InfiniteScroll] Loading more assets, offset:', currentOffset.value)
  loadingMore.value = true
  try {
    const assetsRes = await api.assets.list({ 
      limit: pageSize, 
      offset: currentOffset.value, 
      album_id: albumId.value as string 
    })
    
    if (assetsRes.success) {
      const list = (assetsRes.data?.results || assetsRes.data || []) as any[]
      console.log('[InfiniteScroll] Loaded', list.length, 'assets (requested:', pageSize, ')')
      
      if (list.length > 0) {
        albumAssets.value = [...albumAssets.value, ...list]
        currentOffset.value += list.length
      }
      
      // Check if there are more results
      // If we got fewer items than requested, we've reached the end
      if (assetsRes.data?.next != null) {
        hasMore.value = true
      } else {
        hasMore.value = list.length === pageSize
      }
      console.log('[InfiniteScroll] Has more:', hasMore.value, '(got', list.length, 'of', pageSize, 'requested)')
    }
  } catch (error) {
    console.error('Failed to load more assets:', error)
  } finally {
    loadingMore.value = false
  }
}

// Infinite scroll sentinel
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const setupIntersectionObserver = () => {
  // Clean up existing observer
  if (observer) {
    observer.disconnect()
  }
  
  // Create new observer
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && hasMore.value && !loadingMore.value && !loading.value) {
        console.log('[InfiniteScroll] Sentinel visible, loading more...')
        loadMoreAssets()
      }
    },
    {
      root: null,
      rootMargin: '400px', // Start loading 400px before reaching the sentinel
      threshold: 0
    }
  )
  
  // Start observing
  if (sentinelRef.value) {
    console.log('[InfiniteScroll] Observing sentinel')
    observer.observe(sentinelRef.value)
  }
}

onMounted(() => {
  loadAlbum()
  loadUsers()
})

// Watch for when sentinel becomes available
watch([sentinelRef, () => albumAssets.value.length], () => {
  if (sentinelRef.value && albumAssets.value.length > 0) {
    nextTick(() => {
      setupIntersectionObserver()
    })
  }
}, { immediate: true })

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

// Reload users when share dialog opens
watch(showShareDialog, (newValue) => {
  if (newValue) {
    console.log('[AlbumDetail] Share dialog opened, loading users...')
    loadUsers()
  }
})

// Reload on route change (navigating between albums using same component instance)
watch(() => route.fullPath, (p,n) => {
  console.log('[AlbumDetail] path change', n, '->', p)
  loadAlbum()
})
</script>

<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="navigateTo('/albums')"
              class="me-2"
            ></v-btn>
            <v-img
              :src="(album && album.cover_url) || '/placeholder-album.jpg'"
              width="40"
              height="40"
              cover
              class="me-3 rounded"
            ></v-img>
            {{ album ? (album.title || album.name) : 'Album' }}
            <v-spacer></v-spacer>
            
            <!-- Edit mode actions -->
            <template v-if="editMode">
              <v-chip class="me-2" color="primary">
                {{ selectedPhotoIds.size }} selected
              </v-chip>
              <v-btn
                variant="text"
                @click="selectAllPhotos"
                size="small"
                class="me-2"
              >
                Select All
              </v-btn>
              <v-btn
                variant="text"
                @click="clearPhotoSelection"
                size="small"
                :disabled="selectedPhotoIds.size === 0"
                class="me-2"
              >
                Clear
              </v-btn>
              <v-btn
                variant="outlined"
                color="error"
                prepend-icon="mdi-delete"
                @click="openRemoveDialog"
                :disabled="selectedPhotoIds.size === 0"
                class="me-2"
              >
                Remove from Album
              </v-btn>
              <v-btn
                variant="outlined"
                @click="toggleEditMode"
              >
                Cancel
              </v-btn>
            </template>
            
            <!-- Normal mode actions -->
            <template v-else>
              <v-btn
                v-if="album && album.can_contribute"
                variant="outlined"
                prepend-icon="mdi-pencil-box-multiple"
                @click="toggleEditMode"
                class="me-2"
              >
                Edit Photos
              </v-btn>
              <v-btn
                variant="outlined"
                prepend-icon="mdi-share"
                @click="showShareDialog = true"
                class="me-2"
              >
                Share
              </v-btn>
              <v-btn
                variant="outlined"
                prepend-icon="mdi-pencil"
                @click="showEditDialog = true"
              >
                Edit Album
              </v-btn>
            </template>
          </v-card-title>
          
          <v-card-text>
            <div v-if="album && album.description" class="mb-2">
              {{ album && album.description }}
            </div>
            <div class="text-caption text-grey">
              {{ (album && album.photo_count) || albumAssets.length }} photos
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Use JustifiedGallery for album assets with selection overlay -->
    <div v-if="albumAssets.length" class="gallery-container" :class="{ 'edit-mode': editMode }">
      <JustifiedGallery
        :images="albumAssets.map(a => ({
          src: a.thumbnail_urls?.md || a.thumbnail_urls?.sm || a.thumbnail_url || a.original_url || a.storage_url,
          width: a.width || 1920,
          height: a.height || 1080,
          alt: a.description || 'Photo',
          id: a.id,
          ...a,
          faces: []
        }))"
        :targetRowHeight="220"
        :gap="4"
        lastRow="left"
        @item-click="openAsset"
      />
      
      <!-- Selection overlays in edit mode -->
      <div v-if="editMode" class="selection-overlays">
        <div
          v-for="asset in albumAssets"
          :key="asset.id"
          class="selection-overlay"
          :class="{ 'selected': isPhotoSelected(asset.id) }"
          @click="togglePhotoSelection(asset.id)"
        >
          <v-checkbox
            :model-value="isPhotoSelected(asset.id)"
            color="primary"
            hide-details
            @click.stop="togglePhotoSelection(asset.id)"
          ></v-checkbox>
        </div>
      </div>
    </div>

    <!-- Loading indicator and infinite scroll sentinel -->
    <div v-if="albumAssets.length > 0">
      <!-- Invisible sentinel for scroll detection -->
      <div ref="sentinelRef" style="height: 1px; width: 100%;"></div>
      
      <!-- Visual feedback -->
      <div class="d-flex justify-center my-8">
        <v-progress-circular
          v-if="loadingMore"
          indeterminate
          color="primary"
          size="48"
        ></v-progress-circular>
        <div v-else-if="!hasMore" class="text-caption text-grey">
          All photos loaded
        </div>
      </div>
    </div>

    <!-- Edit Album Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card>
        <v-card-title>Edit Album</v-card-title>
        <v-card-text>
          <v-form ref="editForm" v-model="editFormValid">
            <v-text-field
              v-model="editAlbum.name"
              label="Album Name"
              required
              :rules="[v => !!v || 'Album name is required']"
            ></v-text-field>
            
            <v-textarea
              v-model="editAlbum.description"
              label="Description"
              rows="3"
            ></v-textarea>
            
            <v-file-input
              v-model="editAlbum.cover"
              label="Cover Image"
              accept="image/*"
              prepend-icon="mdi-image"
            ></v-file-input>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            @click="saveAlbum"
            :disabled="!editFormValid"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Share Dialog -->
    <v-dialog v-model="showShareDialog" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2">mdi-share-variant</v-icon>
          Share Album
        </v-card-title>
        <v-card-text>
          <div class="mb-4">
            <div class="text-h6 mb-2">{{ album?.title || album?.name }}</div>
            <div class="text-body-2 text-grey">{{ album?.description }}</div>
          </div>

          <!-- Share with new user -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">Share with User</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="7">
                  <v-select
                    v-model="selectedUserId"
                    :items="getAvailableUsers"
                    item-title="username"
                    item-value="id"
                    label="Select User"
                    variant="outlined"
                    density="compact"
                    :loading="loadingUsers"
                    prepend-inner-icon="mdi-account"
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props">
                        <template v-slot:prepend>
                          <v-avatar size="32" color="primary">
                            <span class="text-white text-caption">
                              {{ item.raw.username.charAt(0).toUpperCase() }}
                            </span>
                          </v-avatar>
                        </template>
                        <v-list-item-title>{{ item.raw.username }}</v-list-item-title>
                        <v-list-item-subtitle>{{ item.raw.email }}</v-list-item-subtitle>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" md="5">
                  <v-select
                    v-model="selectedPermission"
                    :items="[
                      { title: 'View Only', value: 'view' },
                      { title: 'Can Contribute', value: 'contribute' }
                    ]"
                    label="Permission"
                    variant="outlined"
                    density="compact"
                  ></v-select>
                </v-col>
              </v-row>
              
              <v-btn
                color="primary"
                block
                @click="shareWithUser"
                :disabled="!selectedUserId"
                :loading="sharingAlbum"
                prepend-icon="mdi-share"
              >
                Share Album
              </v-btn>
            </v-card-text>
          </v-card>

          <!-- Currently shared users -->
          <div v-if="album?.shared_with && album.shared_with.length > 0">
            <div class="text-subtitle-1 mb-3 font-weight-bold">Shared With</div>
            
            <v-list lines="two">
              <v-list-item
                v-for="sharedUser in album.shared_with"
                :key="sharedUser.user_id"
              >
                <template v-slot:prepend>
                  <v-avatar color="primary" size="40">
                    <span class="text-white">
                      {{ sharedUser.username.charAt(0).toUpperCase() }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ sharedUser.username }}</v-list-item-title>
                <v-list-item-subtitle>
                  <div>{{ sharedUser.email }}</div>
                  <div class="text-caption mt-1">
                    <v-chip size="x-small" :color="sharedUser.permission_level === 'contribute' ? 'success' : 'default'" class="me-2">
                      {{ sharedUser.permission_level === 'contribute' ? 'Can Contribute' : 'View Only' }}
                    </v-chip>
                    Shared {{ formatDate(sharedUser.shared_at) }}
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    color="error"
                    @click="revokeAccess(sharedUser.user_id)"
                  ></v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
          
          <v-alert v-else type="info" variant="outlined" class="mt-2">
            This album is not shared with anyone yet. Use the form above to share it with other users.
          </v-alert>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showShareDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Photos Confirmation Dialog -->
    <v-dialog v-model="showRemoveDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon color="warning" class="me-2">mdi-alert</v-icon>
          Remove Photos from Album?
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="outlined" class="mb-4">
            Are you sure you want to remove {{ selectedPhotoIds.size }} photo{{ selectedPhotoIds.size > 1 ? 's' : '' }} from this album?
          </v-alert>
          
          <div class="text-body-2">
            The photos will only be removed from this album. They will still be available in your main library.
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showRemoveDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            @click="removePhotos"
            :loading="removingPhotos"
          >
            Remove from Album
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Image Viewer V2 -->
    <ImageViewerV2
      v-model="showAssetDialog"
      :asset="selectedAsset"
      :assets="albumAssets"
      :show-delete="isAdmin"
      :show-add-to-album="isAdmin"
      @asset-changed="(newAsset) => selectedAsset = newAsset"
      @asset-deleted="handleAssetDeleted"
    />
  </div>
</template>

<style scoped>
.relative {
  position: relative;
}

/* Gallery with selection overlays */
.gallery-container {
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
</style>
