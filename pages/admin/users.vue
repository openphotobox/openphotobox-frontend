<template>
  <div class="admin-users">
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-btn
                icon="mdi-arrow-left"
                variant="text"
                @click="navigateTo('/admin/settings')"
                class="me-2"
              ></v-btn>
              <v-icon class="me-2">mdi-account-multiple</v-icon>
              User Management
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                prepend-icon="mdi-account-plus"
                @click="openCreateDialog"
              >
                Create User
              </v-btn>
            </v-card-title>
            
            <v-card-text>
              <!-- Search Bar -->
              <v-text-field
                v-model="search"
                prepend-inner-icon="mdi-magnify"
                label="Search users..."
                variant="outlined"
                density="compact"
                clearable
                class="mb-4"
              ></v-text-field>

              <!-- Users Data Table -->
              <v-data-table
                :headers="headers"
                :items="users"
                :loading="loading"
                :search="search"
                class="elevation-1"
              >
                <!-- Username column -->
                <template v-slot:item.username="{ item }">
                  <div class="d-flex align-center">
                    <v-avatar size="32" class="me-2" color="primary">
                      <span class="text-white text-caption">
                        {{ item.username.charAt(0).toUpperCase() }}
                      </span>
                    </v-avatar>
                    <strong>{{ item.username }}</strong>
                  </div>
                </template>

                <!-- Role column -->
                <template v-slot:item.role="{ item }">
                  <v-chip
                    :color="item.is_superuser ? 'error' : item.is_staff ? 'warning' : 'default'"
                    size="small"
                    variant="flat"
                  >
                    {{ item.is_superuser ? 'Superuser' : item.is_staff ? 'Staff' : 'User' }}
                  </v-chip>
                </template>

                <!-- Status column -->
                <template v-slot:item.is_active="{ item }">
                  <v-chip
                    :color="item.is_active ? 'success' : 'error'"
                    size="small"
                    variant="flat"
                  >
                    {{ item.is_active ? 'Active' : 'Inactive' }}
                  </v-chip>
                </template>

                <!-- Date joined column -->
                <template v-slot:item.date_joined="{ item }">
                  {{ formatDate(item.date_joined) }}
                </template>

                <!-- Actions column -->
                <template v-slot:item.actions="{ item }">
                  <v-btn
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="openEditDialog(item)"
                  ></v-btn>
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click="openDeleteDialog(item)"
                  ></v-btn>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Create User Dialog -->
    <v-dialog v-model="createDialog" max-width="600">
      <v-card>
        <v-card-title>Create New User</v-card-title>
        <v-card-text>
          <v-form ref="createForm" v-model="createFormValid">
            <v-text-field
              v-model="createData.username"
              label="Username"
              :rules="[v => !!v || 'Username is required']"
              variant="outlined"
              prepend-inner-icon="mdi-account"
              class="mb-2"
            ></v-text-field>
            
            <v-text-field
              v-model="createData.email"
              label="Email"
              type="email"
              :rules="[
                v => !!v || 'Email is required',
                v => /.+@.+\..+/.test(v) || 'Email must be valid'
              ]"
              variant="outlined"
              prepend-inner-icon="mdi-email"
              class="mb-2"
            ></v-text-field>
            
            <v-text-field
              v-model="createData.password"
              label="Password"
              type="password"
              :rules="[
                v => !!v || 'Password is required',
                v => v.length >= 8 || 'Password must be at least 8 characters'
              ]"
              variant="outlined"
              prepend-inner-icon="mdi-lock"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model="confirmPassword"
              label="Confirm Password"
              type="password"
              :rules="[
                v => !!v || 'Please confirm password',
                v => v === createData.password || 'Passwords do not match'
              ]"
              variant="outlined"
              prepend-inner-icon="mdi-lock-check"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model="createData.first_name"
              label="First Name (optional)"
              variant="outlined"
              prepend-inner-icon="mdi-account-outline"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model="createData.last_name"
              label="Last Name (optional)"
              variant="outlined"
              prepend-inner-icon="mdi-account-outline"
              class="mb-2"
            ></v-text-field>
            
            <v-checkbox
              v-model="createData.is_staff"
              label="Admin/Staff User"
              color="warning"
              class="mb-2"
            ></v-checkbox>
            
            <v-checkbox
              v-model="createData.is_superuser"
              label="Superuser (Full Permissions)"
              color="error"
              class="mb-2"
            ></v-checkbox>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="createDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            @click="createUser"
            :disabled="!createFormValid"
            :loading="creating"
          >
            Create User
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit User Dialog -->
    <v-dialog v-model="editDialog" max-width="600">
      <v-card>
        <v-card-title>Edit User</v-card-title>
        <v-card-text>
          <v-form ref="editForm" v-model="editFormValid">
            <v-text-field
              v-model="editData.username"
              label="Username"
              :rules="[v => !!v || 'Username is required']"
              variant="outlined"
              prepend-inner-icon="mdi-account"
              class="mb-2"
            ></v-text-field>
            
            <v-text-field
              v-model="editData.email"
              label="Email"
              type="email"
              :rules="[
                v => !!v || 'Email is required',
                v => /.+@.+\..+/.test(v) || 'Email must be valid'
              ]"
              variant="outlined"
              prepend-inner-icon="mdi-email"
              class="mb-2"
            ></v-text-field>
            
            <v-text-field
              v-model="editData.password"
              label="New Password (leave blank to keep current)"
              type="password"
              :rules="[
                v => !v || v.length >= 8 || 'Password must be at least 8 characters'
              ]"
              variant="outlined"
              prepend-inner-icon="mdi-lock"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model="editData.first_name"
              label="First Name (optional)"
              variant="outlined"
              prepend-inner-icon="mdi-account-outline"
              class="mb-2"
            ></v-text-field>

            <v-text-field
              v-model="editData.last_name"
              label="Last Name (optional)"
              variant="outlined"
              prepend-inner-icon="mdi-account-outline"
              class="mb-2"
            ></v-text-field>
            
            <v-checkbox
              v-model="editData.is_active"
              label="Active"
              color="success"
              class="mb-2"
            ></v-checkbox>
            
            <v-checkbox
              v-model="editData.is_staff"
              label="Admin/Staff User"
              color="warning"
              class="mb-2"
            ></v-checkbox>
            
            <v-checkbox
              v-model="editData.is_superuser"
              label="Superuser (Full Permissions)"
              color="error"
              class="mb-2"
            ></v-checkbox>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="editDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            @click="updateUser"
            :disabled="!editFormValid"
            :loading="updating"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon color="error" class="me-2">mdi-alert</v-icon>
          Delete User?
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="outlined" class="mb-4">
            Are you sure you want to delete user <strong>{{ selectedUser?.username }}</strong>?
            This action cannot be undone.
          </v-alert>
          
          <div class="text-body-2">
            <strong>User Details:</strong>
            <ul class="mt-2">
              <li>Username: {{ selectedUser?.username }}</li>
              <li>Email: {{ selectedUser?.email }}</li>
              <li>Role: {{ selectedUser?.is_superuser ? 'Superuser' : selectedUser?.is_staff ? 'Staff' : 'User' }}</li>
            </ul>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="deleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            @click="deleteUser"
            :loading="deleting"
          >
            Delete User
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import type { User, UserCreateData, UserUpdateData } from '@/api/types/users'

