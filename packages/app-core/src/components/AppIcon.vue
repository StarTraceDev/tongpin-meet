<script setup lang="ts">
import { computed } from 'vue'

import { ICON_STROKE_WIDTH, ICONS, type IconName } from './icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
    /** 设计稿个别图标要更粗/更细，例如 i-check 2.4、i-inbox 1.4 */
    strokeWidth?: number
  }>(),
  { size: 20, strokeWidth: ICON_STROKE_WIDTH },
)

const shapes = computed(() => ICONS[props.name])
</script>

<template>
  <svg
    class="tp-icon"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="props.strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-for="(shape, index) in shapes" :key="index">
      <path v-if="shape.tag === 'path'" :d="shape.d" />
      <rect
        v-else-if="shape.tag === 'rect'"
        :x="shape.x"
        :y="shape.y"
        :width="shape.width"
        :height="shape.height"
        :rx="shape.rx"
      />
      <circle v-else :cx="shape.cx" :cy="shape.cy" :r="shape.r" />
    </template>
  </svg>
</template>

<style scoped>
.tp-icon {
  display: block;
  flex: none;
}
</style>
