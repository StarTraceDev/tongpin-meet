import type {
  Break,
  BreakOverview,
  Checkin,
  CheckinRecord,
  CheckinResult,
  CreateBreakInput,
  CreateCheckinInput,
  Vote,
  VoteResults,
  SubmitVoteInput,
} from '@tongpin/shared/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import * as breakApi from '../apis/break'
import * as checkinApi from '../apis/checkin'
import * as voteApi from '../apis/vote'

/**
 * 会中互动三件套（签到 / 投票 / 休息）的共享状态。
 * 三个面板与主画面都读这一份，避免各自轮询（O14）。
 */
export const useInteractionStore = defineStore('interaction', () => {
  const checkins = ref<Checkin[]>([])
  const checkinRecords = ref<CheckinRecord[]>([])
  const checkinTotal = ref(0)
  const checkinJoined = ref(0)
  /** 本地倒计时截止（服务端没有时长字段，见 PROGRESS §5 偏差） */
  const checkinDeadline = ref<number | null>(null)
  const votes = ref<Vote[]>([])
  const voteResults = ref<VoteResults | null>(null)
  const breaks = ref<Break[]>([])
  const breakOverview = ref<BreakOverview | null>(null)
  const loading = ref(false)

  const activeCheckin = computed<Checkin | null>(
    () => checkins.value.find((item) => item.status === 'ONGOING') ?? null,
  )
  const activeBreak = computed<Break | null>(
    () => breaks.value.find((item) => item.status === 'ONGOING') ?? null,
  )

  function reset(): void {
    checkins.value = []
    checkinRecords.value = []
    checkinTotal.value = 0
    checkinJoined.value = 0
    checkinDeadline.value = null
    votes.value = []
    voteResults.value = null
    breaks.value = []
    breakOverview.value = null
  }

  async function loadCheckins(meetingId: string): Promise<void> {
    checkins.value = await checkinApi.listCheckins(meetingId)
    const current = activeCheckin.value
    if (current !== null) await loadCheckinRecords(meetingId, current.id)
  }

  async function loadCheckinRecords(meetingId: string, checkinId: string): Promise<void> {
    const overview = await checkinApi.getCheckinOverview(meetingId, checkinId)
    checkinRecords.value = overview.records
    checkinTotal.value = overview.total
    checkinJoined.value = overview.joined
  }

  /** 记录列表里每张卡片要显示「N 人签到」，单独取一次概览 */
  async function joinedOf(meetingId: string, checkinId: string): Promise<number> {
    const overview = await checkinApi.getCheckinOverview(meetingId, checkinId)
    return overview.joined
  }

  async function startCheckin(
    meetingId: string,
    input: CreateCheckinInput,
    durationMin = 5,
  ): Promise<Checkin> {
    const created = await checkinApi.createCheckin(meetingId, input)
    checkinDeadline.value = Date.now() + durationMin * 60_000
    checkins.value = [created, ...checkins.value]
    checkinRecords.value = []
    checkinTotal.value = 0
    checkinJoined.value = 0
    return created
  }

  async function endCheckin(meetingId: string, checkinId: string): Promise<void> {
    const closed = await checkinApi.closeCheckin(meetingId, checkinId)
    checkinDeadline.value = null
    checkins.value = checkins.value.map((item) => (item.id === closed.id ? closed : item))
  }

  async function signIn(meetingId: string, checkinId: string): Promise<CheckinResult> {
    const result = await checkinApi.respondCheckin(meetingId, checkinId)
    await loadCheckinRecords(meetingId, checkinId)
    return result
  }

  async function loadVotes(meetingId: string): Promise<void> {
    votes.value = await voteApi.listVotes(meetingId)
  }

  async function startVote(meetingId: string, voteId: string): Promise<void> {
    const started = await voteApi.startVote(meetingId, voteId)
    votes.value = votes.value.map((item) => (item.id === started.id ? started : item))
  }

  async function closeVote(meetingId: string, voteId: string): Promise<void> {
    const closed = await voteApi.closeVote(meetingId, voteId)
    votes.value = votes.value.map((item) => (item.id === closed.id ? closed : item))
  }

  async function publishVote(meetingId: string, voteId: string): Promise<void> {
    const published = await voteApi.publishVote(meetingId, voteId)
    votes.value = votes.value.map((item) => (item.id === published.id ? published : item))
  }

  async function submitVote(
    meetingId: string,
    voteId: string,
    input: SubmitVoteInput,
  ): Promise<void> {
    await voteApi.submitVote(meetingId, voteId, input)
  }

  async function loadVoteResults(meetingId: string, voteId: string): Promise<void> {
    voteResults.value = await voteApi.getVoteResults(meetingId, voteId)
  }

  async function loadBreaks(meetingId: string): Promise<void> {
    breaks.value = await breakApi.listBreaks(meetingId)
    const current = activeBreak.value
    if (current !== null) await loadBreakOverview(meetingId, current.id)
  }

  async function loadBreakOverview(meetingId: string, breakId: string): Promise<void> {
    breakOverview.value = await breakApi.getBreakOverview(meetingId, breakId)
  }

  async function startBreak(meetingId: string, input: CreateBreakInput): Promise<Break> {
    const created = await breakApi.createBreak(meetingId, input)
    breaks.value = [created, ...breaks.value]
    await loadBreakOverview(meetingId, created.id)
    return created
  }

  async function endBreak(meetingId: string, breakId: string): Promise<void> {
    const closed = await breakApi.closeBreak(meetingId, breakId)
    breaks.value = breaks.value.map((item) => (item.id === closed.id ? closed : item))
    breakOverview.value = null
  }

  async function markBreak(meetingId: string, breakId: string, resting: boolean): Promise<void> {
    await breakApi.markBreakRecord(meetingId, breakId, { resting })
    await loadBreakOverview(meetingId, breakId)
  }

  return {
    checkins,
    checkinRecords,
    checkinTotal,
    checkinJoined,
    checkinDeadline,
    votes,
    voteResults,
    breaks,
    breakOverview,
    loading,
    activeCheckin,
    activeBreak,
    reset,
    loadCheckins,
    loadCheckinRecords,
    joinedOf,
    startCheckin,
    endCheckin,
    signIn,
    loadVotes,
    startVote,
    closeVote,
    publishVote,
    submitVote,
    loadVoteResults,
    loadBreaks,
    loadBreakOverview,
    startBreak,
    endBreak,
    markBreak,
  }
})
