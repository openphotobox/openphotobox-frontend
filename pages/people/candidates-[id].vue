<script setup lang="ts">
import ImageViewerV2 from '@/components/ImageViewerV2.vue'

definePageMeta({
  middleware: ['setup', 'auth']
})

const route = useRoute()
const api = useApi()

const person = ref<any | null>(null)
const candidates = ref<any[]>([])
const pending = ref(false)
const error = ref<Error | null>(null)
const selectedFaceIds = ref<Set<string>>(new Set())
const showImageViewer = ref(false)
const selectedAsset = ref<any | null>(null)
const candidateAssets = ref<any[]>([])

const loadData = async () => {
  try {
    pending.value = true
    error.value = null
    const personId = route.params.id as string
    
    console.log('[Candidates Page] Loading candidates for person:', personId)
    
    // Load person and their candidate faces
    const [pRes, cRes] = await Promise.all([
      api.people.get(personId),
      api.faces.getCandidates(personId, { limit: 1000 })
    ])
    
    console.log('[Candidates Page] Person response:', pRes)
    console.log('[Candidates Page] Candidates response:', cRes)
    
    if (!pRes.success) throw new Error(pRes.error || 'Failed to load person')
    person.value = pRes.data
    
    if (!cRes.success) throw new Error(cRes.error || 'Failed to load candidates')
    const results = cRes.data?.results || cRes.data || []
    candidates.value = results
    
    console.log('[Candidates Page] Loaded candidates count:', candidates.value.length)
    
    // Fetch full asset data for each candidate face
    if (candidates.value.length > 0) {
      const assetIds = [...new Set(candidates.value.map(c => c.asset || c.asset_id))]
      const assetPromises = assetIds.map(id => api.assets.get(id))
      const assetResponses = await Promise.all(assetPromises)
      candidateAssets.value = assetResponses
        .filter(r => r.success)
        .map(r => r.data)
    }
  } catch (e: any) {
    console.error('[Candidates Page] Error loading:', e)
    error.value = e
  } finally {
    pending.value = false
  }
}

const openImageViewer = (face: any) => {
  const assetId = face.asset || face.asset_id
  const asset = candidateAssets.value.find(a => a.id === assetId)
  if (asset) {
    selectedAsset.value = asset
    showImageViewer.value = true
  }
}

onMounted(loadData)

// Watch for route changes to reload data
watch(() => route.fullPath, () => {
  if (route.path.includes('/candidates')) {
    loadData()
  }
})

const toggleSelection = (faceId: string) => {
  if (selectedFaceIds.value.has(faceId)) {
    selectedFaceIds.value.delete(faceId)
  } else {
    selectedFaceIds.value.add(faceId)
  }
  // Force reactivity
  selectedFaceIds.value = new Set(selectedFaceIds.value)
}

const isSelected = (faceId: string) => selectedFaceIds.value.has(faceId)

const confirmSelected = async () => {
  if (selectedFaceIds.value.size === 0) return
  
  try {
    const res = await api.faces.bulkConfirm({ face_ids: Array.from(selectedFaceIds.value) })
    if (!res.success) throw new Error(res.error || 'Failed to confirm faces')
    
    // Remove confirmed faces from list
    candidates.value = candidates.value.filter(c => !selectedFaceIds.value.has(c.id))
    selectedFaceIds.value.clear()
    
    // Refresh person to update candidate count
    const pRes = await api.people.get(route.params.id as string)
    if (pRes.success) person.value = pRes.data
  } catch (e: any) {
    alert(e?.message || 'Failed to confirm faces')
  }
}

const rejectFace = async (face: any) => {
  try {
    const res = await api.faces.unassign({ face_ids: [face.id] })
    if (!res.success) throw new Error(res.error || 'Failed to reject face')
    
    // Remove from list
    candidates.value = candidates.value.filter(c => c.id !== face.id)
    selectedFaceIds.value.delete(face.id)
    
    // Refresh person to update candidate count
    const pRes = await api.people.get(route.params.id as string)
    if (pRes.success) person.value = pRes.data
  } catch (e: any) {
    alert(e?.message || 'Failed to reject face')
  }
}

