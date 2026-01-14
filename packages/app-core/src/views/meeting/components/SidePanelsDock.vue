<script setup lang="ts">
import { computed } from 'vue'

import { useParticipantsStore } from '../../../stores/participants'
import { usePanelsStore, type SidePanelKey } from '../../../stores/panels'
import PanelContent from '../panels/PanelContent.vue'
import { PANEL_SPECS } from '../panels/spec'
import SidePanel from './SidePanel.vue'

const panels = usePanelsStore()
const participants = useParticipantsStore()

const emit = defineEmits<{ detach: [key: SidePanelKey] }>()

const visible = computed<SidePanelKey[]>(() => panels.visible)
const isMulti = computed<boolean>(() => visible.value.length > 1)

/** 单面板按各自宽度占满（成员 400 / 聊天 380）；多面板时选中项 50%（200），其余平分剩下的 200 */
function widthOf(key: SidePanelKey): number {
  if (!isMulti.value) return PANEL_SPECS[key].width
  if (key === panels.active) return 200
  const others = visible.value.length - 1
  return Math.floor(200 / Math.max(others, 1))
}

function titleOf(key: SidePanelKey): string {
  return key === 'members'
    ? `${PANEL_SPECS[key].title} (${String(participants.count)})`
    : PANEL_SPECS[key].title
}
</script>

<template>
  <aside class="side-dock">
    <SidePanel
      v-for="key in visible"
      :key="key"
      :title="titleOf(key)"
      :icon="PANEL_SPECS[key].icon"
      :active="key === panels.active"
      :width="widthOf(key)"
      @activate="panels.activate(key)"
      @close="panels.close(key)"
      @detach="emit('detach', key)"
    >
      <PanelContent :panel="key" />
    </SidePanel>
  </aside>
</template>
