<script setup lang="ts">
import type { CaptureSourceListing } from '@tongpin/platform'
import { usePlatform } from '@tongpin/app-core'
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ payload?: unknown }>()

const platform = usePlatform()

const listings = ref<CaptureSourceListing[]>([])
const status = ref('')
const chosen = ref<string | null>(null)
let settled = false

function readSessionId(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  const { sessionId } = payload as { sessionId?: unknown }
  return typeof sessionId === 'string' && sessionId !== '' ? sessionId : null
}

const sessionId = readSessionId(props.payload)

async function finish(sourceId: string | null): Promise<void> {
  if (settled || sessionId === null) return
  settled = true
  chosen.value = sourceId
  await platform.capture.chooseSource(sessionId, sourceId)
  await platform.window.closeSub('sharePicker')
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
      status.value = `共 ${result.length} 个可共享源，选择后开始共享。`
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
  <main class="sub-window">
    <header class="picker-head">
      <h1>选择共享内容</h1>
      <button id="pick-cancel" type="button" @click="finish(null)">取消</button>
    </header>
    <p class="hint">选中后回到主窗口开始共享，Esc 或「取消」放弃本次共享。</p>
    <div id="source-grid" class="source-grid" role="listbox" aria-label="可共享的屏幕与窗口">
      <button
        v-for="listing in listings"
        :key="listing.id"
        class="source-card"
        type="button"
        role="option"
        :aria-selected="chosen === listing.id"
        @click="finish(listing.id)"
      >
        <img :src="listing.thumbnail" alt="" decoding="async" />
        <span class="source-name">{{ listing.name }}</span>
        <span class="source-kind">{{ listing.kind === 'screen' ? '整个屏幕' : '窗口' }}</span>
      </button>
    </div>
    <p id="picker-status" class="hint" role="status">{{ status }}</p>
  </main>
</template>

<style scoped>
.sub-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px 28px 20px;
  background: var(--tp-canvas);
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  -webkit-app-region: drag;
}

.picker-head h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--tp-text-title);
}

.picker-head button {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  background: var(--tp-canvas);
  color: var(--tp-text-secondary);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--tp-text-tertiary);
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  flex: 1;
  min-height: 0;
  margin: 16px 0 8px;
  overflow-y: auto;
}

.source-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-m);
  background: var(--tp-canvas);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.source-card:hover {
  border-color: var(--tp-brand);
}

.source-card[aria-selected='true'] {
  border-color: var(--tp-brand);
  box-shadow: 0 0 0 2px var(--tp-brand-tint);
}

.source-card img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  border-radius: var(--tp-radius-s);
  background: var(--tp-fill);
}

.source-name {
  overflow: hidden;
  font-size: 13px;
  color: var(--tp-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-kind {
  font-size: 12px;
  color: var(--tp-text-tertiary);
}
</style>
