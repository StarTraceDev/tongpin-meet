<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import type { SidePanelKey } from '../../../stores/panels'
import AssistantPanel from './AssistantPanel.vue'
import BreakPanel from './BreakPanel.vue'
import ChatPanel from './ChatPanel.vue'
import CheckInPanel from './CheckInPanel.vue'
import MembersPanel from './MembersPanel.vue'
import MinutesPanel from './MinutesPanel.vue'
import VotePanel from './VotePanel.vue'
import { PANEL_SPECS } from './spec'

const props = defineProps<{ panel: SidePanelKey }>()

const spec = computed(() => PANEL_SPECS[props.panel])
</script>

<template>
  <MembersPanel v-if="panel === 'members'" />
  <ChatPanel v-else-if="panel === 'chat'" />
  <CheckInPanel v-else-if="panel === 'checkin'" />
  <VotePanel v-else-if="panel === 'vote'" />
  <BreakPanel v-else-if="panel === 'break'" />
  <MinutesPanel v-else-if="panel === 'minutes'" />
  <AssistantPanel v-else-if="panel === 'intelligence'" />
  <div v-else class="panel-empty">
    <AppIcon :name="spec.icon" :size="32" />
    <p>{{ spec.title }}面板将在后续步骤接入</p>
  </div>
</template>
