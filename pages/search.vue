
<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2">mdi-magnify</v-icon>
            Search
          </v-card-title>
          
          <v-card-text>
            <v-row>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="searchQuery"
                  label="Search photos..."
                  placeholder="e.g., Christmas, army, wedding dress, beach"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  @keyup.enter="performSearch"
                  @update:model-value="debouncedSearch"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-btn
                  color="primary"
                  block
                  @click="performSearch"
                  :loading="searching"
                >
                  Search
                </v-btn>
              </v-col>
            </v-row>

            
            
            <div class="d-flex align-center mt-2" style="gap: 12px;">
              <v-spacer></v-spacer>
              <v-switch
                v-model="hideDuplicates"
                density="comfortable"
                inset
                hide-details
                color="primary"
                :label="`Hide near-duplicates`"
              />
              <span v-if="displayResults.length > 0" class="text-caption text-grey">
                {{ displayResults.length }} results
              </span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- People quick filters row -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2">People</div>
              <div class="d-flex align-center" style="gap: 12px;">
                <v-segmented
                  v-model="peopleMode"
                  density="comfortable"
                  :items="[{ title: 'All', value: 'all' }, { title: 'Any', value: 'any' }]"
                />
                <v-btn size="small" variant="text" @click="peopleModalOpen = true">Show more</v-btn>
              </div>
            </div>
            <div class="d-flex" style="gap: 16px; overflow-x: auto; padding-bottom: 4px;">
              <div
                v-for="p in topPeople"
                :key="p.id"
                class="d-flex flex-column align-center"
                style="min-width: 80px; cursor: pointer;"
                @click="togglePerson(p.id)"
              >
                <v-avatar :color="!p.avatar ? 'grey-lighten-2' : undefined" :size="64" :class="{ 'elevation-4': isSelected(p.id), 'border border-primary': isSelected(p.id) }">
                  <v-img v-if="p.avatar" :src="p.avatar" />
                  <v-icon v-else size="36">mdi-account</v-icon>
                  <div v-if="isSelected(p.id)" class="position-absolute" style="right:-4px; bottom:-4px;">
                    <v-avatar color="primary" size="20"><v-icon size="14">mdi-check</v-icon></v-avatar>
                  </div>
                </v-avatar>
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <div v-bind="props" class="text-caption mt-1 text-truncate" style="max-width: 120px;">{{ p.text }}</div>
                  </template>
                  <span>{{ p.text }}</span>
                </v-tooltip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- People selector modal -->
    <v-dialog v-model="peopleModalOpen" max-width="820">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="me-2">mdi-account-multiple</v-icon>
          Select people
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="peopleModalOpen = false" />
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="peopleSearch"
            density="comfortable"
            placeholder="Search people..."
            prepend-inner-icon="mdi-magnify"
            clearable
            class="mb-4"
          />
          <v-row>
            <v-col
              v-for="p in filteredPeople"
              :key="p.id"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-card
                class="pa-3 d-flex align-center"
                :elevation="isSelected(p.id) ? 6 : 1"
                :class="{ 'border border-primary': isSelected(p.id) }"
                @click="togglePerson(p.id)"
              >
                <v-avatar :color="!p.avatar ? 'grey-lighten-2' : undefined" size="56" class="me-3">
                  <v-img v-if="p.avatar" :src="p.avatar" />
                  <v-icon v-else>mdi-account</v-icon>
                </v-avatar>
                <div class="text-body-2 text-truncate" style="max-width: 220px;">{{ p.text }}</div>
                <v-spacer></v-spacer>
                <v-checkbox-btn :model-value="isSelected(p.id)" />
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="selectedPeople = []; peopleModalOpen = false">Clear</v-btn>
          <v-btn color="primary" @click="peopleModalOpen = false; performSearch()">Apply</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Albums & Year visible filters -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="8">
                <v-autocomplete
                  v-model="selectedAlbums"
                  :items="albumOptions"
                  item-title="text"
                  item-value="id"
                  label="Albums"
                  chips
                  closable-chips
                  hide-selected
                  multiple
                  clearable
                  :loading="loadingAlbums"
                >
                  <template #selection="{ item, index }">
                    <v-chip :key="index" size="small" class="me-1" closable>
                      <v-avatar start size="20">
                        <v-img :src="item.raw.cover || undefined"></v-img>
                      </v-avatar>
                      {{ item.raw.text }}
                    </v-chip>
                  </template>
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props">
                      <template #prepend>
                        <v-avatar size="28">
                          <v-img :src="item.raw.cover || undefined"></v-img>
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ item.raw.text }}</v-list-item-title>
                    </v-list-item>
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="filters.year"
                  :items="yearOptions"
                  label="Year"
                  clearable
                ></v-select>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Search results: flat justified gallery (preserve CLIP order) -->
    <div v-if="displayResults.length > 0">
      <JustifiedGallery
        :images="jgImages"
        :targetRowHeight="230"
        :gap="6"
        lastRow="left"
        @item-click="onGalleryItemClick"
      />
    </div>

    <!-- No results -->
    <v-row v-else-if="hasSearched && !searching">
      <v-col cols="12">
        <v-card>
          <v-card-text class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-magnify-close</v-icon>
            <div class="text-h6 text-grey">No results found</div>
            <div class="text-body-2 text-grey-lighten-1 mt-2">
              Try different keywords or adjust your filters
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Shared fullscreen image viewer -->
    <ImageViewerV2
      v-if="selectedAsset"
      v-model="viewerOpen"
      :asset="selectedAsset"
      :assets="displayResults"
      @asset-changed="onViewerAssetChanged"
    />
  </div>
