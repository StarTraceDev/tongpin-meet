<script setup lang="ts">
import type { IconName } from '../../../components/icons'
import PanelHeader from './PanelHeader.vue'

defineProps<{
  title: string
  icon: IconName
  active: boolean
  width: number
}>()

defineEmits<{ activate: []; close: []; detach: [] }>()
</script>

<template>
  <!-- 三态里的「停靠」形态：单面板占 400，多面板选中占一半、未选中平分（D15/D16） -->
  <section
    class="side-panel"
    :class="{ active }"
    :style="{ width: `${String(width)}px` }"
    @click="$emit('activate')"
  >
    <PanelHeader
      :title="title"
      :icon="icon"
      :active="active"
      @close="$emit('close')"
      @detach="$emit('detach')"
    />
    <div v-if="active" class="panel-body">
      <slot />
    </div>
  </section>
</template>
