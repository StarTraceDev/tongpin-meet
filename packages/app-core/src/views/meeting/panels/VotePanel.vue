<script setup lang="ts">
import type { Vote, VoteResults } from '@tongpin/shared/types'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'

import AppIcon from '../../../components/AppIcon.vue'
import * as voteApi from '../../../apis/vote'
import { useInteractionStore } from '../../../stores/interaction'
import { usePanelContext } from './panelContext'

const interaction = useInteractionStore()
const panelContext = usePanelContext()

type View = 'list' | 'create' | 'detail' | 'results'

const view = ref<View>('list')
const current = ref<Vote | null>(null)
const results = ref<VoteResults | null>(null)
const loading = ref(false)

const draftTitle = ref('')
const draftQuestion = ref('')
const draftOptions = ref<string[]>(['', ''])
const answers = ref<Record<string, string[]>>({})

const meetingId = computed(() => panelContext.meetingId())
const hasVotes = computed(() => interaction.votes.length > 0)

const STATUS_LABEL: Record<Vote['status'], string> = {
  DRAFT: '未开始',
  ONGOING: '进行中',
  CLOSED: '已结束',
  PUBLISHED: '已公开',
}

const STATUS_TONE: Record<Vote['status'], string> = {
  DRAFT: 'idle',
  ONGOING: 'live',
  CLOSED: 'muted',
  PUBLISHED: 'live',
}

onMounted(async () => {
  if (meetingId.value !== '') await reload()
})

async function reload(): Promise<void> {
  try {
    await interaction.loadVotes(meetingId.value)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '读取投票失败')
  }
}

function openVote(vote: Vote): void {
  if (vote.status === 'PUBLISHED' || vote.status === 'CLOSED') void openResults(vote)
  else openDetail(vote)
}

function openDetail(vote: Vote): void {
  current.value = vote
  answers.value = {}
  view.value = 'detail'
}

async function openResults(vote: Vote): Promise<void> {
  current.value = vote
  loading.value = true
  try {
    await interaction.loadVoteResults(meetingId.value, vote.id)
    results.value = interaction.voteResults
    view.value = 'results'
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '读取结果失败')
  } finally {
    loading.value = false
  }
}

function toggleOption(questionId: string, optionId: string, multi: boolean): void {
  const selected = answers.value[questionId] ?? []
  if (multi) {
    answers.value[questionId] = selected.includes(optionId)
      ? selected.filter((item) => item !== optionId)
      : [...selected, optionId]
  } else {
    answers.value[questionId] = [optionId]
  }
}

function isChecked(questionId: string, optionId: string): boolean {
  return (answers.value[questionId] ?? []).includes(optionId)
}

async function submit(): Promise<void> {
  const vote = current.value
  if (vote === null) return
  const payload = vote.questions
    .map((question) => ({
      questionId: question.id,
      optionIds: answers.value[question.id] ?? [],
    }))
    .filter((answer) => answer.optionIds.length > 0)
  if (payload.length === 0) {
    ElMessage.info('请先选择选项')
    return
  }
  try {
    await interaction.submitVote(meetingId.value, vote.id, { answers: payload })
    ElMessage.success('投票已提交')
    await openResults(vote)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交投票失败')
  }
}

function addOption(): void {
  if (draftOptions.value.length >= 6) return
  draftOptions.value = [...draftOptions.value, '']
}

async function createVote(): Promise<void> {
  const title = draftTitle.value.trim()
  const question = draftQuestion.value.trim()
  const options = draftOptions.value.map((item) => item.trim()).filter((item) => item !== '')
  if (title === '' || question === '' || options.length < 2) {
    ElMessage.info('请填写标题、题目和至少两个选项')
    return
  }
  try {
    const created = await voteApi.createVote(meetingId.value, {
      title,
      anonymous: false,
      questions: [
        { content: question, type: 'SINGLE', options: options.map((content) => ({ content })) },
      ],
    })
    await interaction.startVote(meetingId.value, created.id)
    await reload()
    draftTitle.value = ''
    draftQuestion.value = ''
    draftOptions.value = ['', '']
    view.value = 'list'
    ElMessage.success('投票已开始')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建投票失败')
  }
}

async function closeCurrent(): Promise<void> {
  const vote = current.value
  if (vote === null) return
  await interaction.closeVote(meetingId.value, vote.id)
  ElMessage.success('投票已结束')
  await reload()
}

async function publishCurrent(): Promise<void> {
  const vote = current.value
  if (vote === null) return
  await interaction.publishVote(meetingId.value, vote.id)
  ElMessage.success('结果已公布')
  await openResults(vote)
}

function percent(count: number, total: number): number {
  if (total === 0) return 0
  return Math.round((count / total) * 100)
}

function optionCount(resultsValue: VoteResults, questionId: string, optionId: string): number {
  const question = resultsValue.questions.find((item) => item.questionId === questionId)
  return question?.options.find((item) => item.optionId === optionId)?.count ?? 0
}
</script>

