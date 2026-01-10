import { appRoutes, createApp, subWindowRoutes } from '@tongpin/app-core'
import { createElectronPlatform } from '@tongpin/platform/electron'
import { createWebPlatform } from '@tongpin/platform/web'
import { createWebHashHistory } from 'vue-router'

import DevPanel from './DevPanel.vue'
import SharePicker from './subwindow/SharePicker.vue'
import { readSubWindowRequest } from './subwindow/router'

const env = window.tongpin
/** 没有 preload 时（浏览器里直接开）退回 Web 实现，至少不白屏 */
const platform = env === undefined ? createWebPlatform() : createElectronPlatform(env.bridge)

// 10-M13 P1 #7：Electron 走 file://，只能用 hash 路由
const history = createWebHashHistory()
const request = readSubWindowRequest(window.location.search)

if (request !== null) {
  // 子窗口只挂一条路由：?sub=key 决定组件，共享选择器是唯一要 desktopCapturer 的实现
  createApp({
    platform,
    history,
    routes: subWindowRoutes(request, { sharePicker: SharePicker }),
  }).mount('#app')
} else {
  createApp({
    platform,
    history,
    routes: [...appRoutes, { path: '/dev', component: DevPanel, meta: { title: '调试' } }],
  }).mount('#app')
}
