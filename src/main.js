import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from './App.vue'
import router from './router'

const vuetify = createVuetify({
  components,
  directives,
  defaults: {
    global: {
      // density: 'compact',
    },
    VTextField: {
      variant: 'outlined',
      density: 'compact',
    },
    VSelect: {
      variant: 'outlined',
      density: 'compact',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'compact',
    },
    VCombobox: {
      variant: 'outlined',
      density: 'compact',
    },
    VAutocomplete: {
      variant: 'outlined',
      density: 'compact',
    },
    VToolbar: {
      variant: 'flat',
      density: 'compact',
    },
    VIcon: {
      color: 'primary',
    },
    VBtn: {
      color: 'primary',
      VIcon: {
        color: 'white',
      },
    },
    VCard: {
      VCardActions: {
        VBtn: {
          variant: 'flat',
        },
      },
    },
    VFileInput: {
      variant: 'outlined',
      density: 'compact',
    },
  },
})
const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