const rejectAll = async () => {
  if (!confirm(`Are you sure you want to reject all ${candidates.value.length} candidate faces?`)) return
  
  try {
    const faceIds = candidates.value.map(c => c.id)
    const res = await api.faces.unassign({ face_ids: faceIds })
    if (!res.success) throw new Error(res.error || 'Failed to reject all')
    
    candidates.value = []
    selectedFaceIds.value.clear()
    
    // Refresh person to update candidate count
    const pRes = await api.people.get(route.params.id as string)
    if (pRes.success) person.value = pRes.data
  } catch (e: any) {
    alert(e?.message || 'Failed to reject all faces')
  }
}

const confirmAll = async () => {
  if (candidates.value.length === 0) return
  
  try {
    const faceIds = candidates.value.map(c => c.id)
    const res = await api.faces.bulkConfirm({ face_ids: faceIds })
    if (!res.success) throw new Error(res.error || 'Failed to confirm all')
    
    candidates.value = []
    selectedFaceIds.value.clear()
    
    // Refresh person to update candidate count
    const pRes = await api.people.get(route.params.id as string)
    if (pRes.success) person.value = pRes.data
  } catch (e: any) {
    alert(e?.message || 'Failed to confirm all faces')
  }
}
</script>

<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card color="primary" variant="tonal">
          <v-card-title class="d-flex align-center">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="navigateTo(`/people/${route.params.id}`)"
              class="me-2"
            ></v-btn>
            <v-icon class="me-2">mdi-account-question</v-icon>
            <v-avatar v-if="person" size="40" class="me-3">
              <v-img :src="person.headshot_url || '/placeholder-avatar.jpg'"></v-img>
            </v-avatar>
            <span v-if="person">Review Candidates for {{ person.display_name }}</span>
            <span v-else>Review Candidates</span>
            <v-spacer></v-spacer>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-check-all"
              @click="confirmSelected"
              :disabled="selectedFaceIds.size === 0"
              class="me-2"
            >
              Confirm Selected ({{ selectedFaceIds.size }})
            </v-btn>
            <v-btn
              variant="outlined"
              color="success"
              prepend-icon="mdi-check-all"
              @click="confirmAll"
              :disabled="candidates.length === 0"
              class="me-2"
            >
              Confirm All
            </v-btn>
            <v-btn
              variant="outlined"
              color="error"
              prepend-icon="mdi-close-circle"
              @click="rejectAll"
              :disabled="candidates.length === 0"
            >
              Reject All
            </v-btn>
          </v-card-title>
          
          <v-card-text v-if="pending">
            <div class="d-flex align-center justify-center pa-8">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
          </v-card-text>
          
          <v-card-text v-else-if="error" class="text-error">
            {{ error?.message || 'Failed to load' }}
          </v-card-text>
          
          <v-card-text v-else-if="candidates.length === 0">
            <v-alert type="success" variant="tonal">
              No candidate faces to review. All faces for this person are confirmed!
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="!pending && !error && candidates.length > 0">
      <v-col
        v-for="face in candidates"
        :key="face.id"
        cols="6"
        sm="4"
        md="3"
        lg="2"
      >
        <v-card
          :class="{ 'border-primary': isSelected(face.id) }"
          :style="isSelected(face.id) ? 'border: 2px solid rgb(var(--v-theme-primary))' : ''"
        >
          <v-img
            :src="face.thumbnail_url || '/placeholder-avatar.jpg'"
            aspect-ratio="1"
            cover
            class="face-thumbnail"
            @click="openImageViewer(face)"
          >
            <template #placeholder>
              <div class="d-flex align-center justify-center fill-height">
                <v-progress-circular indeterminate color="grey"></v-progress-circular>
              </div>
            </template>
          </v-img>
          
          <v-card-title class="text-caption text-center py-2">
            {{ person?.display_name || 'Unknown' }}?
          </v-card-title>
          
          <v-card-actions class="justify-center pa-2">
            <v-btn
              icon
              size="small"
              color="success"
              variant="tonal"
              @click="toggleSelection(face.id)"
            >
              <v-icon>{{ isSelected(face.id) ? 'mdi-check-circle' : 'mdi-check' }}</v-icon>
            </v-btn>
            <v-btn
              icon
              size="small"
              color="error"
              variant="tonal"
              @click="rejectFace(face)"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Image Viewer -->
    <ImageViewerV2
      v-model="showImageViewer"
      :asset="selectedAsset"
      :assets="candidateAssets"
      @asset-changed="(a) => { selectedAsset = a }"
    />
  </div>
</template>

<style scoped>
.face-thumbnail {
  cursor: pointer;
}
</style>

