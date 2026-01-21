<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import { useInteractionStore } from '../../../stores/interaction'
import { usePanelContext } from './panelContext'

const interaction = useInteractionStore()
const panelContext = usePanelContext()

const minutes = ref(10)
const open = ref(false)
const meetingId = computed(() => panelContext.meetingId())
const active = computed(() => interaction.activeBreak)

const returnAt = computed<string>(() => {
  const start = active.value === null ? Date.now() : new Date(active.value.startedAt).getTime()
  const span = (active.value?.plannedSec ?? minutes.value * 60) * 1000
  const date = new Date(start + span)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})

const previewAt = computed<string>(() => {
  const date = new Date(Date.now() + minutes.value * 60_000)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})

const resting = computed<number>(() => interaction.breakOverview?.restingCount ?? 0)

onMounted(async () => {
  if (meetingId.value !== '') await interaction.loadBreaks(meetingId.value)
})

function pickMinutes(value: number): void {
  minutes.value = value
  open.value = false
}

async function start(): Promise<void> {
  try {
    await interaction.startBreak(meetingId.value, {
      title: `休息 ${minutes.value} 分钟`,
      plannedSec: minutes.value * 60,
    })
    ElMessage.success('已开启会间休息')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '开启休息失败')
  }
}

async function stop(): Promise<void> {
  const current = active.value
  if (current === null) return
  await interaction.endBreak(meetingId.value, current.id)
  ElMessage.success('休息已结束')
}

async function imBack(): Promise<void> {
  const current = active.value
  if (current === null) return
  await interaction.markBreak(meetingId.value, current.id, false)
  ElMessage.success('已标记为回来了')
}
</script>

<template>
  <div class="break-panel">
    <template v-if="active === null">
      <div class="break-heading"><i class="break-rail" />为所有成员开启会间休息</div>
      <div class="break-card">
        <div class="break-pick">
          休息
          <button class="break-min" type="button" @click="open = !open">
            {{ minutes }}<AppIcon name="down" :size="14" />
          </button>
          分钟
          <ul v-if="open" class="break-options">
            <li v-for="option in [5, 10, 15, 30]" :key="option">
              <button type="button" @click="pickMinutes(option)">{{ option }} 分钟</button>
            </li>
          </ul>
        </div>
        <div class="break-clock">
          <strong>{{ previewAt }}</strong>
          <span>回来</span>
        </div>
      </div>
      <div class="checkin-foot">
        <button class="sub-primary" type="button" @click="start">开始休息</button>
      </div>
    </template>

    <template v-else>
      <div class="break-heading"><i class="break-rail" />会间休息进行中</div>
      <div class="break-card">
        <div class="break-clock">
          <strong>{{ returnAt }}</strong>
          <span>回来</span>
        </div>
        <p class="break-count">已回来：{{ resting }} 人</p>
        <button class="break-mini" type="button" @click="imBack">我回来了</button>
      </div>
      <div class="checkin-foot">
        <button class="sub-danger" type="button" @click="stop">结束休息</button>
      </div>
    </template>
  </div>
</template>
