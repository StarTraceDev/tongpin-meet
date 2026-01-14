<script setup lang="ts">
import { ref } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  micOn: boolean
  cameraOn: boolean
  memberCount: number
  barrageOn: boolean
  unread: number
}>()

const emit = defineEmits<{
  'toggle-mic': []
  'toggle-camera': []
  'toggle-barrage': []
  'send-chat': [text: string]
  share: []
  members: []
  chat: []
  more: []
  end: []
}>()

const draft = ref('')

/** 胶囊里的输入框回车直接发弹幕+聊天，空串不发 */
function submit(): void {
  const text = draft.value.trim()
  if (text === '') return
  emit('send-chat', text)
  draft.value = ''
}

const badge = (count: number): string => (count > 9 ? '9+' : String(count))
</script>

<template>
  <footer class="room-bar">
    <div class="chat-capsule" role="button" tabindex="0" @click="$emit('chat')">
      <button
        class="bar"
        :class="{ on: props.barrageOn }"
        type="button"
        :title="props.barrageOn ? '关闭弹幕' : '开启弹幕'"
        @click.stop="$emit('toggle-barrage')"
      >
        <AppIcon name="barrage" :size="18" />
      </button>
      <span class="pipe">｜</span>
      <AppIcon class="emo" name="emoji" :size="20" />
      <input
        v-model="draft"
        class="field"
        type="text"
        placeholder="说点什么..."
        @click.stop
        @keyup.enter="submit"
      />
    </div>

    <div class="room-actions">
      <button class="tool lg" type="button" @click="$emit('toggle-mic')">
        <span class="ring">
          <AppIcon class="ic" :name="micOn ? 'mic' : 'mic-off'" :size="36" />
          <span v-if="micOn" class="level" />
        </span>
        <span>{{ micOn ? '静音' : '解除静音' }}</span>
      </button>
      <button class="tool lg" type="button" @click="$emit('toggle-camera')">
        <span class="ring">
          <AppIcon class="ic" :name="cameraOn ? 'video' : 'cam-off'" :size="36" />
        </span>
        <span>{{ cameraOn ? '关闭视频' : '开启视频' }}</span>
      </button>
      <button class="tool" type="button" @click="$emit('share')">
        <span class="ring"><AppIcon class="ic" name="monitor" :size="28" /></span>
        <span>共享屏幕</span>
      </button>
      <button class="tool" type="button" @click="$emit('members')">
        <span class="ring"><AppIcon class="ic" name="users" :size="28" /></span>
        <span>管理成员({{ memberCount }})</span>
      </button>
      <button class="tool" type="button" @click="$emit('chat')">
        <span class="ring">
          <AppIcon class="ic" name="msg" :size="28" />
          <span v-if="props.unread > 0" class="badge">{{ badge(props.unread) }}</span>
        </span>
        <span>聊天</span>
      </button>
      <button class="tool xs" type="button" @click="$emit('more')">
        <span class="ring"><AppIcon class="ic" name="more" :size="24" :stroke-width="3" /></span>
        <span>更多</span>
      </button>
    </div>

    <button class="tool danger" type="button" @click="$emit('end')">
      <span class="ring"><AppIcon class="ic" name="phone-off" :size="26" /></span>
      <span>结束会议</span>
    </button>
  </footer>
</template>
