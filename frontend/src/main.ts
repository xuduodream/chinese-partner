import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAppStore } from './stores/app'
import './index.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#root')

// Bootstrap theme after Pinia is available
const store = useAppStore()
store.initTheme()
