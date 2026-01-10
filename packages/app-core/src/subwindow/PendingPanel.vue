<script setup lang="ts">
import { SUB_WINDOW_SPECS } from '@tongpin/platform'
import { computed, inject } from 'vue'

import { SUB_WINDOW_KEY } from './context'

const key = inject(SUB_WINDOW_KEY, null)
const title = computed(() => (key === null ? '面板' : SUB_WINDOW_SPECS[key].title))
</script>

<template>
  <div class="pending-panel">
    <header class="sub-title">{{ title }}</header>
    <p class="pending-hint">该面板将在后续步骤（M13-3 起）接入。</p>
  </div>
</template>

<style scoped>
.pending-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--tp-canvas);
}

.sub-title {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  height: 36px;
  font-size: 18px;
  font-weight: 500;
  color: var(--tp-text-title);
  -webkit-app-region: drag;
}

.pending-hint {
  margin: 24px;
  font-size: 13px;
  color: var(--tp-text-tertiary);
}
</style>
