<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AppIcon from '../components/AppIcon.vue'
import { listRecordings, type RecordingItem } from '../apis/recording'

const items = ref<RecordingItem[]>([])
const keyword = ref('')
const activeId = ref<string | null>(null)

onMounted(() => {
  void (async (): Promise<void> => {
    items.value = await listRecordings()
    activeId.value = items.value[0]?.id ?? null
  })()
})

const visible = computed(() => {
  const word = keyword.value.trim()
  if (word === '') return items.value
  return items.value.filter((item) => item.title.includes(word))
})

const active = computed(() => items.value.find((item) => item.id === activeId.value) ?? null)
</script>

<template>
  <div class="recordings">
    <section class="rec-left">
      <h1 class="page-title">录制</h1>
      <label class="search-box">
        <AppIcon name="search" :size="16" />
        <input v-model="keyword" type="search" placeholder="搜索" />
      </label>
      <div class="rec-tabs">
        <span class="rec-tab on">最近</span>
      </div>

      <div class="rec-list">
        <button
          v-for="item in visible"
          :key="item.id"
          class="rec-row"
          :class="{ on: item.id === activeId }"
          type="button"
          @click="activeId = item.id"
        >
          <span class="rec-thumb">
            <AppIcon name="play" :size="18" />
          </span>
          <span class="rec-main">
            <span class="rec-title">{{ item.title }}</span>
            <span class="rec-time">{{ item.startedAt }}</span>
          </span>
          <span class="rec-expire">
            <span class="rec-expire-label">失效时间</span>
            <span class="rec-expire-value">{{ item.expiresIn }}</span>
          </span>
        </button>

        <p v-if="visible.length === 0" class="rec-empty">还没有录制文件</p>
      </div>
    </section>

    <section class="rec-right">
      <header class="rec-head">录制详情</header>

      <div v-if="active !== null" class="rec-detail">
        <div class="player">
          <div class="player-stage">
            <span class="player-badge">录制回放</span>
          </div>
          <div class="player-bar">
            <button class="player-btn" type="button" title="播放">
              <AppIcon name="play" :size="16" />
            </button>
            <span class="player-time">0:00 / {{ active.duration }}</span>
            <span class="player-track"><i /></span>
            <button class="player-btn" type="button" title="音量">
              <AppIcon name="volume" :size="16" />
            </button>
            <button class="player-btn" type="button" title="全屏">
              <AppIcon name="expand" :size="16" />
            </button>
          </div>
        </div>

        <h2 class="rec-name">{{ active.title }}</h2>
        <p class="rec-meta">{{ active.startedAt }}</p>

        <div class="rec-tabs detail-tabs">
          <span class="rec-tab on">会议记录</span>
        </div>
        <div class="detail-empty">
          <span class="empty-art"><AppIcon name="inbox" :size="64" :stroke-width="1.3" /></span>
          <p>暂无会议记录</p>
        </div>
      </div>

      <div v-else class="rec-placeholder">
        <span class="empty-art"><AppIcon name="inbox" :size="76" :stroke-width="1.2" /></span>
        <p>选择左侧录制查看详情</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.recordings {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--tp-canvas);
}

.rec-left {
  display: flex;
  flex: none;
  flex-direction: column;
  width: 340px;
  padding: 38px 16px 0;
  border-right: 1px solid var(--tp-border);
}

.page-title {
  margin: 0 0 14px;
  color: var(--tp-text-title);
  font-size: 20px;
  font-weight: 600;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  color: var(--tp-text-placeholder);
}

.search-box input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 13px;
}

.rec-tabs {
  display: flex;
  gap: 22px;
  margin-top: 14px;
  border-bottom: 1px solid var(--tp-border-light);
}

.rec-tab {
  position: relative;
  padding: 6px 0 12px;
  color: var(--tp-text-secondary);
  font-size: 13px;
}

.rec-tab.on {
  color: var(--tp-brand);
  font-weight: 500;
}

.rec-tab.on::after {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 18px;
  height: 3px;
  border-radius: 2px;
  background: var(--tp-brand);
  content: '';
  transform: translateX(-50%);
}

.rec-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 0 16px;
}

.rec-row {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--tp-radius-m);
  background: var(--tp-fill);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.rec-row.on {
  border-color: var(--tp-brand);
  background: var(--tp-canvas);
}

.rec-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 60px;
  height: 40px;
  border-radius: 4px;
  background: #2b2b2b;
  color: #fff;
}

.rec-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.rec-title {
  overflow: hidden;
  color: var(--tp-text-primary);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec-time {
  color: var(--tp-text-tertiary);
  font-size: 12px;
}

.rec-expire {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: none;
  align-items: flex-end;
}

.rec-expire-label,
.rec-expire-value {
  color: var(--tp-danger);
  font-size: 12px;
}

.rec-empty {
  margin: 24px 0;
  color: var(--tp-text-tertiary);
  font-size: 12px;
  text-align: center;
}

.rec-right {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.rec-head {
  flex: none;
  padding: 38px 24px 12px;
  border-bottom: 1px solid var(--tp-border-light);
  color: var(--tp-text-title);
  font-size: 15px;
  font-weight: 500;
}

.rec-detail {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
}

.player {
  overflow: hidden;
  border-radius: var(--tp-radius-m);
  background: #1f2430;
}

.player-stage {
  display: flex;
  align-items: flex-end;
  aspect-ratio: 16 / 9;
  padding: 18px;
  background: radial-gradient(120% 120% at 20% 0%, #2c3444 0%, #1f2430 62%);
}

.player-badge {
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 12px;
}

.player-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #1a1e28;
  color: #e6e8ee;
}

.player-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.player-time {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.player-track {
  position: relative;
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.22);
}

.player-track i {
  position: absolute;
  left: 0;
  width: 18%;
  height: 100%;
  border-radius: 2px;
  background: #fff;
}

.rec-name {
  margin: 18px 0 6px;
  color: var(--tp-text-title);
  font-size: 20px;
  font-weight: 600;
}

.rec-meta {
  margin: 0;
  color: var(--tp-text-tertiary);
  font-size: 13px;
}

.detail-tabs {
  margin-top: 18px;
}

.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 0;
  color: var(--tp-text-tertiary);
  font-size: 13px;
}

.rec-placeholder {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--tp-text-tertiary);
  font-size: 13px;
}

.empty-art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--tp-fill);
  color: #dcdfe6;
}
</style>
