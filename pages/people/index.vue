<script setup lang="ts">
// Require authentication and setup
definePageMeta({
  middleware: ['setup', 'auth']
})

const api = useApi()

const people = ref([])
const pending = ref(false)
const error = ref<Error | null>(null)

const showAddPersonDialog = ref(false)
const formValid = ref(false)
const form = ref(null)

const newPerson = ref({
  display_name: '',
  aka: '',
  notes: ''
})

const fetchPeople = async () => {
  try {
    pending.value = true
    error.value = null
    const res = await api.people.list()
    if (res.success) {
      const results = res.data?.results || res.data || []
      people.value = results.map((p: any) => ({
        ...p,
        photo_count: p.asset_count || 0
      }))
    } else {
      throw new Error(res.error || 'Failed to load people')
    }
  } catch (e: any) {
    error.value = e
  } finally {
    pending.value = false
  }
}

onMounted(fetchPeople)

const openPerson = (person) => {
  navigateTo(`/people/${person.id}`)
}

const addPerson = async () => {
  if (!formValid.value) return
  try {
    const payload: any = {
      display_name: newPerson.value.display_name,
      notes: newPerson.value.notes || undefined
    }
    if (newPerson.value.aka) {
      payload.aka = newPerson.value.aka.split(',').map(s => s.trim()).filter(Boolean)
    }
    const res = await api.people.create(payload)
    if (!res.success) throw new Error(res.error || 'Failed to create person')
    // Prepend newly created person and refresh counts
    const created = res.data
    people.value = [{ ...created, photo_count: created?.asset_count || 0 }, ...people.value]
    // Reset form
    newPerson.value = { display_name: '', aka: '', notes: '' }
    showAddPersonDialog.value = false
  } catch (e: any) {
    error.value = e
  }
}
</script>

<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="me-2">mdi-account-group</v-icon>
            People
            <v-spacer></v-spacer>
            <v-btn
              variant="tonal"
              prepend-icon="mdi-account-alert"
              class="me-2"
              @click="navigateTo('/people/unassigned')"
            >
              Unassigned Faces
            </v-btn>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="showAddPersonDialog = true"
            >
              Add Person
            </v-btn>
          </v-card-title>
          <v-card-text v-if="pending">Loading people...</v-card-text>
          <v-card-text v-else-if="error" class="text-error">{{ error?.message || 'Failed to load' }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col
        v-for="person in people"
        :key="person.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
        xl="2"
      >
        <v-card
          class="mx-auto text-center"
          max-width="200"
          :to="'/people/' + person.id"
          link
        >
          <v-avatar
            size="120"
            class="mx-auto mt-4"
          >
            <v-img :src="person.headshot_url || '/placeholder-avatar.jpg'" cover>
              <template #placeholder>
                <v-progress-circular indeterminate color="grey"></v-progress-circular>
              </template>
              <template #error>
                <v-icon size="60" color="grey">mdi-account</v-icon>
              </template>
            </v-img>
          </v-avatar>

          <v-card-title class="text-h6 pt-4">
            {{ person.display_name }}
          </v-card-title>

          <v-card-text class="pb-2">
            <div class="text-caption text-grey">
              {{ person.photo_count }} photos
            </div>
            <div v-if="person.aka?.length" class="text-caption text-grey mt-1">
              Also known as: {{ person.aka.join(', ') }}
            </div>
          </v-card-text>

          <v-card-actions class="justify-center pb-4">
            <v-btn
              variant="outlined"
              size="small"
              :to="'/people/' + person.id"
            >
              View Photos
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add Person Dialog -->
    <v-dialog v-model="showAddPersonDialog" max-width="500">
      <v-card>
        <v-card-title>Add New Person</v-card-title>
        <v-card-text>
          <v-form ref="form" v-model="formValid">
            <v-text-field
              v-model="newPerson.display_name"
              label="Display Name"
              required
              :rules="[v => !!v || 'Name is required']"
            ></v-text-field>
            
            <v-text-field
              v-model="newPerson.aka"
              label="Also Known As (comma separated)"
              hint="Nicknames, maiden names, etc."
            ></v-text-field>
            
            <v-textarea
              v-model="newPerson.notes"
              label="Notes"
              rows="3"
            ></v-textarea>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showAddPersonDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            @click="addPerson"
            :disabled="!formValid"
          >
            Add Person
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