// Require admin authentication
definePageMeta({
  middleware: ['setup', 'auth']
})

const api = useApi()

// Data table configuration
const headers = [
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Role', key: 'role', sortable: false },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Joined', key: 'date_joined', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
]

// State
const users = ref<User[]>([])
const loading = ref(false)
const search = ref('')

// Create dialog
const createDialog = ref(false)
const createFormValid = ref(false)
const creating = ref(false)
const createData = ref<UserCreateData>({
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  is_staff: false,
  is_superuser: false,
})

const confirmPassword = ref('')

// Edit dialog
const editDialog = ref(false)
const editFormValid = ref(false)
const updating = ref(false)
const selectedUser = ref<User | null>(null)
const editData = ref<UserUpdateData>({
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  is_active: true,
  is_staff: false,
  is_superuser: false,
})

// Delete dialog
const deleteDialog = ref(false)
const deleting = ref(false)

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Load users on mount
onMounted(() => {
  loadUsers()
})

const loadUsers = async () => {
  loading.value = true
  try {
    const response = await api.users.list()
    if (response.success) {
      // Handle different response formats
      const data = response.data as any
      users.value = Array.isArray(data) ? data : (data?.users || data?.results || [])
    } else {
      showSnackbar('Failed to load users: ' + response.error, 'error')
    }
  } catch (error: any) {
    showSnackbar('Error loading users: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  createData.value = {
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_staff: false,
    is_superuser: false,
  }
  confirmPassword.value = ''
  createDialog.value = true
}

const createUser = async () => {
  creating.value = true
  try {
    // Add confirm_password to the request
    const payload = {
      ...createData.value,
      confirm_password: confirmPassword.value
    }
    const response = await api.users.create(payload as any)
    if (response.success) {
      showSnackbar('User created successfully', 'success')
      createDialog.value = false
      await loadUsers()
    } else {
      showSnackbar('Failed to create user: ' + response.error, 'error')
    }
  } catch (error: any) {
    showSnackbar('Error creating user: ' + error.message, 'error')
  } finally {
    creating.value = false
  }
}

const openEditDialog = (user: User) => {
  selectedUser.value = user
  editData.value = {
    username: user.username,
    email: user.email,
    password: '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    is_active: user.is_active !== false,
    is_staff: user.is_staff || false,
    is_superuser: user.is_superuser || false,
  }
  editDialog.value = true
}

const updateUser = async () => {
  if (!selectedUser.value) return
  
  updating.value = true
  try {
    // Remove empty password from update data
    const updatePayload = { ...editData.value }
    if (!updatePayload.password) {
      delete updatePayload.password
    }
    
    const response = await api.users.update(selectedUser.value.id, updatePayload)
    if (response.success) {
      showSnackbar('User updated successfully', 'success')
      editDialog.value = false
      await loadUsers()
    } else {
      showSnackbar('Failed to update user: ' + response.error, 'error')
    }
  } catch (error: any) {
    showSnackbar('Error updating user: ' + error.message, 'error')
  } finally {
    updating.value = false
  }
}

const openDeleteDialog = (user: User) => {
  selectedUser.value = user
  deleteDialog.value = true
}

const deleteUser = async () => {
  if (!selectedUser.value) return
  
  deleting.value = true
  try {
    const response = await api.users.delete(selectedUser.value.id)
    if (response.success) {
      showSnackbar('User deleted successfully', 'success')
      deleteDialog.value = false
      await loadUsers()
    } else {
      showSnackbar('Failed to delete user: ' + response.error, 'error')
    }
  } catch (error: any) {
    showSnackbar('Error deleting user: ' + error.message, 'error')
  } finally {
    deleting.value = false
  }
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const showSnackbar = (message: string, color: string = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color
  }
}
</script>

<style scoped>
.admin-users {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem 0;
}

:deep(.v-data-table) {
  background: transparent;
}
</style>

