<script setup lang="ts">
import { computed, ref } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{ name: string }>()

/** 浮窗默认贴右上角，整条可拖，拖出边界时夹回可视区 */
const x = ref(0)
const y = ref(0)
const dragging = ref(false)
let startX = 0
let startY = 0
let originX = 0
let originY = 0

const style = computed(() => ({ transform: `translate(${x.value}px, ${y.value}px)` }))

function onPointerDown(event: PointerEvent): void {
  dragging.value = true
  startX = event.clientX
  startY = event.clientY
  originX = x.value
  originY = y.value
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return
  const nextX = originX + (event.clientX - startX)
  const nextY = originY + (event.clientY - startY)
  x.value = Math.max(-window.innerWidth + 240, Math.min(0, nextX))
  y.value = Math.max(0, Math.min(window.innerHeight - 160, nextY))
}

function onPointerUp(): void {
  dragging.value = false
}

const label = computed(() => `正在讲话：${props.name}`)
</script>

<template>
  <div
    class="speaking-pill"
    :class="{ dragging }"
    :style="style"
    role="status"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <span class="speaking-ic"><AppIcon name="mic" :size="14" /></span>
    <span class="speaking-text">{{ label }}</span>
  </div>
</template>

<style scoped>
.speaking-pill {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 45;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding-right: 14px;
  border-radius: 6px;
  background: #2b2b2b;
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
  cursor: grab;
  user-select: none;
  -webkit-app-region: no-drag;
}

.speaking-pill.dragging {
  cursor: grabbing;
}

.speaking-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 100%;
  border-right: 1px solid rgba(255, 255, 255, 0.18);
}
</style>
