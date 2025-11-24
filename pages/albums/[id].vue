<script setup lang="ts">
console.log("TEST")
import JustifiedGallery from '~/components/JustifiedGallery.vue'
const route = useRoute()
const router = useRouter()
const albumId = computed(() => route.params.id as string)
const api = useApi()

const album = ref<any>(null)
const albumAssets = ref<any[]>([])
const loading = ref(false)

const showEditDialog = ref(false)
const showShareDialog = ref(false)
const showAssetDialog = ref(false)
const selectedAsset = ref(null)
const editFormValid = ref(false)
const editForm = ref(null)
const shareLink = ref('')
const sharePassword = ref('')
const shareExpiry = ref('')

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
  selectedAsset.value = asset
  showAssetDialog.value = true
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

const generateShareLink = () => {
  // Generate a new share token
  const token = Math.random().toString(36).substring(2, 15)
  shareLink.value = `https://photobox.local/share/${token}`
}

const copyLink = () => {
  navigator.clipboard.writeText(shareLink.value)
  // Could show a snackbar here
}
const loadAlbum = async () => {
  console.log('[AlbumDetail] loadAlbum', albumId.value)
  loading.value = true
  try {
    const [albumRes, assetsRes] = await Promise.all([
      api.albums.get(albumId.value),
      api.assets.list({ limit: 100, album_id: albumId.value as string })
    ])
    if (albumRes.success) {
      album.value = albumRes.data as any
      editAlbum.value.title = (album.value.title || album.value.name)
      editAlbum.value.description = album.value.description || ''
    }
    if (assetsRes.success) {
      const list = (assetsRes.data?.results || assetsRes.data || []) as any[]
      albumAssets.value = list
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadAlbum)

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
            <v-btn
              variant="outlined"
              prepend-icon="mdi-share"
              @click="showShareDialog = true"
            >
              Share
            </v-btn>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-pencil"
              @click="showEditDialog = true"
              class="ms-2"
            >
              Edit
            </v-btn>
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

    <!-- Use JustifiedGallery for album assets -->
    <JustifiedGallery
      v-if="albumAssets.length"
      :images="albumAssets.map(a => ({
        src: a.thumbnail_url || a.original_url || a.storage_url,
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
    <v-dialog v-model="showShareDialog" max-width="600">
      <v-card>
        <v-card-title>Share Album</v-card-title>
        <v-card-text>
          <div class="mb-4">
            <div class="text-h6 mb-2">{{ album.name }}</div>
            <div class="text-body-2 text-grey">{{ album.description }}</div>
          </div>
          
          <v-text-field
            v-model="shareLink"
            label="Share Link"
            readonly
            append-inner-icon="mdi-content-copy"
            @click:append-inner="copyLink"
          ></v-text-field>
          
          <v-row class="mt-4">
            <v-col cols="12" md="6">
              <v-text-field
                v-model="sharePassword"
                label="Password (optional)"
                type="password"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="shareExpiry"
                label="Expires (optional)"
                type="date"
              ></v-text-field>
            </v-col>
          </v-row>
          
          <div class="text-caption text-grey mt-2">
            Anyone with this link can view the album. You can revoke access at any time.
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showShareDialog = false">Close</v-btn>
          <v-btn
            color="primary"
            @click="generateShareLink"
          >
            Generate New Link
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Asset detail dialog -->
    <v-dialog v-model="showAssetDialog" max-width="800">
      <v-card v-if="selectedAsset">
        <div class="relative">
          <v-img
            :src="selectedAsset.original_url"
            max-height="500"
            cover
          ></v-img>
          
          <!-- Face overlay on full image -->
          <div
            v-for="face in selectedAsset.faces"
            :key="face.id"
            class="face-overlay"
            :style="{
              left: `${face.x * 100}%`,
              top: `${face.y * 100}%`,
              width: `${face.w * 100}%`,
              height: `${face.h * 100}%`
            }"
          >
            <div class="face-border"></div>
          </div>
        </div>
        
        <v-card-text>
          <div class="d-flex align-center mb-2">
            <v-icon class="me-2">mdi-calendar</v-icon>
            {{ formatDate(selectedAsset.taken_at) }}
          </div>
          
          <div v-if="selectedAsset.caption" class="mb-2">
            <strong>Caption:</strong> {{ selectedAsset.caption }}
          </div>
          
          <div v-if="selectedAsset.keywords?.length" class="mb-2">
            <strong>Keywords:</strong>
            <v-chip
              v-for="keyword in selectedAsset.keywords"
              :key="keyword"
              size="small"
              class="ma-1"
            >
              {{ keyword }}
            </v-chip>
          </div>
          
          <div v-if="selectedAsset.faces?.length" class="mb-2">
            <strong>People:</strong>
            <div class="d-flex flex-wrap">
              <v-chip
                v-for="face in selectedAsset.faces"
                :key="face.id"
                size="small"
                class="ma-1"
                :color="face.person ? 'primary' : 'grey'"
              >
                {{ face.person?.display_name || 'Unknown' }}
              </v-chip>
            </div>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showAssetDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.relative {
  position: relative;
}

.face-overlay {
  position: absolute;
  pointer-events: none;
}

.face-border {
  width: 100%;
  height: 100%;
  border: 2px solid #4CAF50;
  border-radius: 2px;
  box-shadow: 0 0 4px rgba(76, 175, 80, 0.5);
}
</style>
