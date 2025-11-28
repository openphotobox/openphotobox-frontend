<script setup lang="ts">
import ImageViewerV2 from '@/components/ImageViewerV2.vue'
import JustifiedGallery from '@/components/JustifiedGallery.vue'
definePageMeta({
  middleware: ['setup', 'auth'],
  key: route => `person-${route.params.id}`
})
const route = useRoute()
const api = useApi()

const person = ref<any | null>(null)
const personAssets = ref<any[]>([])
const pending = ref(false)
const error = ref<Error | null>(null)

const showEditDialog = ref(false)
const showMergeDialog = ref(false)
const imageViewerOpen = ref(false)
const selectedAsset = ref(null)
const editFormValid = ref(false)
const editForm = ref(null)

const editPerson = ref({
  display_name: '',
  aka: '',
  notes: ''
})

const mergeSearch = ref('')
const mergeCandidates = ref<any[]>([])
const mergeSelected = ref<string[]>([])
const mergePending = ref(false)
const mergeError = ref<string | null>(null)

const loadPerson = async () => {
  try {
    pending.value = true
    error.value = null
    const currentId = route.params.id as string
    const [pRes, aRes] = await Promise.all([
      api.people.get(currentId),
      api.assets.list({ limit: 1000, person_id: currentId, ordering: '-taken_at' })
    ])
    if (!pRes.success) throw new Error(pRes.error || 'Failed to load person')
    person.value = pRes.data
    editPerson.value = {
      display_name: person.value.display_name || '',
      aka: Array.isArray(person.value.aka) ? person.value.aka.join(', ') : '',
      notes: person.value.notes || ''
    }
    if (!aRes.success) throw new Error(aRes.error || 'Failed to load photos')
    const results = aRes.data?.results || aRes.data || []
    console.log('[PersonDetail] Loaded', results.length, 'assets for person', currentId)
    // Filter to only show assets with confirmed faces for this person
    personAssets.value = results
      .map((a: any) => ({
        ...a,
        // Filter faces to only show confirmed ones for THIS person
        faces: (a.faces || []).filter((f: any) => 
          f.person === currentId && f.confirmed === true
        )
      }))
      .filter((a: any) => a.faces.length > 0) // Only include assets that have confirmed faces
    console.log('[PersonDetail] After filtering:', personAssets.value.length, 'assets with confirmed faces')
  } catch (e: any) {
    error.value = e
    console.error('[PersonDetail] Error loading person:', e)
  } finally {
    pending.value = false
  }
}

onMounted(loadPerson)
watch(() => route.params.id, () => {
  loadPerson()
})

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date'
  return new Date(dateString).toLocaleDateString()
}

const openAsset = (asset) => {
  selectedAsset.value = asset
  imageViewerOpen.value = true
}

const personAssetsSorted = computed(() => {
  return [...personAssets.value].sort((a, b) => {
    const at = a.taken_at ? new Date(a.taken_at).getTime() : 0
    const bt = b.taken_at ? new Date(b.taken_at).getTime() : 0
    return at - bt
  })
})

const galleryImages = computed(() => {
  return personAssetsSorted.value.map(a => ({
    src: a.thumbnail_urls?.md || a.thumbnail_urls?.sm || a.thumbnail_url || a.storage_url,
    width: a.width || 1,
    height: a.height || 1,
    alt: a.caption || a.description || '',
    asset: a,
    // Provide normalized face boxes for this person for gallery overlay
    faces: facesForAsset(a).map((f:any) => ({ x: f.x, y: f.y, w: f.w, h: f.h }))
  }))
})

const onGalleryItemClick = (img) => {
  if (img?.asset) openAsset(img.asset)
}

const facesForAsset = (asset: any) => {
  const pid = person.value?.id
  if (!asset || !Array.isArray(asset.faces) || !pid) return []
  return asset.faces.filter((f: any) => f.person === pid)
}

const savePerson = async () => {
  if (!editFormValid.value || !person.value) return
  try {
    const payload: any = {
      display_name: editPerson.value.display_name,
      notes: editPerson.value.notes || undefined,
      aka: editPerson.value.aka ? editPerson.value.aka.split(',').map(s => s.trim()).filter(Boolean) : []
    }
    const res = await api.people.update(person.value.id, payload)
    if (!res.success) throw new Error(res.error || 'Failed to save changes')
    person.value = res.data
    showEditDialog.value = false
  } catch (e: any) {
    error.value = e
  }
}

const searchPeople = async () => {
  mergeError.value = null
  try {
    const res = await api.people.list({ search: mergeSearch.value, limit: 20 })
    if (!res.success) throw new Error(res.error || 'Failed to search people')
    const results = res.data?.results || res.data || []
    const currentId = route.params.id as string
    mergeCandidates.value = results.filter((p: any) => p.id !== currentId)
  } catch (e: any) {
    mergeError.value = e?.message || 'Failed to search'
  }
}

watch(showMergeDialog, (open) => {
  if (open) {
    mergeSearch.value = ''
    mergeSelected.value = []
    mergeCandidates.value = []
    mergeError.value = null
  }
})

