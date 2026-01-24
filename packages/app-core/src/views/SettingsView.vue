<script setup lang="ts">
import { ElMessage } from 'element-plus'
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
  cameraId: '默认摄像头',
  resolution: '720p',
  mirrorPreview: true,
  micId: '默认麦克风',
  speakerId: '默认扬声器',
  autoConnectAudio: true,
  autoRecord: false,
  recordQuality: '高清',
  recordDir: '',
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

type ToggleKey =
  | 'muteOnJoin'
  | 'cameraOffOnJoin'
  | 'meetingReminder'
  | 'minimizeToTray'
  | 'mirrorPreview'
  | 'autoConnectAudio'
  | 'autoRecord'

function toggle(key: ToggleKey): void {
  settings[key] = !settings[key]
  persist()
}

const version = import.meta.env.VITE_APP_VERSION ?? '0.1.0'

function pickRecordDir(): void {
  ElMessage.info('目录选择需要主进程 dialog，M15 接入')
}

async function checkUpdate(): Promise<void> {
  try {
    await platform.update.check()
    ElMessage.success('已开始检查更新')
  } catch {
    ElMessage.info('当前平台不支持自动更新')
  }
}

function openDoc(label: string): void {
  ElMessage.info(`${label}页面将在 M15 补齐`)
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

      <template v-else-if="section === 'video'">
        <div class="setting-row">
          <span class="setting-label">摄像头</span>
          <select v-model="settings.cameraId" class="setting-select" @change="persist">
            <option>默认摄像头</option>
            <option>内置摄像头</option>
          </select>
        </div>
        <div class="setting-row">
          <span class="setting-label">视频分辨率</span>
          <select v-model="settings.resolution" class="setting-select" @change="persist">
            <option>720p</option>
            <option>1080p</option>
          </select>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-label">预览画面镜像</p>
            <p class="setting-desc">仅影响自己的预览，不改变其他参会人看到的画面</p>
          </div>
          <button
            class="switch"
            :class="{ on: settings.mirrorPreview }"
            type="button"
            role="switch"
            :aria-checked="settings.mirrorPreview"
            @click="toggle('mirrorPreview')"
          >
            <i />
          </button>
        </div>
      </template>

      <template v-else-if="section === 'audio'">
        <div class="setting-row">
          <span class="setting-label">麦克风</span>
          <select v-model="settings.micId" class="setting-select" @change="persist">
            <option>默认麦克风</option>
            <option>内置麦克风</option>
          </select>
        </div>
        <div class="setting-row">
          <span class="setting-label">扬声器</span>
          <select v-model="settings.speakerId" class="setting-select" @change="persist">
            <option>默认扬声器</option>
            <option>内置扬声器</option>
          </select>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-label">入会时自动连接音频</p>
            <p class="setting-desc">进入会议后自动加入音频，不再弹「加入音频」按钮</p>
          </div>
          <button
            class="switch"
            :class="{ on: settings.autoConnectAudio }"
            type="button"
            role="switch"
            :aria-checked="settings.autoConnectAudio"
            @click="toggle('autoConnectAudio')"
          >
            <i />
          </button>
        </div>
      </template>

      <template v-else-if="section === 'recording'">
        <div class="setting-row">
          <span class="setting-label">录制画质</span>
          <select v-model="settings.recordQuality" class="setting-select" @change="persist">
            <option>高清</option>
            <option>标清</option>
          </select>
        </div>
        <div class="setting-row">
          <span class="setting-label">保存位置</span>
          <div class="setting-inline">
            <span class="setting-path">{{
              settings.recordDir === '' ? '默认（影片/同频会议）' : settings.recordDir
            }}</span>
            <button class="ghost-btn" type="button" @click="pickRecordDir">选择</button>
          </div>
        </div>
        <div class="setting-row">
          <div>
            <p class="setting-label">入会自动录制</p>
            <p class="setting-desc">仅主持人生效，其他参会人会看到录制提示</p>
          </div>
          <button
            class="switch"
            :class="{ on: settings.autoRecord }"
            type="button"
            role="switch"
            :aria-checked="settings.autoRecord"
            @click="toggle('autoRecord')"
          >
            <i />
          </button>
        </div>
      </template>

      <template v-else-if="section === 'about'">
        <div class="setting-row">
          <span class="setting-label">同频会议</span>
          <span class="setting-path">v{{ version }}</span>
        </div>
        <div class="setting-row">
          <span class="setting-label">版本更新</span>
          <button class="ghost-btn" type="button" @click="checkUpdate">检查更新</button>
        </div>
        <div class="setting-row">
          <span class="setting-label">服务条款</span>
          <button class="ghost-btn" type="button" @click="openDoc('服务条款')">查看</button>
        </div>
        <div class="setting-row">
          <span class="setting-label">隐私政策</span>
          <button class="ghost-btn" type="button" @click="openDoc('隐私政策')">查看</button>
        </div>
      </template>
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

.setting-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-path {
  color: var(--tp-text-secondary);
  font-size: 13px;
}

.ghost-btn {
  height: 30px;
  padding: 0 14px;
  border: 1px solid var(--tp-border);
  border-radius: var(--tp-radius-s);
  background: #fff;
  color: var(--tp-text-primary);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.ghost-btn:hover {
  background: var(--tp-fill);
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
