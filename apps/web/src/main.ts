import { createApp } from '@tongpin/app-core'
import { createWebPlatform } from '@tongpin/platform/web'
import { createWebHistory } from 'vue-router'

import './styles/global.css'

createApp({ platform: createWebPlatform(), history: createWebHistory() }).mount('#app')
