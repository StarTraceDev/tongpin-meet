<script setup lang="ts">
import type { UpdateState } from '@tongpin/platform'
import { SUB_WINDOW_KEYS } from '@tongpin/platform'
import { ELECTRON_CHANNELS } from '@tongpin/platform/electron'
import { usePlatform } from '@tongpin/app-core'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { deepLinkText, readDeepLinkNotice } from './deep-link-view'
import type { DesktopEnv } from './env'
import { updateText } from './update-view'

const env: DesktopEnv | undefined = window.tongpin
const platform = usePlatform()

const storageNote = ref('—')
const subStatus = ref('尚未打开子窗口。')
const shareStatus = ref('未共享。')
const sharing = ref(false)
const preview = ref<HTMLVideoElement | null>(null)
const updateNote = ref('尚未检查更新。')
const updateReady = ref(false)
const deepLink = ref(deepLinkText(null))

const bridgeNote = computed(() => (env === undefined ? '未接通' : '已接通'))

function applyUpdate(state: UpdateState): void {
  updateNote.value = updateText(state)
  updateReady.value = state.status === 'ready'
}

async function startShare(): Promise<void> {
  shareStatus.value = '请选择要共享的屏幕或窗口…'
  try {
    const source = await platform.capture.pickSource()
    if (source === null) {
      shareStatus.value = '未选择共享内容。'
      return
    }
    shareStatus.value = `正在共享：${source.name}`
    if (preview.value !== null && source.stream !== undefined) {
      preview.value.srcObject = source.stream
      preview.value.hidden = false
    }
    sharing.value = true
  } catch (error) {
    shareStatus.value = `共享失败：${error instanceof Error ? error.message : '未知错误'}`
  }
}

async function stopShare(): Promise<void> {
  await platform.capture.stop()
  if (preview.value !== null) {
    preview.value.srcObject = null
    preview.value.hidden = true
  }
  shareStatus.value = '已停止共享。'
  sharing.value = false
}

let offSubClosed: (() => void) | null = null
let offUpdate: (() => void) | null = null
let offDeepLink: (() => void) | null = null

onMounted(() => {
  void (async (): Promise<void> => {
    await platform.storage.set('desktop:lastOpened', new Date().toISOString())
    storageNote.value = (await platform.storage.get('desktop:lastOpened')) ?? '—'
  })()

  offSubClosed = platform.window.onSubClosed((key) => {
    subStatus.value = `子窗口 ${key} 已关闭。`
  })
  offUpdate = platform.update.onState(applyUpdate)
  if (env !== undefined) {
    offDeepLink = env.bridge.on(ELECTRON_CHANNELS.appDeepLink, (payload) => {
      deepLink.value = deepLinkText(readDeepLinkNotice(payload))
    })
  }
})

onUnmounted(() => {
  offSubClosed?.()
  offUpdate?.()
  offDeepLink?.()
})
</script>

<template>
  <main class="dev-panel">
    <h1>同频会议 · 桌面端调试</h1>
    <p class="hint">主窗口已就绪（1100 × 600），IPC 桥 {{ bridgeNote }}。</p>

    <dl>
      <dt>平台</dt>
      <dd>{{ env?.platform ?? 'unknown' }}</dd>
      <dt>Electron</dt>
      <dd>{{ env?.versions.electron ?? '—' }}</dd>
      <dt>Chromium</dt>
      <dd>{{ env?.versions.chrome ?? '—' }}</dd>
      <dt>本地存储回读</dt>
      <dd>{{ storageNote }}</dd>
    </dl>

    <section>
      <h2>子窗口</h2>
      <div class="row">
        <button
          v-for="key in SUB_WINDOW_KEYS"
          :key="key"
          type="button"
          @click="platform.window.openSub(key, {})"
        >
          {{ key }}
        </button>
      </div>
      <p class="hint">{{ subStatus }}</p>
    </section>

    <section>
      <h2>屏幕共享</h2>
      <div class="row">
        <button type="button" :disabled="sharing" @click="startShare">共享屏幕</button>
        <button type="button" :disabled="!sharing" @click="stopShare">停止共享</button>
      </div>
      <p class="hint">{{ shareStatus }}</p>
      <video ref="preview" class="share-preview" autoplay muted playsinline hidden />
    </section>

    <section>
      <h2>自动更新</h2>
      <div class="row">
        <button type="button" @click="platform.update.check().then(applyUpdate)">检查更新</button>
        <button type="button" :disabled="!updateReady" @click="platform.update.install()">
          重启安装
        </button>
      </div>
      <p class="hint">{{ updateNote }}</p>
    </section>

    <section>
      <h2>深链入口</h2>
      <p class="hint">{{ deepLink }}</p>
    </section>
  </main>
</template>

<style scoped>
.dev-panel {
  height: 100%;
  padding: 28px 32px;
  overflow-y: auto;
  background: var(--tp-canvas);
  color: var(--tp-text-primary);
}

h1 {
  margin: 0 0 6px;
  font-size: 20px;
}

h2 {
  margin: 0 0 8px;
  font-size: 14px;
}

section {
  margin-top: 20px;
}

dl {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 6px 12px;
  margin: 16px 0 0;
  font-size: 13px;
}

dt {
  color: var(--tp-text-tertiary);
}

dd {
  margin: 0;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  background: var(--tp-canvas);
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--tp-text-tertiary);
}

.share-preview {
  width: 100%;
  max-width: 520px;
  margin-top: 12px;
  border-radius: var(--tp-radius-m);
  background: #000;
}
</style>
