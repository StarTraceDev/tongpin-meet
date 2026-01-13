<script setup lang="ts">
import { computed, inject } from 'vue'

import type { SubWindowKey } from '@tongpin/platform'

import AppIcon from '../components/AppIcon.vue'
import { usePlatform } from '../platform'
import PanelContent from '../views/meeting/panels/PanelContent.vue'
import { PANEL_BY_SUBWINDOW, PANEL_SPECS } from '../views/meeting/panels/spec'
import { SUB_WINDOW_KEY } from './context'

const platform = usePlatform()
const subKey = inject<SubWindowKey>(SUB_WINDOW_KEY, 'panelChat')

const panel = computed(() => PANEL_BY_SUBWINDOW[subKey])
const title = computed<string>(() =>
  panel.value === undefined ? '面板' : PANEL_SPECS[panel.value].title,
)

function close(): void {
  void platform.window.closeSub(subKey)
}
</script>

<template>
  <div class="panel-window">
    <header class="panel-window-head">
      <AppIcon
        v-if="panel !== undefined"
        class="pw-ic"
        :name="PANEL_SPECS[panel].icon"
        :size="18"
      />
      <span class="pw-title">{{ title }}</span>
      <button class="pw-btn" type="button" title="关闭" @click="close">
        <AppIcon name="x" :size="16" />
      </button>
    </header>
    <div class="panel-window-body">
      <PanelContent v-if="panel !== undefined" :panel="panel" />
      <p v-else class="pw-empty">该面板尚未接入</p>
    </div>
  </div>
</template>