const performMerge = async () => {
  if (!person.value || mergeSelected.value.length === 0) return
  mergePending.value = true
  mergeError.value = null
  try {
    const targetId = person.value.id
    const sourceIds = mergeSelected.value
    const res = await api.utils.createEndpoint<{ message: string }>('post', `/api/people/${targetId}/merge/`)({
      source_person_ids: sourceIds,
      delete_source_persons: true
    })
    if (!res.success) throw new Error(res.error || 'Merge failed')
    showMergeDialog.value = false
    await loadPerson()
  } catch (e: any) {
    mergeError.value = e?.message || 'Merge failed'
  } finally {
    mergePending.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="pending" class="d-flex align-center justify-center pa-8">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>
    <div v-else-if="error" class="pa-4 text-error">
      {{ error?.message || 'Failed to load person' }}
    </div>
    <template v-else-if="person">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="navigateTo('/people')"
              class="me-2"
            ></v-btn>
            <v-avatar size="40" class="me-3">
              <v-img :src="person.headshot_url || '/placeholder-avatar.jpg'"></v-img>
            </v-avatar>
            {{ person.display_name }}
            <v-spacer></v-spacer>
            <v-btn
              v-if="person.candidate_count && person.candidate_count > 0"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-account-question"
              @click="navigateTo(`/people/candidates-${person.id}`)"
              class="me-2"
            >
              Review Candidates ({{ person.candidate_count }})
            </v-btn>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-pencil"
              @click="showEditDialog = true"
            >
              Edit
            </v-btn>
            <v-btn
              class="ms-2"
              color="primary"
              variant="elevated"
              prepend-icon="mdi-account-merge"
              @click="showMergeDialog = true"
            >
              Merge
            </v-btn>
          </v-card-title>
          
          <v-card-text>
            <div v-if="person.aka?.length" class="mb-2">
              <strong>Also known as:</strong> {{ person.aka.join(', ') }}
            </div>
            <div v-if="person.notes" class="mb-2">
              <strong>Notes:</strong> {{ person.notes }}
            </div>
            <div class="text-caption text-grey">
              {{ person.asset_count || person.photo_count || personAssets.length }} photos
            </div>
            <div v-if="person.candidate_count && person.candidate_count > 0" class="mt-2">
              <v-chip
                size="small"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-account-question"
              >
                {{ person.candidate_count }} candidate{{ person.candidate_count !== 1 ? 's' : '' }} pending review
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <JustifiedGallery :images="galleryImages" :targetRowHeight="240" @item-click="onGalleryItemClick" />

    <!-- Edit Person Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500">
      <v-card>
        <v-card-title>Edit Person</v-card-title>
        <v-card-text>
          <v-form ref="editForm" v-model="editFormValid">
            <v-text-field
              v-model="editPerson.display_name"
              label="Display Name"
              required
              :rules="[v => !!v || 'Name is required']"
            ></v-text-field>
            
            <v-text-field
              v-model="editPerson.aka"
              label="Also Known As (comma separated)"
              hint="Nicknames, maiden names, etc."
            ></v-text-field>
            
            <v-textarea
              v-model="editPerson.notes"
              label="Notes"
              rows="3"
            ></v-textarea>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            @click="savePerson"
            :disabled="!editFormValid"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Merge Person Dialog -->
    <v-dialog v-model="showMergeDialog" max-width="600">
      <v-card>
        <v-card-title>Merge People into {{ person?.display_name || 'Unnamed person' }}</v-card-title>
        <v-card-text>
          <div class="mb-2 text-body-2">
            Select one or more people to merge into this person. All their faces will be reassigned.
          </div>
          <v-alert type="info" variant="tonal" class="mb-3" density="compact">
            The target keeps its name unless blank; aliases (AKA) from sources are merged.
          </v-alert>
          <v-text-field
            v-model="mergeSearch"
            label="Search people"
            prepend-inner-icon="mdi-magnify"
            @keyup.enter="searchPeople"
          ></v-text-field>
          <v-btn size="small" class="mb-2" @click="searchPeople" prepend-icon="mdi-magnify">Search</v-btn>
          <div v-if="mergeError" class="text-error mb-2">{{ mergeError }}</div>
          <v-list density="compact" class="merge-list">
            <v-list-item
              v-for="p in mergeCandidates"
              :key="p.id"
            >
              <template #prepend>
                <v-checkbox v-model="mergeSelected" :value="p.id" hide-details density="compact"></v-checkbox>
              </template>
              <v-list-item-title>{{ p.display_name }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ p.asset_count || p.photo_count || 0 }} photos
              </v-list-item-subtitle>
            </v-list-item>
            <div v-if="mergeCandidates.length === 0" class="text-caption text-medium-emphasis pa-2">
              No results
            </div>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showMergeDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="mergePending" :disabled="mergeSelected.length === 0" @click="performMerge">
            Merge Selected
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ImageViewerV2 v-model="imageViewerOpen" :asset="selectedAsset" :assets="personAssetsSorted" @asset-changed="(a) => { selectedAsset = a }" />
    </template>
    <div v-else class="pa-4 text-medium-emphasis">No data</div>
  </div>
</template>

<style scoped>
.relative {
  position: relative;
}

.overlay-layer {
  position: absolute;
  inset: 0;
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
