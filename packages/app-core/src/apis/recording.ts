export interface RecordingItem {
  id: string
  title: string
  startedAt: string
  duration: string
  expiresIn: string
  expiresSoon: boolean
}

/**
 * M9 只落了 Recording/RecordingSegment 两张表，还没有 REST。
 * 设计稿 D35/D36 需要内容，验收期用 VITE_MOCK_RECORDINGS=1 打开示例数据；
 * 真接口落地后只改这个函数，视图不动。
 */
const MOCK: RecordingItem[] = [
  {
    id: 'rec_1',
    title: '7517的快速会议',
    startedAt: '2026-11-06 15:38:18',
    duration: '00:11',
    expiresIn: '6天/23:58:31',
    expiresSoon: false,
  },
  {
    id: 'rec_2',
    title: '产品周会 · 第三季度复盘',
    startedAt: '2026-11-05 14:00:22',
    duration: '42:10',
    expiresIn: '5天/22:41:08',
    expiresSoon: false,
  },
  {
    id: 'rec_3',
    title: '客户需求对齐',
    startedAt: '2026-11-04 10:30:05',
    duration: '28:36',
    expiresIn: '4天/18:12:44',
    expiresSoon: true,
  },
]

export async function listRecordings(): Promise<RecordingItem[]> {
  const useMock = Number(import.meta.env.VITE_MOCK_RECORDINGS ?? 0) === 1
  return useMock ? MOCK : []
}
