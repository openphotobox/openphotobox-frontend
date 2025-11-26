<template>
  <v-app>
    <!-- Modern navigation drawer with better styling -->
    <v-navigation-drawer 
      v-model="drawer"
      app 
      class="custom-drawer"
      :permanent="!isMobile"
      :temporary="isMobile"
      :scrim="isMobile"
    >
      <v-list class="pa-4">
        <!-- App logo/brand -->
        <div class="text-center mb-6">
          <v-avatar size="48" class="mb-2">
            <v-icon size="32" color="primary">mdi-camera</v-icon>
          </v-avatar>
          <div class="text-h6 font-weight-bold text-primary">OpenPhotobox</div>
          <div class="text-caption text-medium-emphasis">Family Archive</div>
        </div>

        <v-divider class="mb-4"></v-divider>

        <!-- Navigation items -->
        <v-list-item 
          to="/" 
          prepend-icon="mdi-home" 
          title="Home"
          class="nav-item mb-2"
          rounded="lg"
        ></v-list-item>
        
        <v-list-item 
          to="/albums" 
          prepend-icon="mdi-folder-image" 
          title="Albums"
          class="nav-item mb-2"
          rounded="lg"
        ></v-list-item>
        
        <v-list-item 
          to="/people" 
          prepend-icon="mdi-account-group" 
          title="People"
          class="nav-item mb-2"
          rounded="lg"
        ></v-list-item>
        
        <v-list-item 
          to="/liked" 
          prepend-icon="mdi-heart" 
          title="Liked"
          class="nav-item mb-2"
          rounded="lg"
        ></v-list-item>
        
        <v-list-item 
          to="/search" 
          prepend-icon="mdi-magnify" 
          title="Search"
          class="nav-item mb-2"
          rounded="lg"
        ></v-list-item>
        
        <!-- Admin-only links -->
        <template v-if="authStore.isAdmin">
          <v-list-item 
            to="/upload" 
            prepend-icon="mdi-cloud-upload" 
            title="Upload"
            class="nav-item mb-2"
            rounded="lg"
          ></v-list-item>

          <v-list-item 
            to="/utilities" 
            prepend-icon="mdi-tools" 
            title="Utilities"
            class="nav-item mb-2"
            rounded="lg"
          ></v-list-item>
        </template>

        <v-divider class="my-4"></v-divider>

        <!-- Admin Section (only show for admin users) -->
        <template v-if="authStore.user?.is_admin">
          <div class="text-caption text-medium-emphasis pa-4 pb-2">Admin</div>
          
          <v-list-item 
            to="/admin/settings" 
            prepend-icon="mdi-cog" 
            title="Settings"
            class="nav-item mb-2"
            rounded="lg"
          ></v-list-item>

          <v-divider class="my-4"></v-divider>
        </template>
      </v-list>
    </v-navigation-drawer>

    <!-- Modern app bar -->
    <v-app-bar 
      app 
      elevation="0"
      class="custom-app-bar"
    >
      <v-btn
        v-if="isMobile"
        icon
        variant="text"
        class="me-2"
        @click="drawer = !drawer"
        aria-label="Toggle navigation"
      >
        <v-icon>mdi-menu</v-icon>
      </v-btn>
      <div v-else class="me-2" />
      
      <v-toolbar-title class="d-flex align-center">
        <v-icon class="me-2" color="primary">mdi-camera</v-icon>
        <span class="font-weight-bold">OpenPhotobox</span>
      </v-toolbar-title>
      
      <v-spacer></v-spacer>

      <!-- Search bar -->
      <v-text-field
        v-model="searchQuery"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search photos..."
        variant="outlined"
        density="compact"
        hide-details
        class="search-field me-4"
        style="max-width: 300px;"
        @keyup.enter="handleSearch"
      ></v-text-field>

      <!-- Upload button (admin only) -->
      <v-btn
        v-if="authStore.isAdmin"
        icon
        @click="navigateTo('/upload')"
        title="Upload Photos"
      >
        <v-icon>mdi-cloud-upload</v-icon>
      </v-btn>

      <!-- User menu -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn
            icon
            v-bind="props"
            class="ms-2"
          >
            <v-avatar size="32">
              <v-icon>mdi-account</v-icon>
            </v-avatar>
          </v-btn>
        </template>
        
        <v-list>
          <v-list-item>
            <v-list-item-title>{{ authStore.user?.username || 'User' }}</v-list-item-title>
            <v-list-item-subtitle>{{ authStore.user?.email || '' }}</v-list-item-subtitle>
          </v-list-item>
          
          <v-divider></v-divider>
          
          <!-- Admin settings (only for admin users) -->
          <v-list-item 
            v-if="authStore.user?.is_admin"
            to="/admin/settings"
            prepend-icon="mdi-cog"
          >
            <v-list-item-title>Admin Settings</v-list-item-title>
          </v-list-item>
          
          <v-list-item 
            @click="authStore.logout"
            prepend-icon="mdi-logout"
          >
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Main content area -->
    <v-main class="custom-main">
      <v-container fluid class="pa-0 app-container">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const searchQuery = ref('')
const drawer = ref(true)
const display = useDisplay()
const isMobile = computed(() => display.mdAndDown.value)

watch(isMobile, (mobile) => {
  drawer.value = mobile ? false : true
}, { immediate: true })

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    navigateTo(`/search?q=${encodeURIComponent(searchQuery.value.trim())}`)
  }
}
</script>

<style scoped>
.custom-drawer {
  background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}
.custom-drawer :deep(.v-navigation-drawer__scrim) {
  backdrop-filter: blur(6px);
}

.custom-app-bar {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.custom-main {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  min-height: 100vh;
  overflow: hidden;
}

.app-container {
  padding-left: 0 !important;
  padding-right: 0 !important;
  max-width: 100% !important;
}

.nav-item {
  transition: all 0.3s ease;
}

.nav-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  transform: translateX(4px);
}

.nav-item.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.search-field {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 24px;
}
.custom-app-bar :deep(.v-toolbar-title) {
  font-size: 1rem;
}

/* Dark theme adjustments */
:deep(.v-theme--dark) .custom-drawer {
  background: linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%);
}

:deep(.v-theme--dark) .custom-app-bar {
  background: rgba(26, 26, 26, 0.95) !important;
}

:deep(.v-theme--dark) .custom-main {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

:deep(.v-theme--dark) .search-field {
  background: rgba(45, 45, 45, 0.8);
}

@media (max-width: 960px) {
  .custom-app-bar {
    padding-inline: 8px;
  }
  .search-field {
    flex: 1;
    max-width: none !important;
  }
}
</style>
