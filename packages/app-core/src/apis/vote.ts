import type {
  CreateVoteInput,
  SubmitVoteInput,
  UpdateVoteInput,
  Vote,
  VoteResults,
  VoteSubmissionResult,
} from '@tongpin/shared/types'

import { request } from './http'

function base(meetingId: string): string {
  return `/meetings/${encodeURIComponent(meetingId)}/votes`
}

export function listVotes(meetingId: string): Promise<Vote[]> {
  return request<Vote[]>(base(meetingId))
}

export function createVote(meetingId: string, input: CreateVoteInput): Promise<Vote> {
  return request<Vote>(base(meetingId), { method: 'POST', body: JSON.stringify(input) })
}

export function getVote(meetingId: string, voteId: string): Promise<Vote> {
  return request<Vote>(`${base(meetingId)}/${encodeURIComponent(voteId)}`)
}

export function updateVote(
  meetingId: string,
  voteId: string,
  input: UpdateVoteInput,
): Promise<Vote> {
  return request<Vote>(`${base(meetingId)}/${encodeURIComponent(voteId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteVote(meetingId: string, voteId: string): Promise<void> {
  return request<void>(`${base(meetingId)}/${encodeURIComponent(voteId)}`, { method: 'DELETE' })
}

export function startVote(meetingId: string, voteId: string): Promise<Vote> {
  return request<Vote>(`${base(meetingId)}/${encodeURIComponent(voteId)}:start`, { method: 'POST' })
}

export function closeVote(meetingId: string, voteId: string): Promise<Vote> {
  return request<Vote>(`${base(meetingId)}/${encodeURIComponent(voteId)}:close`, { method: 'POST' })
}

export function publishVote(meetingId: string, voteId: string): Promise<Vote> {
  return request<Vote>(`${base(meetingId)}/${encodeURIComponent(voteId)}:publish`, {
    method: 'POST',
  })
}

export function submitVote(
  meetingId: string,
  voteId: string,
  input: SubmitVoteInput,
): Promise<VoteSubmissionResult> {
  return request<VoteSubmissionResult>(
    `${base(meetingId)}/${encodeURIComponent(voteId)}/submissions`,
    { method: 'POST', body: JSON.stringify(input) },
  )
}

export function getVoteResults(meetingId: string, voteId: string): Promise<VoteResults> {
  return request<VoteResults>(`${base(meetingId)}/${encodeURIComponent(voteId)}/results`)
}

export type { Vote, VoteResults }
