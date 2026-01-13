<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import type { SidePanelKey } from '../../../stores/panels'
import ChatPanel from './ChatPanel.vue'
import MembersPanel from './MembersPanel.vue'
import { PANEL_SPECS } from './spec'

const props = defineProps<{ panel: SidePanelKey }>()

const spec = computed(() => PANEL_SPECS[props.panel])
</script>

<template>
  <MembersPanel v-if="panel === 'members'" />
  <ChatPanel v-else-if="panel === 'chat'" />
  <div v-else class="panel-empty">
    <AppIcon :name="spec.icon" :size="32" />
    <p>{{ spec.title }}面板将在后续步骤接入</p>
  </div>
</template>
