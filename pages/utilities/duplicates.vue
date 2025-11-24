<template>
  <div class="pa-4">
    <div class="d-flex align-center mb-4">
      <v-icon class="me-2">mdi-content-duplicate</v-icon>
      <div class="text-h5">Duplicate Finder</div>
      <v-spacer></v-spacer>
      <v-btn color="primary" :loading="running" @click="runScan">Scan</v-btn>
    </div>

    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-text-field v-model.number="scanLimit" type="number" label="Photos to scan" :min="50" :max="5000" />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field v-model.number="neighborsK" type="number" label="Neighbors per photo (k)" :min="3" :max="50" />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field v-model.number="maxDistance" type="number" step="0.01" label="Max CLIP distance" />
          </v-col>
          <v-col cols="12" sm="6" md="3" class="d-flex align-center">
            <v-switch v-model="usePhash" inset hide-details label="Use phash prefilter" class="me-4" />
            <v-text-field v-model.number="phashHamming" type="number" :disabled="!usePhash" label="phash Hamming ≤" :min="0" :max="8" style="max-width: 120px;" />
          </v-col>
        </v-row>
        <v-progress-linear v-if="running" :model-value="progressPct" color="primary" height="6" class="mt-2" />
      </v-card-text>
    </v-card>

    <v-alert type="info" variant="tonal" class="mb-4">
      This finds visually similar near-duplicates using CLIP neighbors and optional phash.
      Results are grouped; review before taking action. No changes are made automatically.
    </v-alert>

    <div v-if="!running && groups.length === 0" class="text-medium-emphasis">No groups found. Try increasing k or max distance.</div>

    <v-row v-for="(group, gi) in groups" :key="gi" class="mb-6">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            Group {{ gi + 1 }}
            <v-chip size="x-small" class="ms-2" variant="tonal">{{ group.items.length }} photos</v-chip>
            <v-chip size="x-small" class="ms-2" color="primary" variant="tonal">avg sim {{ Math.round(group.avgSim*100) }}%</v-chip>
            <v-spacer />
            <v-btn size="small" variant="text" @click="openAll(group)">Open</v-btn>
          </v-card-title>
          <v-card-text>
            <div class="d-flex flex-wrap" style="gap:8px;">
              <div v-for="item in group.items" :key="item.id" class="d-flex flex-column align-center" style="width: 160px;">
                <v-img :src="item.thumbnail_url || item.original_url || item.storage_url" :alt="item.description || 'photo'" width="160" height="120" cover class="mb-1" />
                <div class="text-caption text-medium-emphasis text-truncate" style="max-width: 160px;">{{ item.description || 'Photo' }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
// Removed old import - useApi is auto-imported

// Require auth
// @ts-ignore
definePageMeta({ middleware: ['setup','auth'] })

const running = ref(false)
const groups = ref<any[]>([])
const scanLimit = ref(600)
const neighborsK = ref(8)
const maxDistance = ref(0.18)
const usePhash = ref(true)
const phashHamming = ref(2)
const progressPct = ref(0)

function hamming(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return Number.MAX_SAFE_INTEGER
  let d = 0
  for (let i=0;i<a.length;i++) if (a[i] !== b[i]) d++
  return d
}

const runScan = async () => {
  running.value = true
  groups.value = []
  progressPct.value = 0
  try {
    const { assets, utils } = useApi()

    // Paginate assets
    const all: any[] = []
    let cursor: string | undefined = undefined
    while (all.length < scanLimit.value) {
      const page = await assets.list({ limit: 200, cursor })
      if (!page.success || !page.data) break
      const results = page.data.results || []
      all.push(...results)
      // Our generated API uses cursor pagination via 'next' in data or returns cursor string? Use next URL string if available
      const next = (page.data as any).next as string | null
      if (!next) break
      // Extract cursor param if present
      const match = next.match(/[?&]cursor=([^&]+)/)
      cursor = match ? decodeURIComponent(match[1]) : undefined
    }
    const assetsArr = all.slice(0, scanLimit.value)
    if (!assetsArr.length) { running.value = false; return }

    // Index by id
    const byId = new Map<string, any>(assetsArr.map(a => [String(a.id), a]))

    // Optional phash edges
    const edges = new Map<string, number>() // key "idA|idB" -> similarity
    if (usePhash.value) {
      const phashes = assetsArr.filter(a => a.phash)
      for (let i=0;i<phashes.length;i++) {
        const a = phashes[i]
        for (let j=i+1;j<phashes.length;j++) {
          const b = phashes[j]
          if (hamming(a.phash, b.phash) <= phashHamming.value) {
            const key = `${a.id}|${b.id}`
            edges.set(key, Math.max(edges.get(key) || 0, 0.95))
          }
        }
      }
    }

    // CLIP neighbor edges (batch with modest concurrency)
    const neighborEndpoint = useApi().utils.createEndpoint<any>('get', '/api/metadata/search/clip-neighbors/')
    const chunk = (arr: any[], size: number) => arr.reduce((acc, v, i) => (i % size ? acc[acc.length-1].push(v) : acc.push([v]), acc), [] as any[][])
    const chunks = chunk(assetsArr, 20)
    let processed = 0
    for (const ch of chunks) {
      const calls = ch.map(a => () => neighborEndpoint(undefined, { asset_id: a.id, k: neighborsK.value, max_distance: maxDistance.value }))
      const resps = await utils.batch(calls)
      resps.forEach((resp, idx) => {
        const src = ch[idx]
        if (resp.success && resp.data && Array.isArray(resp.data.results)) {
          for (const n of resp.data.results) {
            const nid = String(n.asset_id)
            if (!byId.has(nid)) continue
            // store undirected edge key sorted
            const idA = String(src.id), idB = nid
            const key = idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`
            const sim = typeof n.similarity === 'number' ? n.similarity : 1 - (n.distance || 0)
            if (sim >= 0) edges.set(key, Math.max(edges.get(key) || 0, sim))
          }
        }
      })
      processed += ch.length
      progressPct.value = Math.round((processed / assetsArr.length) * 100)
    }

    // Build groups from edges as connected components
    const adj = new Map<string, Set<string>>()
    for (const key of edges.keys()) {
      const [a, b] = key.split('|')
      ;(adj.get(a) || adj.set(a, new Set()).get(a)!).add(b)
      ;(adj.get(b) || adj.set(b, new Set()).get(b)!).add(a)
    }
    const seen = new Set<string>()
    const out: any[] = []
    for (const id of byId.keys()) {
      if (seen.has(id)) continue
      const comp: string[] = []
      const q = [id]
      while (q.length) {
        const cur = q.pop()!
        if (seen.has(cur)) continue
        seen.add(cur)
        comp.push(cur)
        const nbrs = adj.get(cur)
        if (nbrs) for (const n of nbrs) if (!seen.has(n)) q.push(n)
      }
      if (comp.length >= 2) {
        // Compute avg similarity across edges present in comp
        let sum = 0, cnt = 0
        for (let i=0;i<comp.length;i++) {
          for (let j=i+1;j<comp.length;j++) {
            const key = comp[i] < comp[j] ? `${comp[i]}|${comp[j]}` : `${comp[j]}|${comp[i]}`
            if (edges.has(key)) { sum += edges.get(key)!; cnt++ }
          }
        }
        const avgSim = cnt ? sum / cnt : 0
        out.push({ avgSim, items: comp.map(id => byId.get(id)) })
      }
    }
    // Sort groups by avg similarity and size
    out.sort((a, b) => (b.avgSim - a.avgSim) || (b.items.length - a.items.length))
    groups.value = out
  } catch (e) {
    // noop
  } finally {
    running.value = false
    progressPct.value = 100
  }
}

const openAll = (group: any) => {
  // Placeholder: could open first photo in viewer; left as future enhancement
}
</script>
