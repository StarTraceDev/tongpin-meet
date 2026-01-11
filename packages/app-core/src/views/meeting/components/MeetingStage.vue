<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'

withDefaults(
  defineProps<{
    name: string
    isHost?: boolean
    micOn?: boolean
  }>(),
  { isHost: false, micOn: true },
)
</script>

<template>
  <!-- M13-1：视频墙占位（M13-2 换成 ParticipantTile / VideoGrid），保留 D12 的渐变与姓名条 -->
  <div class="room-stage">
    <div class="stage-fill" />
    <div class="namebar">
      <span v-if="isHost" class="host">主</span>
      <AppIcon class="mic" :name="micOn ? 'mic' : 'mic-off'" :size="18" />
      <span>{{ name }}</span>
    </div>
  </div>
</template>