<template>
  <div class="vote-panel">
    <!-- 列表（D27） -->
    <template v-if="view === 'list'">
      <div class="vote-list">
        <p v-if="!hasVotes" class="panel-empty">还没有投票</p>
        <button
          v-for="vote in interaction.votes"
          :key="vote.id"
          class="vote-row"
          type="button"
          @click="openVote(vote)"
        >
          <div class="vote-row-head">
            <strong>{{ vote.title }}</strong>
            <span class="vote-state" :class="STATUS_TONE[vote.status]">
              <i class="dot" />{{ STATUS_LABEL[vote.status] }}
              <AppIcon name="right" :size="14" />
            </span>
          </div>
          <div class="vote-chips">
            <span class="vote-chip">未参与</span>
            <span
              v-if="vote.status === 'ONGOING' || vote.status === 'PUBLISHED'"
              class="vote-chip blue"
            >
              投票公开中
            </span>
          </div>
        </button>
      </div>
      <div class="checkin-foot">
        <button class="sub-primary" type="button" @click="view = 'create'">创建投票</button>
      </div>
    </template>

    <!-- 创建 -->
    <template v-else-if="view === 'create'">
      <div class="vote-create">
        <label class="vote-label">投票标题</label>
        <input v-model="draftTitle" class="sub-field" placeholder="请输入投票标题" maxlength="60" />
        <label class="vote-label">题目（单选）</label>
        <input v-model="draftQuestion" class="sub-field" placeholder="请输入题目" maxlength="80" />
        <label class="vote-label">选项</label>
        <div v-for="(_, index) in draftOptions" :key="index" class="vote-option-input">
          <input
            v-model="draftOptions[index]"
            class="sub-field"
            :placeholder="`选项 ${index + 1}`"
            maxlength="60"
          />
        </div>
        <button v-if="draftOptions.length < 6" class="vote-add" type="button" @click="addOption">
          + 添加选项
        </button>
      </div>
      <div class="checkin-foot vote-foot">
        <button class="sub-ghost" type="button" @click="view = 'list'">返回列表</button>
        <button class="sub-primary" type="button" @click="createVote">创建并开始</button>
      </div>
    </template>

    <!-- 参与（D28） -->
    <template v-else-if="view === 'detail' && current !== null">
      <div v-if="current.publishedAt !== null" class="vote-banner">
        <span class="vote-banner-ic">!</span>主持人正在共享投票结果
      </div>
      <div class="vote-detail">
        <div class="vote-title-block">
          <h2><AppIcon name="chart" :size="22" />{{ current.title }}</h2>
          <p class="vote-meta">
            {{ current.anonymous ? '匿名' : '非匿名' }} ·
            <span class="live">{{ STATUS_LABEL[current.status] }}</span>
          </p>
        </div>
        <div class="vote-band" />
        <section v-for="question in current.questions" :key="question.id" class="vote-question">
          <h3>
            {{ String(question.index).padStart(2, '0') }} {{ question.content }}
            <em
              >[{{
                question.type === 'MULTI' ? '多选' : question.type === 'RATING' ? '评分' : '单选'
              }}]</em
            >
          </h3>
          <label
            v-for="option in question.options"
            :key="option.id"
            class="vote-choice"
            :class="{ checked: isChecked(question.id, option.id) }"
            @click.prevent="toggleOption(question.id, option.id, question.type === 'MULTI')"
          >
            <span class="choice-box" :class="{ square: question.type === 'MULTI' }" />
            {{ option.content }}
          </label>
        </section>
      </div>
      <div class="checkin-foot vote-foot">
        <button class="sub-ghost" type="button" @click="view = 'list'">返回列表</button>
        <button class="sub-primary" type="button" @click="submit">提交</button>
      </div>
    </template>

    <!-- 结果（D29） -->
    <template v-else-if="view === 'results' && results !== null">
      <div class="vote-banner"><span class="vote-banner-ic">!</span>主持人正在共享投票结果</div>
      <div class="vote-detail">
        <div class="vote-title-block">
          <h2><AppIcon name="chart" :size="22" />{{ current?.title }}</h2>
          <p class="vote-meta">
            {{ results.totalRecords }}人参与 ·
            {{ current?.anonymous === true ? '匿名' : '非匿名' }} ·
            {{ STATUS_LABEL[current?.status ?? 'CLOSED'] }}
          </p>
        </div>
        <div class="vote-band" />
        <section
          v-for="question in results.questions"
          :key="question.questionId"
          class="vote-question"
        >
          <h3>
            {{ results.questions.indexOf(question) + 1 < 10 ? '0' : ''
            }}{{ results.questions.indexOf(question) + 1 }}
            {{ question.content }}
            <em>[{{ question.type === 'MULTI' ? '多选' : '单选' }}]</em>
          </h3>
          <div v-for="option in question.options" :key="option.optionId" class="vote-result-row">
            <div class="vote-result-line">
              <span>{{ option.content }}</span>
              <span
                >{{ optionCount(results, question.questionId, option.optionId) }}票
                {{
                  percent(
                    optionCount(results, question.questionId, option.optionId),
                    results.totalRecords,
                  )
                }}%</span
              >
            </div>
            <div class="vote-bar">
              <i
                :style="{
                  width: `${percent(optionCount(results, question.questionId, option.optionId), results.totalRecords)}%`,
                }"
              />
            </div>
          </div>
        </section>
      </div>
      <div class="checkin-foot vote-foot">
        <button class="sub-ghost" type="button" @click="view = 'list'">更多</button>
        <button
          v-if="panelContext.isHost() && current?.status !== 'PUBLISHED'"
          class="sub-primary"
          type="button"
          @click="closeCurrent"
        >
          停止公布
        </button>
        <button v-else class="sub-primary" type="button" @click="publishCurrent">公布结果</button>
      </div>
    </template>
  </div>
</template>
