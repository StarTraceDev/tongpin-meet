<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import { useParticipantsStore } from '../../../stores/participants'

const participants = useParticipantsStore()

const rows = computed(() => participants.participants)
</script>

<template>
  <div class="panel-scroll">
    <div class="panel-tabs">
      <span class="panel-tab on">成员</span>
      <span class="panel-tab">申请</span>
    </div>

    <ul class="member-list">
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
    <button class="panel-btn" type="button" title="成员管理将在 M13-4 接入">开启全体静音</button>
    <button class="panel-btn primary" type="button" title="成员管理将在 M13-4 接入">
      解除全体静音
    </button>
  </footer>
</template>
