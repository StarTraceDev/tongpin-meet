<script setup lang="ts">
import type { MeetingParticipant } from '../../../stores/participants'
import type { LayoutMode } from '../composables/useMeetingLayout'
import BarrageLayer from './BarrageLayer.vue'
import VideoGrid from './VideoGrid.vue'

defineProps<{
  participants: MeetingParticipant[]
  layout: LayoutMode
}>()
</script>

<template>
  <!-- 视频区：布局在这里切，瓦片只负责画自己那一份 store 状态 -->
  <div class="room-stage">
    <BarrageLayer />
    <VideoGrid :participants="participants" :layout="layout" />
  </div>
</template>
