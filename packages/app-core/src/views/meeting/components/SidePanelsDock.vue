<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
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

/** 多面板沿用 OA 的 SidePanel：选中 tab 占 50% 白底，其余平分剩余宽度，内容区只渲染选中面板 */
const width = computed<number>(
  () => PANEL_SPECS[panels.active ?? visible.value[0] ?? 'members'].width,
)

function titleOf(key: SidePanelKey): string {
  return key === 'members'
    ? `${PANEL_SPECS[key].title} (${String(participants.count)})`
    : PANEL_SPECS[key].title
}
</script>

<template>
  <aside class="side-dock" :style="{ width: `${width}px` }">
    <template v-if="isMulti">
      <div class="dock-tabs">
        <button
          v-for="key in visible"
          :key="key"
          type="button"
          class="dock-tab"
          :class="{ on: key === panels.active }"
          @click="panels.activate(key)"
        >
          <AppIcon :name="PANEL_SPECS[key].icon" :size="16" />
          <span class="dock-tab-title">{{ titleOf(key) }}</span>
          <span v-if="key === panels.active" class="dock-tab-actions">
            <button
              type="button"
              class="dock-act"
              title="脱离为独立窗口"
              @click.stop="emit('detach', key)"
            >
              <AppIcon name="detach" :size="15" />
            </button>
            <button type="button" class="dock-act" title="关闭面板" @click.stop="panels.close(key)">
              <AppIcon name="x" :size="15" />
            </button>
          </span>
        </button>
      </div>
      <div class="dock-body">
        <PanelContent v-if="panels.active !== null" :panel="panels.active" />
      </div>
    </template>

    <SidePanel
      v-else-if="visible.length === 1 && visible[0] !== undefined"
      :title="titleOf(visible[0])"
      :icon="PANEL_SPECS[visible[0]].icon"
      :active="true"
      :width="width"
      @close="panels.close(visible[0])"
      @detach="emit('detach', visible[0])"
    >
      <PanelContent :panel="visible[0]" />
    </SidePanel>
  </aside>
</template>
