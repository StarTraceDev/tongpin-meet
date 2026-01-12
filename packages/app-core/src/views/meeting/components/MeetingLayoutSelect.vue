<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import {
  LAYOUT_OPTIONS,
  LAYOUT_L_MIN_MEMBER,
  type LayoutPreference,
  type LayoutOption,
} from '../composables/useMeetingLayout'

const props = defineProps<{
  modelValue: LayoutPreference
  memberCount: number
}>()

const emit = defineEmits<{
  select: [value: Exclude<LayoutPreference, null>]
  close: []
}>()

const root = ref<HTMLElement | null>(null)

function isDisabled(option: LayoutOption): boolean {
  return option.minMember !== undefined && props.memberCount < option.minMember
}

function pick(option: LayoutOption): void {
  if (isDisabled(option)) return
  emit('select', option.value)
}

function onDocumentClick(event: MouseEvent): void {
  if (root.value !== null && !root.value.contains(event.target as Node)) emit('close')
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentClick)
})
</script>

<template>
  <div ref="root" class="layout-pop" role="menu">
    <button
      v-for="option in LAYOUT_OPTIONS"
      :key="option.value"
      type="button"
      class="layout-opt"
      :class="{ on: modelValue === option.value, off: isDisabled(option) }"
      role="menuitem"
      :aria-disabled="isDisabled(option)"
      @click="pick(option)"
    >
      <div v-if="option.value === 'grid9'" class="pv">
        <div class="p-grid">
          <i v-for="n in 9" :key="n" />
        </div>
      </div>

      <div v-else-if="option.value === 'speakerRight'" class="pv">
        <div class="p-main" />
        <div class="p-side">
          <i v-for="n in 4" :key="n" />
        </div>
      </div>

      <div v-else-if="option.value === 'speakerTop'" class="pv vertical">
        <div class="p-top">
          <i v-for="n in 4" :key="n" />
        </div>
        <div class="p-main" />
      </div>

      <div v-else-if="option.value === 'layoutLTop'" class="pv vertical">
        <div class="p-top">
          <i v-for="n in 5" :key="n" />
        </div>
        <div class="p-row">
          <div class="p-main" />
          <div class="p-side">
            <i v-for="n in 2" :key="n" />
          </div>
        </div>
      </div>

      <div v-else class="pv vertical">
        <div class="p-row">
          <div class="p-main" />
          <div class="p-side">
            <i v-for="n in 2" :key="n" />
          </div>
        </div>
        <div class="p-top">
          <i v-for="n in 5" :key="n" />
        </div>
      </div>

      <span>{{ option.label }}</span>
      <span v-if="isDisabled(option)" class="layout-tip">
        此布局需要在{{ LAYOUT_L_MIN_MEMBER }}人及以上成员时使用
      </span>
    </button>
  </div>
</template>
