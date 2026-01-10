<script setup lang="ts">
import { computed, provide } from 'vue'

import { SUB_WINDOW_KEY } from './context'
import { resolveSubWindowComponent } from './registry'
import type { SubWindowOverrides, SubWindowRequest } from './routes'

const props = defineProps<{
  request: SubWindowRequest
  overrides?: SubWindowOverrides
}>()

provide(SUB_WINDOW_KEY, props.request.key)

const panel = computed(() => resolveSubWindowComponent(props.request.key, props.overrides))
</script>

<template>
  <component :is="panel" :payload="request.payload" />
</template>
