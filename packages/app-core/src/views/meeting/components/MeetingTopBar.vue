<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'

defineProps<{
  /** 顶栏左侧显示的会议开始时间 HH:mm */
  startTime: string
  /** 居中计时器 mm:ss */
  elapsed: string
}>()

defineEmits<{ detail: []; fullscreen: [] }>()
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
      <button class="hbtn" type="button" title="布局">
        <AppIcon name="grid" :size="20" />
      </button>
      <button class="hbtn" type="button" title="设置">
        <AppIcon name="settings" :size="18" />
      </button>
      <button class="hbtn" type="button" title="全屏" @click="$emit('fullscreen')">
        <AppIcon name="expand" :size="18" />
      </button>
    </div>
  </header>
</template>
