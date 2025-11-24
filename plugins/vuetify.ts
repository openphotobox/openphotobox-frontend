import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    components,
    directives,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi },
    },
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            background: '#f8fafc',
            surface: '#ffffff',
            primary: '#10b981',
            secondary: '#64748b',
            accent: '#32936F',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            success: '#32936F'
          }
        },
        dark: {
          colors: {
            background: '#0f172a',
            surface: '#1e293b',
            primary: '#32936F',
            secondary: '#94a3b8',
            accent: '#32936F',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            success: '#32936F'
          }
        }
      }
    }
  })

  nuxtApp.vueApp.use(vuetify)
})



