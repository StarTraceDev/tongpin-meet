<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import AppIcon from '../components/AppIcon.vue'
import { usePlatform } from '../platform'

type Section = 'general' | 'video' | 'audio' | 'recording' | 'about'

const platform = usePlatform()

const SECTIONS: {
  key: Section
  label: string
  icon: 'settings' | 'video' | 'mic' | 'record' | 'info'
}[] = [
  { key: 'general', label: '常规', icon: 'settings' },
  { key: 'video', label: '视频', icon: 'video' },
  { key: 'audio', label: '音频', icon: 'mic' },
  { key: 'recording', label: '录制', icon: 'record' },
  { key: 'about', label: '关于', icon: 'info' },
]

const section = ref<Section>('general')
const theme = ref<'system' | 'light' | 'dark'>('light')

const settings = reactive({
  muteOnJoin: true,
  cameraOffOnJoin: true,
  meetingReminder: true,
  minimizeToTray: false,
  language: '简体中文',
})

const STORAGE_KEY = 'settings.general'

onMounted(() => {
  void (async (): Promise<void> => {
    const saved = await platform.storage.get(STORAGE_KEY)
    if (saved === null) return
    try {
      Object.assign(settings, JSON.parse(saved) as Partial<typeof settings>)
    } catch {
      // 坏数据按默认值处理
    }
  })()
})

type ToggleKey = 'muteOnJoin' | 'cameraOffOnJoin' | 'meetingReminder' | 'minimizeToTray'

function toggle(key: ToggleKey): void {
  settings[key] = !settings[key]
  persist()
}

function persist(): void {
  void platform.storage.set(STORAGE_KEY, JSON.stringify(settings))
}
</script>

<template>
  <div class="settings">
    <nav class="settings-nav">
      <button
        v-for="item in SECTIONS"
        :key="item.key"
        class="settings-nav-item"
        :class="{ on: section === item.key }"
        type="button"
        @click="section = item.key"
      >
        <AppIcon :name="item.icon" :size="18" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <section class="settings-body">
      <h1 class="settings-title">{{ SECTIONS.find((item) => item.key === section)?.label }}</h1>

      <template v-if="section === 'general'">
        <div class="setting-row">
          <span class="setting-label">外观</span>
          <div class="segmented">
            <button
              v-for="option in ['system', 'light', 'dark'] as const"
              :key="option"
              class="segment"
              :class="{ on: theme === option }"
              type="button"
              @click="theme = option"
            >
              {{ option === 'system' ? '跟随系统' : option === 'light' ? '浅色' : '深色' }}
            </button>
          </div>
        </div>

        <div class="setting-row">
          <span class="setting-text">
            <span class="setting-label">入会时自动静音</span>
            <span class="setting-desc">进入会议后麦克风默认关闭</span>
          </span>
          <button
            class="switch"
            :class="{ on: settings.muteOnJoin }"
            type="button"
            role="switch"
            :aria-checked="settings.muteOnJoin"
            @click="toggle('muteOnJoin')"
          >
            <i />
          </button>
        </div>

        <div class="setting-row">
          <span class="setting-label">入会时关闭摄像头</span>
          <button
            class="switch"
            :class="{ on: settings.cameraOffOnJoin }"
            type="button"
            role="switch"
            :aria-checked="settings.cameraOffOnJoin"
            @click="toggle('cameraOffOnJoin')"
          >
            <i />
          </button>
        </div>

        <div class="setting-row">
          <span class="setting-text">
            <span class="setting-label">会议提醒</span>
            <span class="setting-desc">会议开始前 5 分钟提醒</span>
          </span>
          <button
            class="switch"
            :class="{ on: settings.meetingReminder }"
            type="button"
            role="switch"
            :aria-checked="settings.meetingReminder"
            @click="toggle('meetingReminder')"
          >
            <i />
          </button>
        </div>

        <div class="setting-row">
          <span class="setting-label">关闭主窗口时最小化到托盘</span>
          <button
            class="switch"
            :class="{ on: settings.minimizeToTray }"
            type="button"
            role="switch"
            :aria-checked="settings.minimizeToTray"
            @click="toggle('minimizeToTray')"
          >
            <i />
          </button>
        </div>

        <div class="setting-row">
          <span class="setting-label">语言</span>
          <select v-model="settings.language" class="setting-select" @change="persist">
            <option>简体中文</option>
            <option>English</option>
          </select>
        </div>
      </template>

      <p v-else class="settings-pending">
        「{{ SECTIONS.find((item) => item.key === section)?.label }}」设置将在 M14 接入
      </p>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  height: 100%;
  min-height: 0;
  background: var(--tp-canvas);
}

.settings-nav {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 2px;
  width: 180px;
  padding: 38px 12px 0;
}

.settings-nav-item {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--tp-radius-m);
  background: transparent;
  color: var(--tp-text-secondary);
  font-family: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.settings-nav-item.on {
  background: var(--tp-brand-tint);
  color: var(--tp-brand);
}

.settings-body {
  flex: 1;
  min-width: 0;
  padding: 38px 32px 0 24px;
  overflow-y: auto;
}

.settings-title {
  margin: 0 0 22px;
  color: var(--tp-text-title);
  font-size: 20px;
  font-weight: 600;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 64px;
  border-bottom: 1px solid var(--tp-border-light);
}

.setting-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  color: var(--tp-text-primary);
  font-size: 15px;
}

.setting-desc {
  color: var(--tp-text-tertiary);
  font-size: 12px;
}

.segmented {
  display: flex;
  gap: 8px;
}

.segment {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  background: var(--tp-canvas);
  color: var(--tp-text-secondary);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.segment.on {
  border-color: var(--tp-brand);
  background: var(--tp-brand-tint);
  color: var(--tp-brand);
}

.switch {
  position: relative;
  flex: none;
  width: 44px;
  height: 24px;
  border: 0;
  border-radius: 12px;
  background: var(--tp-border);
  cursor: pointer;
  transition: background 0.15s ease;
}

.switch.on {
  background: var(--tp-brand);
}

.switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}

.switch.on i {
  transform: translateX(20px);
}

.setting-select {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  background: var(--tp-canvas);
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 13px;
}

.settings-pending {
  color: var(--tp-text-tertiary);
  font-size: 13px;
}
</style>
