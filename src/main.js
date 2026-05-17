import './assets/main.css'
import './firebase'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { initLocale } from './utils/rtl'

// Apply persisted locale + set dir/lang on <html> before mount
initLocale()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

app.mount('#app')
