/** 图标只收设计稿用到的 Lucide 线性图标（docs/design/icons.js，24×24、描边 1.8） */
export type IconShape =
  | { tag: 'path'; d: string }
  | { tag: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { tag: 'circle'; cx: number; cy: number; r: number }

const stroke = 1.8

export const ICONS = {
  video: [
    { tag: 'rect', x: 2, y: 6, width: 14, height: 12, rx: 2 },
    { tag: 'path', d: 'm22 8-6 4 6 4V8Z' },
  ],
  users: [
    { tag: 'path', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' },
    { tag: 'circle', cx: 9, cy: 7, r: 4 },
    { tag: 'path', d: 'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  ],
  record: [
    { tag: 'rect', x: 2, y: 4, width: 20, height: 16, rx: 3 },
    { tag: 'path', d: 'm10 9 5 3-5 3V9Z' },
  ],
  settings: [
    { tag: 'circle', cx: 12, cy: 12, r: 3 },
    {
      tag: 'path',
      d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
    },
  ],
  plus: [{ tag: 'path', d: 'M12 5v14M5 12h14' }],
  zap: [{ tag: 'path', d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8Z' }],
  'cal-plus': [
    { tag: 'rect', x: 3, y: 4, width: 18, height: 18, rx: 2 },
    { tag: 'path', d: 'M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4' },
  ],
  monitor: [
    { tag: 'rect', x: 2, y: 3, width: 20, height: 14, rx: 2 },
    { tag: 'path', d: 'M8 21h8M12 17v4' },
  ],
  search: [
    { tag: 'circle', cx: 11, cy: 11, r: 8 },
    { tag: 'path', d: 'm21 21-4.3-4.3' },
  ],
  right: [{ tag: 'path', d: 'm9 18 6-6-6-6' }],
  down: [{ tag: 'path', d: 'm6 9 6 6 6-6' }],
  x: [{ tag: 'path', d: 'M18 6 6 18M6 6l12 12' }],
  check: [{ tag: 'path', d: 'M20 6 9 17l-5-5' }],
  clock: [
    { tag: 'circle', cx: 12, cy: 12, r: 10 },
    { tag: 'path', d: 'M12 6v6l4 2' },
  ],
  inbox: [
    { tag: 'path', d: 'M22 12h-6l-2 3h-4l-2-3H2' },
    {
      tag: 'path',
      d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z',
    },
  ],
} as const satisfies Record<string, readonly IconShape[]>

export type IconName = keyof typeof ICONS

export const ICON_STROKE_WIDTH = stroke
