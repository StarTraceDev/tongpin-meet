<script setup lang="ts">
import type { CaptureSourceListing } from '@tongpin/platform'
import { AppIcon, usePlatform } from '@tongpin/app-core'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ payload?: unknown }>()

const platform = usePlatform()

type Mode = 'screen' | 'whiteboard' | 'audio' | 'document'

const MODES: { key: Mode; label: string; icon: 'monitor' | 'pen' | 'volume' | 'file' }[] = [
  { key: 'screen', label: '桌面', icon: 'monitor' },
  { key: 'whiteboard', label: '白板', icon: 'pen' },
  { key: 'audio', label: '仅电脑声音', icon: 'volume' },
  { key: 'document', label: '文档', icon: 'file' },
]

const listings = ref<CaptureSourceListing[]>([])
const mode = ref<Mode>('screen')
const chosen = ref<string | null>(null)
const sharingAudio = ref(true)
const quality = ref('高清')
const status = ref('')
let settled = false

function readSessionId(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  const { sessionId } = payload as { sessionId?: unknown }
  return typeof sessionId === 'string' && sessionId !== '' ? sessionId : null
}

const sessionId = readSessionId(props.payload)
const screens = computed(() => listings.value.filter((item) => item.kind === 'screen'))
const windows = computed(() => listings.value.filter((item) => item.kind !== 'screen'))

const startLabel = computed(() => (mode.value === 'screen' ? '开始共享' : '开始共享'))

async function finish(sourceId: string | null): Promise<void> {
  if (settled || sessionId === null) return
  settled = true
  await platform.capture.chooseSource(sessionId, sourceId)
  await platform.window.closeSub('sharePicker')
}

function selectListing(listing: CaptureSourceListing): void {
  mode.value = 'screen'
  chosen.value = listing.id
}

function pickMode(next: Mode): void {
  mode.value = next
  if (next !== 'screen') chosen.value = next
}

async function start(): Promise<void> {
  if (mode.value !== 'screen') {
    await finish(mode.value)
    return
  }
  await finish(chosen.value)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') void finish(null)
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  void (async (): Promise<void> => {
    if (sessionId === null) {
      status.value = '共享会话已失效，请关闭后重试。'
      return
    }
    try {
      const result = await platform.capture.listSources(sessionId)
      if (result === null || result.length === 0) {
        status.value = '没有可共享的屏幕或窗口。'
        return
      }
      listings.value = result
      const firstScreen = result.find((item) => item.kind === 'screen')
      chosen.value = firstScreen?.id ?? result[0]?.id ?? null
    } catch {
      status.value = '读取共享源失败，请关闭后重试。'
    }
  })()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <main class="picker">
    <div class="picker-body">
      <div class="mode-row">
        <button
          v-for="item in MODES"
          :key="item.key"
          class="mode-card"
          :class="{ on: mode === item.key }"
          type="button"
          @click="pickMode(item.key)"
        >
          <span v-if="item.key === 'screen' && screens[0]?.thumbnail" class="mode-thumb">
            <img :src="screens[0]?.thumbnail" alt="" decoding="async" />
          </span>
          <span v-else class="mode-glyph">
            <AppIcon :name="item.icon" :size="34" />
          </span>
          <span class="mode-label">{{ item.label }}</span>
        </button>
      </div>

      <div class="picker-split" />

      <div class="source-scroll">
        <div v-if="listings.length > 0" class="source-grid">
          <button
            v-for="listing in listings"
            :key="listing.id"
            class="source-card"
            :class="{ on: chosen === listing.id }"
            type="button"
            @click="selectListing(listing)"
          >
            <span class="source-thumb">
              <img :src="listing.thumbnail" alt="" decoding="async" />
              <span v-if="chosen === listing.id" class="source-check">
                <AppIcon name="check" :size="14" :stroke-width="2.6" />
              </span>
            </span>
            <span class="source-name">{{ listing.name }}</span>
          </button>
        </div>
        <p v-else class="picker-empty">{{ status === '' ? '正在读取可共享的内容…' : status }}</p>
        <p v-if="windows.length === 0 && listings.length > 0" class="picker-hint">
          没有单独的应用窗口，可继续共享整个桌面。
        </p>
      </div>
    </div>

    <footer class="picker-foot">
      <label class="audio-check">
        <input v-model="sharingAudio" type="checkbox" />
        <span>共享电脑声音</span>
      </label>
      <label class="quality">
        <span>画质</span>
        <select v-model="quality">
          <option>流畅</option>
          <option>高清</option>
          <option>超清</option>
        </select>
      </label>
      <div class="foot-actions">
        <button class="btn ghost" type="button" @click="finish(null)">取消</button>
        <button class="btn primary" type="button" :disabled="sessionId === null" @click="start">
          {{ startLabel }}
        </button>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tp-canvas);
  font-family: var(--tp-font-sans);
  -webkit-app-region: no-drag;
}

.picker-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 10px 20px 0;
}

.mode-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding: 32px 0 18px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 132px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-m);
  background: var(--tp-canvas);
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 15px;
  cursor: pointer;
}

.mode-card.on {
  border-color: var(--tp-brand);
  background: var(--tp-brand);
  color: #fff;
}

.mode-thumb {
  display: block;
  width: 84%;
  height: 74px;
  overflow: hidden;
  border-radius: 4px;
  background: #dfe6f7;
}

.mode-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mode-glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 74px;
  color: var(--tp-text-secondary);
}

.mode-card.on .mode-glyph {
  color: #fff;
}

.mode-label {
  line-height: 1;
}

.picker-split {
  height: 1px;
  margin: 0 -20px;
  background: var(--tp-border-light);
}

.source-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 0 12px;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.source-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 6px 6px 10px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-m);
  background: var(--tp-canvas);
  font-family: inherit;
  cursor: pointer;
}

.source-card.on {
  border-color: var(--tp-brand);
  background: var(--tp-brand-tint);
  box-shadow: inset 0 0 0 1px var(--tp-brand);
}

.source-thumb {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 4px;
  background: var(--tp-fill);
}

.source-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.source-check {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--tp-brand);
  color: #fff;
}

.source-name {
  overflow: hidden;
  padding: 0 4px;
  color: var(--tp-text-primary);
  font-size: 12px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-empty,
.picker-hint {
  margin: 12px 0;
  color: var(--tp-text-tertiary);
  font-size: 12px;
  text-align: center;
}

.picker-foot {
  display: flex;
  align-items: center;
  gap: 22px;
  height: 62px;
  padding: 0 20px;
  border-top: 1px solid var(--tp-border-light);
}

.audio-check {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--tp-text-primary);
  font-size: 13px;
  cursor: pointer;
}

.audio-check input {
  width: 16px;
  height: 16px;
  accent-color: var(--tp-brand);
}

.quality {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--tp-text-secondary);
  font-size: 13px;
}

.quality select {
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  background: var(--tp-canvas);
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 13px;
}

.foot-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.btn {
  height: 38px;
  padding: 0 26px;
  border-radius: var(--tp-radius-s);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
}

.btn.ghost {
  border: 1px solid var(--tp-border);
  background: var(--tp-canvas);
  color: var(--tp-text-primary);
}

.btn.primary {
  border: 0;
  background: var(--tp-brand);
  color: #fff;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
