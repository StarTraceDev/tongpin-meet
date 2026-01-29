<script setup lang="ts">
import { useTheme } from '@tongpin/theme/vue'
import { computed } from 'vue'

import WebDesktop from './layouts/WebDesktop.vue'
import { usePlatform } from './platform'

// 防闪烁脚本只管首帧，主题核心在这里初始化（PROGRESS §4 #28）
useTheme()

const platform = usePlatform()
/** Web 端没有系统窗口，用桌面外壳包一层 1100×600 可拖动的窗口 */
const isWeb = computed(() => platform.kind === 'web')
</script>

<template>
  <WebDesktop v-if="isWeb" />
  <RouterView v-else />
</template>
