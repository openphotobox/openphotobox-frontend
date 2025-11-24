<template>
  <v-app class="auth-app">
    <v-main class="auth-main">
      <div class="auth-background">
        <!-- Background pattern -->
        <div class="bg-pattern"></div>
        
        <!-- Content -->
        <div class="auth-content">
          <slot />
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
// Auth layout - minimal layout for login/setup pages
</script>

<style scoped>
.auth-app {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.auth-main {
  padding: 0 !important;
  background: transparent;
}

.auth-background {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
}

.auth-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 640px;
  padding: 2rem;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  33% {
    transform: translateY(-20px) rotate(1deg);
  }
  66% {
    transform: translateY(10px) rotate(-1deg);
  }
}

/* Dark theme adjustments */
:deep(.v-theme--dark) .auth-app {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

:deep(.v-theme--dark) .bg-pattern {
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.15) 0%, transparent 50%);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .auth-content {
    padding: 1rem;
    max-width: 100%;
  }
}
</style>
