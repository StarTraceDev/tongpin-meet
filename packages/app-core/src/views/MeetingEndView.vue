<script setup lang="ts">
import type { Meeting, Minutes } from '@tongpin/shared/types'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { request } from '../apis/http'
import { usePlatform } from '../platform'
import { fetchMinutes, generateMinutes, saveMinutes } from '../apis/minutes'

interface MeetingDetail {
  meeting: Meeting
  etag: string
}

const route = useRoute()
const router = useRouter()
const platform = usePlatform()

/** 桌面端的结束页开在会议室子窗口里，返回要关窗而不是把子窗导航去首页 */
function goHome(): void {
  if (platform.kind === 'electron') {
    void closeSubWindow()
    return
  }
  void router.push({ name: 'home' })
}

async function closeSubWindow(): Promise<void> {
  await platform.window.closeSub('meeting')
  await platform.window.closeAllSubs()
}
const meetingId = computed(() => String(route.params.id ?? ''))
const meeting = ref<Meeting | null>(null)
const minutes = ref<Minutes | null>(null)
const draft = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const durationText = computed(() => {
  const item = meeting.value
  if (item === null) return '—'
  const start = item.actualStartAt ?? item.startAt
  const end = item.actualEndAt ?? item.endAt
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  const minutesTotal = Math.round(ms / 60000)
  return minutesTotal >= 60
    ? `${Math.floor(minutesTotal / 60)} 小时 ${minutesTotal % 60} 分`
    : `${minutesTotal} 分钟`
})

const statusText = computed(() => {
  const status = minutes.value?.status
  if (status === 'GENERATING') return '生成中'
  if (status === 'READY') return '已生成'
  return '未生成'
})

onMounted(async () => {
  try {
    const [detail, doc] = await Promise.all([
      request<MeetingDetail>(`/meetings/${meetingId.value}`),
      fetchMinutes(meetingId.value),
    ])
    meeting.value = detail.meeting
    minutes.value = doc
    draft.value = doc.content
  } catch {
    error.value = '加载会议纪要失败（后端没起或没有权限）'
  } finally {
    loading.value = false
  }
})

async function save(): Promise<void> {
  if (minutes.value === null || saving.value) return
  saving.value = true
  try {
    const updated = await saveMinutes(meetingId.value, {
      content: draft.value,
      version: minutes.value.version,
    })
    minutes.value = updated
    draft.value = updated.content
    ElMessage.success('已保存')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function generate(): Promise<void> {
  try {
    const updated = await generateMinutes(meetingId.value)
    minutes.value = updated
    ElMessage.info('已提交生成，AI 结果稍后回来')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '生成失败')
  }
}
</script>

<template>
  <el-container class="page">
    <el-header class="header">
      <el-button text @click="goHome">← 返回</el-button>
      <strong>会议结束</strong>
      <span class="spacer" />
      <el-tag :type="minutes?.status === 'GENERATING' ? 'warning' : 'info'">{{
        statusText
      }}</el-tag>
    </el-header>
    <el-main>
      <el-alert v-if="error !== ''" :title="error" type="warning" show-icon :closable="false" />
      <el-skeleton v-if="loading" :rows="4" animated />
      <template v-else>
        <h2>{{ meeting?.title ?? '（会议已删除）' }}</h2>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="会议号">{{ meeting?.meetingNo }}</el-descriptions-item>
          <el-descriptions-item label="时长">{{ durationText }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ meeting?.status }}</el-descriptions-item>
        </el-descriptions>

        <div class="minutes-head">
          <h3>会议纪要</h3>
          <span class="spacer" />
          <el-button :disabled="minutes === null" @click="generate">AI 生成</el-button>
          <el-button type="primary" :loading="saving" :disabled="minutes === null" @click="save">
            保存
          </el-button>
        </div>
        <el-input
          v-model="draft"
          type="textarea"
          :rows="16"
          placeholder="支持 Markdown；版本 {{ minutes?.version ?? 0 }}"
        />
      </template>
    </el-main>
  </el-container>
</template>

<style scoped>
.page {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.spacer {
  flex: 1;
}

.minutes-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 0 10px;
}
</style>
