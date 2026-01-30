<script setup lang="ts">
import { computed, provide } from 'vue'

import { PANEL_CONTEXT } from '../views/meeting/panels/panelContext'
import { SUB_WINDOW_KEY } from './context'
import { resolveSubWindowComponent } from './registry'
import type { SubWindowOverrides, SubWindowRequest } from './routes'

const props = defineProps<{
  request: SubWindowRequest
  overrides?: SubWindowOverrides
}>()

provide(SUB_WINDOW_KEY, props.request.key)

const payload = computed<Record<string, unknown>>(() =>
  typeof props.request.payload === 'object' && props.request.payload !== null
    ? (props.request.payload as Record<string, unknown>)
    : {},
)

// 只有面板子窗才带 isHost；会议室窗口要从 meeting store 读主持人身份
const panelPayload = computed(
  () => props.request.key !== 'meeting' && typeof payload.value.isHost === 'boolean',
)

if (panelPayload.value) {
  provide(PANEL_CONTEXT, {
    get meetingId(): string {
      const value = payload.value.meetingId
      return typeof value === 'string' ? value : ''
    },
    get isHost(): boolean {
      return payload.value.isHost === true
    },
  })
}

const panel = computed(() => resolveSubWindowComponent(props.request.key, props.overrides))
</script>

<template>
  <component :is="panel" :payload="request.payload" />
</template>
