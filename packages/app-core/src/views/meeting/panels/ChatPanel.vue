<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'

/** M13-3 只立面板骨架；消息流与发送在 M13-4 接入 */
const placeholder = '输入消息，按回车发送'
</script>

<template>
  <div class="panel-scroll chat-panel">
    <p class="chat-empty">聊天将在 M13-4 接入</p>
  </div>
  <footer class="chat-foot">
    <div class="chat-tools">
      <AppIcon name="emoji" :size="18" />
      <AppIcon name="file" :size="18" />
    </div>
    <p class="chat-field">{{ placeholder }}</p>
  </footer>
</template>
