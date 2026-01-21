<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import { usePlatform } from '../../../platform'

type Tool = 'pen' | 'arrow' | 'eraser'

interface Point {
  x: number
  y: number
}

interface Stroke {
  tool: 'pen' | 'arrow'
  color: string
  size: number
  points: Point[]
}

const props = defineProps<{ embedded?: boolean }>()
const emit = defineEmits<{ close: []; detach: [] }>()

const platform = usePlatform()

const COLORS = [
  '#1e1e1e',
  '#8c8c8c',
  '#e8453c',
  '#f57c1f',
  '#f5b800',
  '#34b96a',
  '#4070ff',
  '#7b61ff',
  '#22d3ee',
  '#e91e8c',
]
const SIZES = ['2', '4', '8', '12', '16']

const canvasRef = ref<HTMLCanvasElement | null>(null)
const areaRef = ref<HTMLElement | null>(null)
const tool = ref<Tool>('pen')
const color = ref('#1e1e1e')
const size = ref(8)
const panelOpen = ref(true)
const page = ref(0)
// 设计稿是 1 / 3，先给三页（可继续加）
const pages = ref<Stroke[][]>([[], [], []])
const redoStack = ref<Stroke[][]>([])
let drawing: Stroke | null = null
let observer: ResizeObserver | null = null

const strokes = computed(() => pages.value[page.value] ?? [])
const panelWidth = computed(() => (tool.value === 'arrow' ? 450 : 220))

function context(): CanvasRenderingContext2D | null {
  return canvasRef.value?.getContext('2d') ?? null
}

/** 用 CSS 像素坐标画，画布按 dpr 放大，线条才不糊 */
function ratio(): number {
  return window.devicePixelRatio || 1
}

function resize(): void {
  const canvas = canvasRef.value
  const area = areaRef.value
  if (canvas === null || area === null) return
  const scale = ratio()
  canvas.width = Math.round(area.clientWidth * scale)
  canvas.height = Math.round(area.clientHeight * scale)
  canvas.style.width = `${area.clientWidth}px`
  canvas.style.height = `${area.clientHeight}px`
  const ctx = context()
  if (ctx !== null) ctx.setTransform(scale, 0, 0, scale, 0, 0)
  redraw()
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const [first, ...rest] = stroke.points
  if (first === undefined) return
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = stroke.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (stroke.tool === 'pen') {
    ctx.beginPath()
    ctx.moveTo(first.x, first.y)
    for (const point of rest) ctx.lineTo(point.x, point.y)
    ctx.stroke()
    return
  }

  const last = stroke.points[stroke.points.length - 1] ?? first
  const angle = Math.atan2(last.y - first.y, last.x - first.x)
  const head = Math.max(12, stroke.size * 3)
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  ctx.lineTo(last.x, last.y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(last.x, last.y)
  ctx.lineTo(
    last.x - head * Math.cos(angle - Math.PI / 7),
    last.y - head * Math.sin(angle - Math.PI / 7),
  )
  ctx.lineTo(
    last.x - head * Math.cos(angle + Math.PI / 7),
    last.y - head * Math.sin(angle + Math.PI / 7),
  )
  ctx.closePath()
  ctx.fill()
}

function redraw(): void {
  const ctx = context()
  if (ctx === null) return
  ctx.clearRect(0, 0, canvasRef.value?.clientWidth ?? 0, canvasRef.value?.clientHeight ?? 0)
  for (const stroke of strokes.value) drawStroke(ctx, stroke)
  if (drawing !== null) drawStroke(ctx, drawing)
}

function pointOf(event: PointerEvent): Point {
  const rect = canvasRef.value?.getBoundingClientRect()
  return {
    x: event.clientX - (rect?.left ?? 0),
    y: event.clientY - (rect?.top ?? 0),
  }
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const lengthSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
  if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y)
  let t = ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / lengthSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(point.x - (a.x + t * (b.x - a.x)), point.y - (a.y + t * (b.y - a.y)))
}

function eraseAt(point: Point): boolean {
  const source = strokes.value
  const index = source.findIndex((stroke) =>
    stroke.points.some((item, i) => {
      const next = stroke.points[i + 1] ?? item
      return distanceToSegment(point, item, next) < Math.max(10, stroke.size)
    }),
  )
  if (index < 0) return false
  source.splice(index, 1)
  return true
}

function onPointerDown(event: PointerEvent): void {
  const canvas = canvasRef.value
  if (canvas === null) return
  canvas.setPointerCapture(event.pointerId)
  const point = pointOf(event)
  if (tool.value === 'eraser') {
    if (eraseAt(point)) redraw()
    return
  }
  redoStack.value = []
  drawing = { tool: tool.value, color: color.value, size: size.value, points: [point] }
  redraw()
}

function onPointerMove(event: PointerEvent): void {
  if (drawing === null && tool.value !== 'eraser') return
  const point = pointOf(event)
  if (tool.value === 'eraser') {
    if (eraseAt(point)) redraw()
    return
  }
  drawing?.points.push(point)
  redraw()
}

function onPointerUp(): void {
  if (drawing !== null) {
    strokes.value.push(drawing)
    drawing = null
    redraw()
  }
}

