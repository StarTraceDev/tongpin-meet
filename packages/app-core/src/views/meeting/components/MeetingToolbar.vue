<script setup lang="ts">
import { ref } from 'vue'

import type { SidePanelKey } from '../../../stores/panels'

import AppIcon from '../../../components/AppIcon.vue'
import MoreMenu from './MoreMenu.vue'

type MorePick = SidePanelKey | 'recording' | 'whiteboard'

const props = defineProps<{
  micOn: boolean
  cameraOn: boolean
  memberCount: number
  barrageOn: boolean
  unread: number
  voteCount: number
  shareActive?: boolean
}>()

const emit = defineEmits<{
  'toggle-mic': []
  'toggle-camera': []
  'toggle-barrage': []
  'send-chat': [text: string]
  share: []
  members: []
  chat: []
  'open-panel': [panel: MorePick]
  end: []
}>()

const draft = ref('')
const moreOpen = ref(false)

function pickPanel(panel: MorePick): void {
  moreOpen.value = false
  emit('open-panel', panel)
}

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
      <button class="tool" :class="{ on: props.shareActive }" type="button" @click="$emit('share')">
        <span class="ring"><AppIcon class="ic" name="monitor" :size="28" /></span>
        <span>{{ props.shareActive ? '停止共享' : '共享屏幕' }}</span>
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
      <div class="more-anchor">
        <button class="tool xs" type="button" @click="moreOpen = !moreOpen">
          <span class="ring"><AppIcon class="ic" name="more" :size="24" :stroke-width="3" /></span>
          <span>更多</span>
        </button>
        <MoreMenu
          v-if="moreOpen"
          class="more-pop"
          :vote-count="props.voteCount"
          @pick="pickPanel"
          @close="moreOpen = false"
        />
      </div>
    </div>

    <button class="tool danger" type="button" @click="$emit('end')">
      <span class="ring"><AppIcon class="ic" name="phone-off" :size="26" /></span>
      <span>结束会议</span>
    </button>
  </footer>
</template>
