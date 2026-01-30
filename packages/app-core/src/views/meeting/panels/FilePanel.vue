<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import {
  completeUpload,
  createUpload,
  deleteFile,
  getDownloadUrl,
  listMeetingFiles,
  putPart,
} from '../../../apis/file'
import AppIcon from '../../../components/AppIcon.vue'
import { usePlatform } from '../../../platform'
import type { MeetingFile } from '@tongpin/shared/types'
import { usePanelContext } from './panelContext'

const ctx = usePanelContext()
const platform = usePlatform()

const files = ref<MeetingFile[]>([])
const loading = ref(false)
const uploading = ref(0)
const input = ref<HTMLInputElement | null>(null)
const meetingId = computed(() => ctx.meetingId())

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getMonth() + 1)}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function load(): Promise<void> {
  if (meetingId.value === '') return
  loading.value = true
  try {
    files.value = await listMeetingFiles(meetingId.value)
  } catch {
    ElMessage.error('文件列表加载失败')
  } finally {
    loading.value = false
  }
}

function pick(): void {
  input.value?.click()
}

async function upload(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (file === undefined || meetingId.value === '') return
  uploading.value += 1
  try {
    const session = await createUpload({
      meetingId: meetingId.value,
      name: file.name,
      sizeBytes: file.size,
      mime: file.type || undefined,
    })
    for (const part of session.parts) {
      const start = (part.index - 1) * session.partSize
      await putPart(session.fileId, part.index, file.slice(start, start + part.sizeBytes))
    }
    await completeUpload(session.fileId)
    await load()
    ElMessage.success('文件已上传')
  } catch {
    ElMessage.error('上传失败，请稍后重试')
  } finally {
    uploading.value -= 1
  }
}

async function remove(item: MeetingFile): Promise<void> {
  try {
    await deleteFile(item.id)
    await load()
    ElMessage.success('已删除')
  } catch {
    ElMessage.error('删除失败，只有上传者或主持人可以删除')
  }
}

async function open(item: MeetingFile): Promise<void> {
  try {
    const { url } = await getDownloadUrl(item.id)
    await platform.shell.openExternal(url)
  } catch {
    ElMessage.error('打开失败，请稍后重试')
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="panel-scroll file-panel">
    <div class="file-head">
      <span>会议文件</span>
      <button class="file-upload" type="button" :disabled="uploading > 0" @click="pick">
        <AppIcon name="upload" :size="16" />
        <span>{{ uploading > 0 ? '上传中…' : '上传' }}</span>
      </button>
      <input ref="input" class="file-input" type="file" @change="upload" />
    </div>

    <p v-if="loading" class="panel-empty">加载中…</p>
    <p v-else-if="files.length === 0" class="panel-empty">还没有文件，上传后所有参会人都能看到</p>

    <ul v-else class="file-list">
      <li v-for="item in files" :key="item.id" class="file-row">
        <button class="file-main" type="button" @click="open(item)">
          <AppIcon name="file" :size="20" />
          <span class="file-name">{{ item.name }}</span>
        </button>
        <span class="file-meta"
          >{{ formatSize(item.sizeBytes) }} · {{ formatTime(item.createdAt) }}</span
        >
        <button class="file-del" type="button" title="删除" @click="remove(item)">
          <AppIcon name="trash" :size="16" />
        </button>
      </li>
    </ul>
  </div>
</template>
