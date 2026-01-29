<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Web 端外壳：把整页当成桌面，应用本体是一个 1100×600 的窗口，可拖动。
 * 桌面端（Electron）由系统窗口负责这一层，不进这个组件。
 */
const WINDOW_WIDTH = 1100
const WINDOW_HEIGHT = 600
const MARGIN = 24

const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)

let startX = 0
let startY = 0
let startOffset = { x: 0, y: 0 }

const style = computed(() => ({
  transform: `translate(${String(offset.value.x)}px, ${String(offset.value.y)}px) scale(${String(scale.value)})`,
}))

const maxOffset = computed(() => ({
  x: Math.max(0, (globalThis.innerWidth - WINDOW_WIDTH * scale.value) / 2 - MARGIN / 2),
  y: Math.max(0, (globalThis.innerHeight - WINDOW_HEIGHT * scale.value) / 2 - MARGIN / 2),
}))

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(-max, value))
}

function fit(): void {
  const availableX = globalThis.innerWidth - MARGIN * 2
  const availableY = globalThis.innerHeight - MARGIN * 2
  scale.value = Math.min(1, availableX / WINDOW_WIDTH, availableY / WINDOW_HEIGHT)
  offset.value = {
    x: clamp(offset.value.x, maxOffset.value.x),
    y: clamp(offset.value.y, maxOffset.value.y),
  }
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  if (scale.value < 1) {
    // 小屏缩放时窗口已铺满可用区域，拖动意义不大
    return
  }
  dragging.value = true
  startX = event.clientX
  startY = event.clientY
  startOffset = { ...offset.value }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return
  offset.value = {
    x: clamp(startOffset.x + (event.clientX - startX), maxOffset.value.x),
    y: clamp(startOffset.y + (event.clientY - startY), maxOffset.value.y),
  }
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging.value) return
  dragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

onMounted(() => {
  fit()
  globalThis.addEventListener('resize', fit)
})

onBeforeUnmount(() => {
  globalThis.removeEventListener('resize', fit)
})
</script>

<template>
  <div class="web-desktop">
    <div class="web-window-wrap" :class="{ dragging }" :style="style">
      <div class="web-window">
        <div
          class="web-dragbar"
          title="拖动窗口"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <span class="web-dot red" />
          <span class="web-dot yellow" />
          <span class="web-dot green" />
        </div>
        <div class="web-content">
          <RouterView />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.web-desktop {
  position: fixed;
  inset: 0;
  display: grid;
  overflow: hidden;
  background: radial-gradient(circle at 50% 42%, #f7f7f7 0%, #ededed 52%, #e3e3e3 100%);
  place-items: center;
}

.web-window-wrap {
  width: 1100px;
  height: 600px;
  transform-origin: center center;
  transition: transform 0.12s ease-out;
}

.web-window-wrap.dragging {
  transition: none;
}

.web-window {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: var(--tp-canvas);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.08);
}

.web-content {
  width: 100%;
  height: 100%;
}

.web-dragbar {
  position: absolute;
  z-index: 40;
  top: 0;
  left: 0;
  display: flex;
  width: 92px;
  height: 36px;
  align-items: center;
  gap: 8px;
  padding-left: 16px;
  cursor: grab;
  touch-action: none;
}

.dragging .web-dragbar {
  cursor: grabbing;
}

.web-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  pointer-events: none;
}

.web-dot.red {
  background: #ff5f57;
}

.web-dot.yellow {
  background: #febc2e;
}

.web-dot.green {
  background: #28c840;
}
</style>
