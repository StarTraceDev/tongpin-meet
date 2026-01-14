<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import { useParticipantsStore } from '../../../stores/participants'

const participants = useParticipantsStore()

const rows = computed(() => participants.participants)
const tab = ref<'members' | 'apply'>('members')

function muteAll(mute: boolean): void {
  participants.setAllMic(!mute)
  ElMessage.success(mute ? '已开启全体静音' : '已解除全体静音')
}
</script>

<template>
  <div class="panel-scroll">
    <div class="panel-tabs">
      <button
        class="panel-tab"
        :class="{ on: tab === 'members' }"
        type="button"
        @click="tab = 'members'"
      >
        成员
      </button>
      <button
        class="panel-tab"
        :class="{ on: tab === 'apply' }"
        type="button"
        @click="tab = 'apply'"
      >
        申请
      </button>
    </div>

    <p v-if="tab === 'apply'" class="panel-empty">暂无待处理的申请</p>

    <ul v-else class="member-list">
      <li v-for="item in rows" :key="item.id" class="member-row">
        <span
          class="member-avatar"
          :class="{ host: item.role === 'HOST' || item.role === 'COHOST' }"
        />
        <span class="member-name">{{ item.name }}</span>
        <span v-if="item.role === 'HOST'" class="member-tag">主持人</span>
        <span class="member-spacer" />
        <AppIcon class="member-mic" :name="item.micOn ? 'mic' : 'mic-off'" :size="18" />
        <button class="member-more" type="button" title="更多">
          <AppIcon name="more" :size="18" />
        </button>
      </li>
    </ul>
  </div>

  <footer class="panel-foot">
    <button class="panel-btn" type="button" @click="muteAll(true)">开启全体静音</button>
    <button class="panel-btn primary" type="button" @click="muteAll(false)">解除全体静音</button>
  </footer>
</template>
