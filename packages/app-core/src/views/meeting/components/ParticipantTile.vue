<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import type { MeetingParticipant } from '../../../stores/participants'

const props = withDefaults(
  defineProps<{
    participant: MeetingParticipant
    /** stage = 主画面（深色姓名条 + 渐变底），grid = 宫格小瓦片 */
    variant?: 'stage' | 'grid'
  }>(),
  { variant: 'grid' },
)

const isHost = computed(
  () => props.participant.role === 'HOST' || props.participant.role === 'COHOST',
)
const micIcon = computed(() => (props.participant.micOn ? 'mic' : 'mic-off'))
</script>

<template>
  <div
    v-if="variant === 'grid'"
    class="gtile"
    :class="{ speak: participant.speaking }"
    :data-participant="participant.id"
  >
    <div class="pic" :class="{ host: isHost }" />
    <div class="lbl">
      <AppIcon :name="micIcon" :size="11" />
      <span>{{ participant.name }}</span>
    </div>
  </div>

  <div v-else class="stage-tile" :data-participant="participant.id">
    <div class="stage-fill" />
    <div class="namebar">
      <span v-if="isHost" class="host">主</span>
      <AppIcon class="mic" :name="micIcon" :size="18" />
      <span>{{ participant.name }}</span>
    </div>
  </div>
</template>
