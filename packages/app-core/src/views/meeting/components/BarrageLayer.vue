<script setup lang="ts">
import { useChatStore } from '../../../stores/chat'

/** 弹幕层：和聊天面板同一份消息派生（10-M13 M13-4），只显示最近三条 */
const chat = useChatStore()
</script>

<template>
  <div v-if="chat.barrageOn && chat.recent.length > 0" class="barrage">
    <div v-for="message in chat.recent" :key="message.id" class="barrage-item">
      <b>{{ message.self ? '我' : message.senderName }}：</b>{{ message.text }}
    </div>
  </div>
</template>
