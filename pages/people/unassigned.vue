<template>
  <div class="pa-4">
    <div class="d-flex align-center mb-4">
      <v-icon class="me-2">mdi-account-alert</v-icon>
      <div class="text-h5">Photos with Unassigned Faces</div>
      <v-spacer />
      <v-btn variant="text" @click="refresh" :loading="loading">Refresh</v-btn>
    </div>

    <div v-if="loading" class="text-medium-emphasis">Loading…</div>
    <div v-else-if="assets.length === 0" class="text-medium-emphasis">No photos with unassigned faces found.</div>

    <div v-else>
      <JustifiedGallery
        :images="jgImages"
        :targetRowHeight="230"
        :gap="6"
        lastRow="left"
        @item-click="onClick"
      />
    </div>

    <ImageViewerV2
      v-if="viewerAsset"
      v-model="viewerOpen"
      :asset="viewerAsset"
      :assets="assets"
      @asset-changed="a => viewerAsset = a"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import JustifiedGallery from '~/components/JustifiedGallery.vue'
import ImageViewerV2 from '~/components/ImageViewerV2.vue'

// @ts-ignore
definePageMeta({ middleware: ['setup','auth'] })

const loading = ref(false)
const assets = ref<any[]>([])
const cursor = ref<string | null>(null)

const viewerOpen = ref(false)
const viewerAsset = ref<any | null>(null)

const { client } = useApi()

const loadPage = async (cur?: string | null) => {
  loading.value = true
  try {
    const url = cur ? `/api/people/faces/unassigned-assets/?cursor=${encodeURIComponent(cur)}` : '/api/people/faces/unassigned-assets/'
    const res = await client.get<any>(url)
    if (res.success && res.data) {
      const list = res.data.results || []
      assets.value = [...assets.value, ...list]
      cursor.value = res.data.next || null
    }
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  assets.value = []
  cursor.value = null
  await loadPage(null)
}

onMounted(refresh)

const jgImages = computed(() => assets.value.map(a => ({
  src: a.thumbnail_urls?.md || a.thumbnail_urls?.sm || a.thumbnail_url || a.original_url || a.storage_url,
  width: a.width || 1920,
  height: a.height || 1080,
  alt: a.description || 'Photo',
  id: a.id,
  ...a
})))

const onClick = (img: any) => {
  const found = assets.value.find(a => String(a.id) === String(img.id))
  if (found) {
    viewerAsset.value = found
    viewerOpen.value = true
  }
}
</script>
