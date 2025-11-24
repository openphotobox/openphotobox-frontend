<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2">mdi-folder-multiple-image</v-icon>
            Albums
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="showCreateDialog = true"
            >
              Create Album
            </v-btn>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col
        v-for="album in albums"
        :key="album.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
        xl="2"
      >
        <v-card
          class="mx-auto"
          max-width="300"
          :to="`/albums/${album.id}`"
          link
        >
          <v-img
            :src="album.cover_url || undefined"
            height="200"
            cover
            class="bg-grey-lighten-2"
          >
            <template v-slot:placeholder>
              <v-row
                class="fill-height ma-0"
                align="center"
                justify="center"
              >
                <v-icon size="64" color="grey-lighten-1">mdi-folder-image</v-icon>
              </v-row>
            </template>
            
            <div class="album-overlay">
              <div class="album-info">
                <div class="text-h6 text-white">{{ album.photo_count }} photos</div>
                <div class="text-caption text-white">{{ formatDate(album.created_at) }}</div>
              </div>
            </div>
          </v-img>

          <v-card-title class="text-h6 pt-4">
            {{ album.title || album.name }}
          </v-card-title>

          <v-card-text class="pb-2">
            <div v-if="album.description" class="text-body-2 text-grey-darken-1">
              {{ album.description }}
            </div>
            <div class="text-caption text-grey mt-2">
              Created {{ formatDate(album.created_at) }}
            </div>
          </v-card-text>

          <v-card-actions class="justify-center pb-4">
            <v-btn variant="outlined" size="small" :to="`/albums/${album.id}`">View Album</v-btn>
            <v-btn
              variant="text"
              size="small"
              icon="mdi-share"
              @click.stop="shareAlbum(album)"
            ></v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create Album Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="500">
      <v-card>
        <v-card-title>Create New Album</v-card-title>
        <v-card-text>
          <v-form ref="createForm" v-model="createFormValid" @submit.prevent="createAlbum">
            <v-text-field
              v-model="newAlbum.title"
              label="Album Name"
              required
              :rules="[v => !!v || 'Album name is required']"
            ></v-text-field>
            
            <v-textarea
              v-model="newAlbum.description"
              label="Description"
              rows="3"
            ></v-textarea>
            
            <v-file-input
              v-model="newAlbum.cover"
              label="Cover Image"
              accept="image/*"
              prepend-icon="mdi-image"
            ></v-file-input>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            @click="createAlbum"
            :disabled="!createFormValid"
          >
            Create Album
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Share Dialog -->
    <v-dialog v-model="showShareDialog" max-width="600">
      <v-card v-if="selectedAlbum">
        <v-card-title>Share Album</v-card-title>
        <v-card-text>
          <div class="mb-4">
            <div class="text-h6 mb-2">{{ selectedAlbum.name }}</div>
            <div class="text-body-2 text-grey">{{ selectedAlbum.description }}</div>
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
  </div>
</template>

<script setup lang="ts">
const api = useApi()
const albums = ref<any[]>([])
const loading = ref(false)

const showCreateDialog = ref(false)
const showShareDialog = ref(false)
const createFormValid = ref(false)
const createForm = ref(null)
const selectedAlbum = ref<any | null>(null)
const shareLink = ref('')
const sharePassword = ref('')
const shareExpiry = ref('')

const newAlbum = ref({
  title: '',
  description: '',
  cover: null as any
})

const formatDate = (dateString: string) => {
  if (!dateString) return 'Unknown date'
  return new Date(dateString).toLocaleDateString()
}

const createAlbum = async () => {
  if (!createFormValid.value) return
  try {
    const res = await api.albums.create({ title: newAlbum.value.title, description: newAlbum.value.description })
    if (res.success) {
      albums.value.unshift(res.data as any)
      showCreateDialog.value = false
      newAlbum.value = { title: '', description: '', cover: null as any }
    } else {
      alert(res.error || 'Failed to create album')
    }
  } catch (e: any) {
    alert(e?.message || 'Failed to create album')
  }
}

const shareAlbum = (album: any) => {
  selectedAlbum.value = album
  shareLink.value = `https://photobox.local/share/${album.id}`
  showShareDialog.value = true
}

const generateShareLink = () => {
  const token = Math.random().toString(36).substring(2, 15)
  shareLink.value = `https://photobox.local/share/${token}`
}

const copyLink = () => {
  navigator.clipboard.writeText(shareLink.value)
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.albums.list({ limit: 100 })
    albums.value = (res.success && (res.data?.results as any[])) || []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.album-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 16px;
}

.album-info {
  text-align: center;
}
</style>


