<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import type { IconName } from '../../../components/icons'

defineProps<{
  title: string
  icon: IconName
  /** 选中/单面板态才显示操作按钮，未选中的窄条只有标题（D16） */
  active: boolean
}>()

defineEmits<{ close: []; detach: [] }>()
</script>

<template>
  <header class="panel-head">
    <AppIcon class="ph-ic" :name="icon" :size="18" />
    <span class="ph-title">{{ title }}</span>
    <div v-if="active" class="ph-actions">
      <button class="ph-btn" type="button" title="脱离为独立窗口" @click.stop="$emit('detach')">
        <AppIcon name="detach" :size="16" />
      </button>
      <button class="ph-btn" type="button" title="关闭面板" @click.stop="$emit('close')">
        <AppIcon name="x" :size="16" />
      </button>
    </div>
  </header>
</template>
