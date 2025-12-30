import type {
  FeedbackAction,
  FeedbackCreateInput,
  FeedbackList,
  FeedbackQuery,
  FeedbackUpdateInput,
} from '@tongpin/shared'

import { request } from '@/lib/http'

function feedbackQueryString(query: FeedbackQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  if (query.status !== undefined) {
    params.set('status', query.status)
  }
  if (query.category !== undefined) {
    params.set('category', query.category)
  }
  if (query.keyword !== undefined && query.keyword !== '') {
    params.set('keyword', query.keyword)
  }
  return params.toString()
}

export function fetchFeedbacks(query: FeedbackQuery): Promise<FeedbackList> {
  return request<FeedbackList>(`/admin/feedbacks?${feedbackQueryString(query)}`)
}

export function createFeedback(input: FeedbackCreateInput): Promise<FeedbackAction> {
  return request<FeedbackAction>('/admin/feedbacks', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function handleFeedback(id: string, input: FeedbackUpdateInput): Promise<FeedbackAction> {
  return request<FeedbackAction>(`/admin/feedbacks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}
