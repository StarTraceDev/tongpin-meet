<script setup lang="ts">
import { ref } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import type { LayoutMode, LayoutPreference } from '../composables/useMeetingLayout'
import MeetingLayoutSelect from './MeetingLayoutSelect.vue'

const props = defineProps<{
  /** 顶栏左侧显示的会议开始时间 HH:mm */
  startTime: string
  /** 居中计时器 mm:ss */
  elapsed: string
  layoutMode: LayoutMode
  memberCount: number
}>()

const emit = defineEmits<{
  detail: []
  fullscreen: []
  'select-layout': [value: Exclude<LayoutPreference, null>]
}>()

const layoutOpen = ref(false)

function toggleLayout(): void {
  layoutOpen.value = !layoutOpen.value
}

function selectLayout(value: Exclude<LayoutPreference, null>): void {
  emit('select-layout', value)
  layoutOpen.value = false
}

/** 选择器高亮项：solo 时没有选中项（单人态不入选项） */
const currentPreference = (): LayoutPreference =>
  props.layoutMode === 'solo' ? null : props.layoutMode
</script>

<template>
  <header class="room-top">
    <div class="lead">
      <AppIcon class="logo" name="video" :size="18" />
      <button class="mbtn" type="button" @click="$emit('detail')">会议详情</button>
      <span>{{ startTime }}</span>
      <button class="hbtn" type="button" title="网络质量">
        <AppIcon name="signal" :size="16" />
      </button>
      <button class="hbtn" type="button" title="邀请">
        <AppIcon name="forward" :size="16" />
      </button>
    </div>
    <div class="timer">{{ elapsed }}</div>
    <div class="right">
      <div class="layout-anchor">
        <button
          class="hbtn"
          :class="{ hover: layoutOpen }"
          type="button"
          title="布局"
          @click="toggleLayout"
        >
          <AppIcon name="grid" :size="20" />
        </button>
        <MeetingLayoutSelect
          v-if="layoutOpen"
          :model-value="currentPreference()"
          :member-count="memberCount"
          @select="selectLayout"
          @close="layoutOpen = false"
        />
      </div>
      <button class="hbtn" type="button" title="设置">
        <AppIcon name="settings" :size="18" />
      </button>
      <button class="hbtn" type="button" title="全屏" @click="$emit('fullscreen')">
        <AppIcon name="expand" :size="18" />
      </button>
    </div>
  </header>
</template>
