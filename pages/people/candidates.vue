<script setup lang="ts">
definePageMeta({
  middleware: ['setup', 'auth']
})

const api = useApi()

const people = ref<any[]>([])
const candidatesByPerson = ref<Record<string, any[]>>({})
const expandedPersons = ref<Set<string>>(new Set())
const selectedFacesByPerson = ref<Record<string, Set<string>>>({})
const pending = ref(false)
const error = ref<Error | null>(null)

const loadData = async () => {
  try {
    pending.value = true
    error.value = null
    
    // Load all people
    const res = await api.people.list({ limit: 1000 })
    if (!res.success) throw new Error(res.error || 'Failed to load people')
    
    const allPeople = res.data?.results || res.data || []
    // Filter to only people with candidate_count > 0
    people.value = allPeople.filter((p: any) => (p.candidate_count || 0) > 0)
    
    // Initialize empty candidate arrays for each person
    people.value.forEach(p => {
      candidatesByPerson.value[p.id] = []
      selectedFacesByPerson.value[p.id] = new Set()
    })
  } catch (e: any) {
    error.value = e
  } finally {
    pending.value = false
  }
}

onMounted(loadData)

const toggleExpanded = async (personId: string) => {
  if (expandedPersons.value.has(personId)) {
    expandedPersons.value.delete(personId)
  } else {
    expandedPersons.value.add(personId)
    // Load candidates if not already loaded
    if (candidatesByPerson.value[personId].length === 0) {
      await loadCandidates(personId)
    }
  }
  // Force reactivity
  expandedPersons.value = new Set(expandedPersons.value)
}

const loadCandidates = async (personId: string) => {
  try {
    const res = await api.faces.getCandidates(personId, { limit: 1000 })
    if (!res.success) throw new Error(res.error || 'Failed to load candidates')
    candidatesByPerson.value[personId] = res.data?.results || res.data || []
  } catch (e: any) {
    alert(`Failed to load candidates: ${e?.message}`)
  }
}

const isExpanded = (personId: string) => expandedPersons.value.has(personId)

const toggleSelection = (personId: string, faceId: string) => {
  if (!selectedFacesByPerson.value[personId]) {
    selectedFacesByPerson.value[personId] = new Set()
  }
  
  if (selectedFacesByPerson.value[personId].has(faceId)) {
    selectedFacesByPerson.value[personId].delete(faceId)
  } else {
    selectedFacesByPerson.value[personId].add(faceId)
  }
  // Force reactivity
  selectedFacesByPerson.value[personId] = new Set(selectedFacesByPerson.value[personId])
}

const isSelected = (personId: string, faceId: string) => {
  return selectedFacesByPerson.value[personId]?.has(faceId) || false
}

const confirmSelected = async (personId: string) => {
  const selected = selectedFacesByPerson.value[personId]
  if (!selected || selected.size === 0) return
  
  try {
    const res = await api.faces.bulkConfirm({ face_ids: Array.from(selected) })
    if (!res.success) throw new Error(res.error || 'Failed to confirm faces')
    
    // Remove confirmed faces from list
    candidatesByPerson.value[personId] = candidatesByPerson.value[personId].filter(
      c => !selected.has(c.id)
    )
    selectedFacesByPerson.value[personId].clear()
    
    // Refresh person data to update candidate count
    await refreshPerson(personId)
  } catch (e: any) {
    alert(e?.message || 'Failed to confirm faces')
  }
}

const rejectFace = async (personId: string, face: any) => {
  try {
    const res = await api.faces.unassign({ face_ids: [face.id] })
    if (!res.success) throw new Error(res.error || 'Failed to reject face')
    
    // Remove from list
    candidatesByPerson.value[personId] = candidatesByPerson.value[personId].filter(
      c => c.id !== face.id
    )
    selectedFacesByPerson.value[personId]?.delete(face.id)
    
    // Refresh person data to update candidate count
    await refreshPerson(personId)
  } catch (e: any) {
    alert(e?.message || 'Failed to reject face')
  }
}

const refreshPerson = async (personId: string) => {
  const pRes = await api.people.get(personId)
  if (pRes.success) {
    const idx = people.value.findIndex(p => p.id === personId)
    if (idx !== -1) {
      people.value[idx] = pRes.data
      // If no more candidates, remove from list
      if ((pRes.data.candidate_count || 0) === 0) {
        people.value = people.value.filter(p => p.id !== personId)
      }
    }
  }
}

