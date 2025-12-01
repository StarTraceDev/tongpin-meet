<script setup lang="ts">
import { useTheme } from '@tongpin/theme/vue'

// 防闪烁脚本只管首帧，主题核心在这里初始化（PROGRESS §4 #28）
useTheme()
</script>

<template>
  <RouterView />
</template>
