<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'

import {
  listParticipants,
  muteAll as muteAllApi,
  muteParticipant,
  removeParticipant,
} from '../../../apis/participant'
import AppIcon from '../../../components/AppIcon.vue'
import { useParticipantsStore } from '../../../stores/participants'
import { usePanelContext } from './panelContext'

const participants = useParticipantsStore()
const ctx = usePanelContext()

const rows = computed(() => participants.participants)
const tab = ref<'members' | 'apply'>('members')
const menuFor = ref<string | null>(null)

const meetingId = computed(() => ctx.meetingId())
const isHost = computed(() => ctx.isHost())
const selfId = computed(() => participants.selfId)

async function refresh(): Promise<void> {
  if (meetingId.value === '') return
  try {
    const list = await listParticipants(meetingId.value)
    participants.syncFromServer(list.items)
  } catch {
    ElMessage.error('成员列表刷新失败，请稍后重试')
  }
}

async function toggleMic(id: string, micOn: boolean): Promise<void> {
  if (meetingId.value === '') return
  try {
    await muteParticipant(meetingId.value, id, micOn)
    await refresh()
  } catch {
    ElMessage.error('操作失败，请确认你有主持人权限')
  }
}

async function kick(id: string): Promise<void> {
  if (meetingId.value === '') return
  menuFor.value = null
  try {
    await removeParticipant(meetingId.value, id)
    await refresh()
    ElMessage.success('已移出会议')
  } catch {
    ElMessage.error('移出失败，请确认你有主持人权限')
  }
}

async function muteAll(mute: boolean): Promise<void> {
  if (meetingId.value === '') return
  try {
    await muteAllApi(meetingId.value, mute)
    participants.setAllMic(!mute)
    ElMessage.success(mute ? '已开启全体静音' : '已解除全体静音')
  } catch {
    ElMessage.error('操作失败，请确认你有主持人权限')
  }
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
        <button
          v-if="isHost && item.id !== selfId"
          class="member-mic-btn"
          type="button"
          :title="item.micOn ? '静音该成员' : '解除静音'"
          @click="toggleMic(item.id, item.micOn)"
        >
          <AppIcon class="member-mic" :name="item.micOn ? 'mic' : 'mic-off'" :size="18" />
        </button>
        <AppIcon v-else class="member-mic" :name="item.micOn ? 'mic' : 'mic-off'" :size="18" />
        <div v-if="isHost && item.id !== selfId" class="member-more-wrap">
          <button class="member-more" type="button" title="更多" @click="menuFor = item.id">
            <AppIcon name="more" :size="18" />
          </button>
          <div v-if="menuFor === item.id" class="member-menu">
            <button type="button" class="member-menu-item" @click="kick(item.id)">移出会议</button>
          </div>
        </div>
      </li>
    </ul>
  </div>

  <footer class="panel-foot">
    <button class="panel-btn" type="button" :disabled="!isHost" @click="muteAll(true)">
      开启全体静音
    </button>
    <button class="panel-btn primary" type="button" :disabled="!isHost" @click="muteAll(false)">
      解除全体静音
    </button>
  </footer>
</template>