function chooseTool(next: 'pen' | 'arrow'): void {
  tool.value = next
  panelOpen.value = true
}

function undo(): void {
  const stroke = strokes.value.pop()
  if (stroke !== undefined) redoStack.value.push([stroke])
  redraw()
}

function redo(): void {
  const group = redoStack.value.pop()
  if (group === undefined) return
  strokes.value.push(...group)
  redraw()
}

function clearPage(): void {
  pages.value[page.value] = []
  redoStack.value = []
  redraw()
}

function addPage(): void {
  if (pages.value.length >= 9) return
  pages.value.push([])
}

function turn(step: number): void {
  const next = page.value + step
  if (next < 0 || next >= pages.value.length) return
  page.value = next
  redraw()
}

async function save(): Promise<void> {
  const canvas = canvasRef.value
  if (canvas === null) return
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (blob === null) return
  await platform.shell.saveFile({ filename: `白板-${Date.now()}.png`, blob })
}

onMounted(() => {
  resize()
  observer = new ResizeObserver(resize)
  if (areaRef.value !== null) observer.observe(areaRef.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <div class="whiteboard" :class="{ embedded: props.embedded }">
    <div class="wb-top">
      <template v-if="props.embedded">
        <span class="wb-name">白板</span>
      </template>
      <button class="wb-icon" type="button" title="撤销" @click="undo">
        <AppIcon name="undo" :size="18" />
      </button>
      <button class="wb-icon" type="button" title="重做" @click="redo">
        <AppIcon name="redo" :size="18" />
      </button>
      <button class="wb-icon" type="button" title="新增页面" @click="addPage">
        <AppIcon name="plus-page" :size="18" />
      </button>
      <span v-if="!props.embedded" class="wb-title">白板</span>
      <template v-else>
        <button class="wb-icon" type="button" title="独立白板" @click="emit('detach')">
          <AppIcon name="detach" :size="18" />
        </button>
        <button class="wb-close" type="button" @click="emit('close')">关闭白板</button>
      </template>
      <button
        v-if="!props.embedded"
        class="wb-icon wb-full"
        type="button"
        title="全屏"
        @click="platform.window.setFullscreen(true)"
      >
        <AppIcon name="expand" :size="18" />
      </button>
    </div>

    <div ref="areaRef" class="wb-area">
      <canvas
        ref="canvasRef"
        class="wb-canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />

      <div class="wb-pages">
        <button class="wb-page-btn" type="button" @click="turn(-1)">
          <AppIcon name="left" :size="13" />
        </button>
        <span>{{ page + 1 }} / {{ pages.length }}</span>
        <button class="wb-page-btn" type="button" @click="turn(1)">
          <AppIcon name="right" :size="13" />
        </button>
      </div>

      <div
        v-if="panelOpen && tool !== 'eraser'"
        class="wb-panel"
        :style="{ width: `${panelWidth}px` }"
      >
        <div class="wb-size-badge">{{ size }}</div>
        <div class="wb-size">
          <i class="wb-size-dot" />
          <input v-model.number="size" class="wb-range" type="range" min="1" max="16" step="1" />
          <i
            class="wb-size-big"
            :style="{
              width: `${Math.max(18, size + 14)}px`,
              height: `${Math.max(18, size + 14)}px`,
            }"
          />
        </div>
        <div class="wb-colors" :class="{ wide: panelWidth > 300 }">
          <button
            v-for="item in COLORS"
            :key="item"
            class="wb-color"
            :class="{ on: color === item }"
            :style="{ background: item }"
            type="button"
            :title="item"
            @click="color = item"
          />
        </div>
        <div v-if="panelWidth > 300" class="wb-sizes">
          <button
            v-for="item in SIZES"
            :key="item"
            type="button"
            class="wb-size-chip"
            :class="{ on: String(size) === item }"
            @click="size = Number(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div class="wb-bar">
        <button class="wb-tool" type="button" @click="panelOpen = !panelOpen">
          <span class="ring"><AppIcon name="down" :size="20" /></span>
          <span>收起</span>
        </button>
        <button
          class="wb-tool"
          :class="{ on: tool === 'pen' }"
          type="button"
          @click="chooseTool('pen')"
        >
          <span class="ring"><AppIcon name="pen" :size="20" /></span>
          <span>画笔</span>
        </button>
        <button
          class="wb-tool"
          :class="{ on: tool === 'arrow' }"
          type="button"
          @click="chooseTool('arrow')"
        >
          <span class="ring"><AppIcon name="arrow" :size="20" /></span>
          <span>箭头</span>
        </button>
        <button
          class="wb-tool"
          :class="{ on: tool === 'eraser' }"
          type="button"
          @click="tool = 'eraser'"
        >
          <span class="ring"><AppIcon name="eraser" :size="20" /></span>
          <span>橡皮擦</span>
        </button>
        <button class="wb-tool" type="button" @click="clearPage">
          <span class="ring"><AppIcon name="trash" :size="20" /></span>
          <span>清空</span>
        </button>
        <button class="wb-tool" type="button" @click="save">
          <span class="ring"><AppIcon name="download" :size="20" /></span>
          <span>保存</span>
        </button>
      </div>
    </div>
  </div>
</template>