</template>

<script setup lang="ts">
// Require authentication and setup
definePageMeta({
  middleware: ['setup', 'auth']
})

// Removed old import - useApi is auto-imported
import { onMounted, watch } from 'vue'
import ImageViewerV2 from '~/components/ImageViewerV2.vue'
import JustifiedGallery from '~/components/JustifiedGallery.vue'
const { $events } = useNuxtApp()

const searchQuery = ref('')
const searchResults = ref([])
const hideDuplicates = ref(true)
const searching = ref(false)
const hasSearched = ref(false)
const peopleModalOpen = ref(false)
const viewerOpen = ref(false)
const selectedAsset = ref(null)

const filters = ref({
  year: null,
  visibility: null
})

const yearOptions = ref(['2025', '2024', '2023', '2022', '2021', '2020'])
const visibilityOptions = ref(['shared', 'private'])

// People and albums filtering
const selectedPeople = ref<string[]>([])
const selectedAlbums = ref<string[]>([])
const peopleMode = ref<'all' | 'any'>('all')

type PersonItem = { id: string; text: string; avatar?: string; faceCount?: number }
type AlbumItem = { id: string; text: string; cover?: string }
const peopleOptions = ref<PersonItem[]>([])
const albumOptions = ref<AlbumItem[]>([])
const loadingPeople = ref(false)
const loadingAlbums = ref(false)
const peopleSearch = ref('')
const topPeople = computed(() => {
  const sorted = [...peopleOptions.value].sort((a, b) => (b.faceCount || 0) - (a.faceCount || 0))
  return sorted.slice(0, 12)
})
const filteredPeople = computed(() => {
  const q = peopleSearch.value.trim().toLowerCase()
  if (!q) return peopleOptions.value
  return peopleOptions.value.filter(p => p.text.toLowerCase().includes(q))
})
const isSelected = (id: string) => selectedPeople.value.includes(id)
const togglePerson = (id: string) => {
  const idx = selectedPeople.value.indexOf(id)
  if (idx === -1) selectedPeople.value = [...selectedPeople.value, id]
  else selectedPeople.value = selectedPeople.value.filter(x => x !== id)
}

// Debounced search function
let searchTimeout = null
const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (searchQuery.value.trim()) {
      performSearch()
    }
  }, 500)
}

