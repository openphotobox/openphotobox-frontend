export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt'
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || 'http://localhost:8000'
    }
  },
  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css',
    '~/assets/styles/global.css'
  ],
  build: {
    transpile: ['vuetify']
  },
  vite: {
    define: {
      'process.env.DEBUG': false,
    },
    ssr: {
      noExternal: ['vuetify']
    }
  },
  app: { 
    head: { 
      title: 'OpenPhotobox - Family Archive',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Caudex:ital,wght@0,400;0,700;1,400&display=swap' }
      ]
    } 
  }
})