const getSelectedCount = (personId: string) => {
  return selectedFacesByPerson.value[personId]?.size || 0
}

const totalCandidates = computed(() => {
  return people.value.reduce((sum, p) => sum + (p.candidate_count || 0), 0)
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
              @click="navigateTo('/people')"
              class="me-2"
            ></v-btn>
            <v-icon class="me-2">mdi-account-multiple-check</v-icon>
            Review All Candidates
            <v-spacer></v-spacer>
            <v-chip v-if="!pending" color="primary" variant="tonal">
              {{ totalCandidates }} total candidates
            </v-chip>
          </v-card-title>
          
          <v-card-text v-if="pending">
            <div class="d-flex align-center justify-center pa-8">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
          </v-card-text>
          
          <v-card-text v-else-if="error" class="text-error">
            {{ error?.message || 'Failed to load' }}
          </v-card-text>
          
          <v-card-text v-else-if="people.length === 0">
            <v-alert type="success" variant="tonal">
              No candidates to review! All faces are confirmed.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="!pending && !error && people.length > 0">
      <v-col cols="12">
        <v-expansion-panels>
          <v-expansion-panel
            v-for="person in people"
            :key="person.id"
            @click="toggleExpanded(person.id)"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-avatar size="40" class="me-3">
                  <v-img :src="person.headshot_url || '/placeholder-avatar.jpg'"></v-img>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">{{ person.display_name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ person.candidate_count || 0 }} candidate{{ person.candidate_count !== 1 ? 's' : '' }} to review
                  </div>
                </div>
                <v-spacer></v-spacer>
                <v-btn
                  variant="outlined"
                  size="small"
                  @click.stop="navigateTo(`/people/${person.id}/candidates`)"
                  class="me-2"
                >
                  View Page
                </v-btn>
              </div>
            </v-expansion-panel-title>
            
            <v-expansion-panel-text>
              <div v-if="isExpanded(person.id)">
                <div class="d-flex justify-end mb-3">
                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-check-all"
                    @click="confirmSelected(person.id)"
                    :disabled="getSelectedCount(person.id) === 0"
                    class="me-2"
                  >
                    Confirm Selected ({{ getSelectedCount(person.id) }})
                  </v-btn>
                </div>
                
                <v-row v-if="candidatesByPerson[person.id].length > 0">
                  <v-col
                    v-for="face in candidatesByPerson[person.id]"
                    :key="face.id"
                    cols="6"
                    sm="4"
                    md="3"
                    lg="2"
                  >
                    <v-card
                      :class="{ 'border-primary': isSelected(person.id, face.id) }"
                      :style="isSelected(person.id, face.id) ? 'border: 2px solid rgb(var(--v-theme-primary))' : ''"
                    >
                      <v-img
                        :src="face.thumbnail_url || '/placeholder-avatar.jpg'"
                        aspect-ratio="1"
                        cover
                        class="face-thumbnail"
                      >
                        <template #placeholder>
                          <div class="d-flex align-center justify-center fill-height">
                            <v-progress-circular indeterminate color="grey"></v-progress-circular>
                          </div>
                        </template>
                      </v-img>
                      
                      <v-card-title class="text-caption text-center py-2">
                        {{ person.display_name }}?
                      </v-card-title>
                      
                      <v-card-actions class="justify-center pa-2">
                        <v-btn
                          icon
                          size="small"
                          color="success"
                          variant="tonal"
                          @click="toggleSelection(person.id, face.id)"
                        >
                          <v-icon>{{ isSelected(person.id, face.id) ? 'mdi-check-circle' : 'mdi-check' }}</v-icon>
                        </v-btn>
                        <v-btn
                          icon
                          size="small"
                          color="error"
                          variant="tonal"
                          @click="rejectFace(person.id, face)"
                        >
                          <v-icon>mdi-close</v-icon>
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-col>
                </v-row>
                
                <div v-else class="text-center text-medium-emphasis pa-4">
                  Loading candidates...
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.face-thumbnail {
  cursor: pointer;
}
</style>