const performSearch = async () => {
  // Decide mode: CLIP search if query provided; otherwise filter-only search
  const hasFilters = selectedPeople.value.length > 0 || selectedAlbums.value.length > 0 || !!filters.value.year || !!filters.value.visibility
  if (!searchQuery.value.trim() && !hasFilters) return

  searching.value = true
  hasSearched.value = true

  try {
    const { assets: assetsApi, utils } = useApi()

    const peopleCsv = selectedPeople.value.join(',') || undefined
    const albumsCsv = selectedAlbums.value.join(',') || undefined

    if (searchQuery.value.trim()) {
      // CLIP search with optional filters
      const params: Record<string, any> = { q: searchQuery.value.trim(), limit: 60 }
      if (peopleCsv) params.people = peopleCsv
      if (albumsCsv) params.albums = albumsCsv
      if (selectedPeople.value.length > 0) params.people_mode = peopleMode.value
      if (filters.value.visibility) params.visibility = filters.value.visibility
      if (filters.value.year) {
        // rough year filter via start/end
        const year = Number(filters.value.year)
        params.start_date = `${year}-01-01`
        params.end_date = `${year}-12-31`
      }

      const clip = await utils.createEndpoint<{ results: { asset_id: string; similarity: number; distance: number }[] }>('get', '/api/metadata/search/clip/')(
        undefined,
        params
      )
      if (!clip.success || !clip.data) {
        searchResults.value = []
        return
      }
      const results = Array.isArray(clip.data.results) ? clip.data.results : []
      if (!results.length) {
        searchResults.value = []
        return
      }
      const calls = results.map(r => () => assetsApi.get(r.asset_id))
      const responses = await utils.batch(calls)
      const seen = new Set<string>()
      const merged = [] as any[]
      responses.forEach((resp, idx) => {
        if (resp.success && resp.data) {
          const asset = resp.data
          const id = String(asset.id)
          if (!seen.has(id)) {
            seen.add(id)
            merged.push({ ...asset, similarity: results[idx].similarity })
          }
        }
      })
      searchResults.value = merged
    } else {
      // Filter-only search using assets listing
      const params: Record<string, any> = { limit: 80 }
      if (peopleCsv) params.people = peopleCsv
      if (albumsCsv) params.albums = albumsCsv
      if (selectedPeople.value.length > 0) params.people_mode = peopleMode.value
      if (filters.value.visibility) params.visibility = filters.value.visibility
      if (filters.value.year) {
        const year = Number(filters.value.year)
        params.start_date = `${year}-01-01`
        params.end_date = `${year}-12-31`
      }
      const resp = await assetsApi.list(params)
      if (resp.success && resp.data) {
        searchResults.value = resp.data.results || []
      } else {
        searchResults.value = []
      }
    }
  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

// Near-duplicate collapsing using phash with small Hamming distance
const hammingDistance = (a, b) => {
  if (!a || !b || a.length !== b.length) return Number.MAX_SAFE_INTEGER
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++
  }
  return dist
}

const displayResults = computed(() => {
  if (!hideDuplicates.value) return searchResults.value
  const seen = []
  const out = []
  for (const item of searchResults.value) {
    const p = item.phash || ''
    let isDup = false
    for (const s of seen) {
      if (p && s && hammingDistance(p, s) <= 2) { // allow tiny variations
        isDup = true
        break
      }
    }
    if (!isDup) {
      out.push(item)
      if (p) seen.push(p)
    }
  }
  return out
})

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date'
  return new Date(dateString).toLocaleDateString()
}

const openAsset = (asset) => {
  selectedAsset.value = asset
  viewerOpen.value = true
}

const onViewerAssetChanged = (asset) => {
  selectedAsset.value = asset
}

// Load people and albums for selectors
const loadPeople = async () => {
  loadingPeople.value = true
  try {
    const { people } = useApi()
    const resp = await people.list({ limit: 500 })
    if (resp.success && resp.data) {
      const raw: any = resp.data
      const list = Array.isArray(raw) ? raw : (raw.results || [])
      peopleOptions.value = list.map((p: any) => ({ id: p.id, text: p.display_name, avatar: p.headshot_url, faceCount: p.face_count }))
    }
  } catch (e) {
    // ignore
  } finally {
    loadingPeople.value = false
  }
}

// People selector modal
const peopleModalOpenRef = peopleModalOpen
watch(peopleModalOpenRef, (open) => {
  if (!open) peopleSearch.value = ''
})

const loadAlbums = async () => {
  loadingAlbums.value = true
  try {
    const { albums, assets: assetsApi, utils } = useApi()
    const resp = await albums.list({ limit: 100 })
    if (resp.success && resp.data) {
      const base = (resp.data.results || []) as any[]
      const calls = base.map(a => a.cover_asset ? () => assetsApi.get(a.cover_asset) : null).filter(Boolean) as any[]
      const results = calls.length ? await utils.batch(calls) : []
      let idx = 0
      albumOptions.value = base.map(a => {
        let cover: string | undefined
        if (a.cover_asset && results[idx]) {
          const r = results[idx++]
          if (r.success && r.data) cover = r.data.thumbnail_url || r.data.storage_url
        }
        return { id: a.id, text: a.title, cover }
      })
    }
  } catch (e) {
    // ignore
  } finally {
    loadingAlbums.value = false
  }
}

onMounted(() => {
  loadPeople()
  loadAlbums()
  if ($events?.onAssetReady) {
    $events.onAssetReady(async (payload: any) => {
      try {
        // Simple strategy: re-run the search if we have an active query or filters
        if (hasSearched.value) {
          await performSearch()
        }
      } catch {}
    })
  }
})

// Auto-search on filter changes when there is a query; for filter-only, require explicit Search click unless already searched once
watch([selectedPeople, selectedAlbums, peopleMode, () => filters.value.visibility, () => filters.value.year], () => {
  if (searchQuery.value.trim()) debouncedSearch()
})

// Justified Gallery mapping, preserves incoming order
const jgImages = computed(() => {
  return displayResults.value.map(asset => ({
    src: asset.thumbnail_urls?.md || asset.thumbnail_urls?.sm || asset.thumbnail_url || asset.original_url || asset.storage_url,
    width: asset.width || 1920,
    height: asset.height || 1080,
    alt: asset.description || 'Photo',
    id: asset.id,
    ...asset
  }))
})

const onGalleryItemClick = (img) => {
  const found = displayResults.value.find(a => String(a.id) === String(img.id))
  if (found) openAsset(found)
}
</script>
