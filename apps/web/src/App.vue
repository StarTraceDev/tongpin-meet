<script setup lang="ts">
import { useTheme } from '@tongpin/theme'

// 初始化主题核心：与 index.html 的防闪烁脚本衔接，后续 mode 变化由它维护 data-theme/.dark
useTheme()
</script>

<template>
  <router-view />
</template>
