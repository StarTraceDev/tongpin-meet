<script setup lang="ts">
import type { SidePanelKey } from '../../../stores/panels'
import type { IconName } from '../../../components/icons'

import AppIcon from '../../../components/AppIcon.vue'

defineProps<{ voteCount: number }>()

type MorePick = SidePanelKey | 'recording'

const emit = defineEmits<{ pick: [panel: MorePick]; close: [] }>()

interface Item {
  key: MorePick
  label: string
  icon: IconName
}

const items: Item[] = [
  { key: 'intelligence', label: '智能助手', icon: 'zap' },
  { key: 'minutes', label: '会议纪要', icon: 'file' },
  { key: 'files', label: '会议文件', icon: 'download' },
  { key: 'vote', label: '投票', icon: 'chart' },
  { key: 'break', label: '休息一下', icon: 'clock' },
  { key: 'checkin', label: '签到', icon: 'check' },
  { key: 'recording', label: '会议录制', icon: 'record' },
]
</script>

<template>
  <div class="more-menu" @click.stop>
    <button
      v-for="item in items"
      :key="item.key"
      class="more-item"
      type="button"
      @click="emit('pick', item.key)"
    >
      <AppIcon :name="item.icon" :size="18" />
      <span
        >{{ item.label
        }}<template v-if="item.key === 'vote' && voteCount > 0"> ({{ voteCount }})</template></span
      >
    </button>
  </div>
</template>
