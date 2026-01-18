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
  chart: [
    { tag: 'path', d: 'M3 3v18h18' },
    { tag: 'path', d: 'M18 17V9' },
    { tag: 'path', d: 'M13 17V5' },
    { tag: 'path', d: 'M8 17v-3' },
  ],
  check: [{ tag: 'path', d: 'M20 6 9 17l-5-5' }],
  file: [
    { tag: 'path', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z' },
    { tag: 'path', d: 'M14 2v6h6' },
  ],
  clock: [
    { tag: 'circle', cx: 12, cy: 12, r: 10 },
    { tag: 'path', d: 'M12 6v6l4 2' },
  ],
  sparkle: [
    { tag: 'path', d: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z' },
    { tag: 'path', d: 'M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15Z' },
  ],
  send: [
    { tag: 'path', d: 'm22 2-7 20-4-9-9-4Z' },
    { tag: 'path', d: 'M22 2 11 13' },
  ],
  play: [{ tag: 'path', d: 'm8 5 11 7-11 7V5Z' }],
  pause: [
    { tag: 'rect', x: 7, y: 5, width: 3, height: 14, rx: 1 },
    { tag: 'rect', x: 14, y: 5, width: 3, height: 14, rx: 1 },
  ],
  copy: [
    { tag: 'rect', x: 9, y: 9, width: 12, height: 12, rx: 2 },
    { tag: 'path', d: 'M5 15V5a2 2 0 0 1 2-2h10' },
  ],
  undo: [
    { tag: 'path', d: 'M9 14 4 9l5-5' },
    { tag: 'path', d: 'M4 9h10a6 6 0 0 1 0 12h-3' },
  ],
  redo: [
    { tag: 'path', d: 'm15 14 5-5-5-5' },
    { tag: 'path', d: 'M20 9H10a6 6 0 0 0 0 12h3' },
  ],
  'plus-page': [
    { tag: 'rect', x: 4, y: 3, width: 16, height: 18, rx: 2 },
    { tag: 'path', d: 'M12 8v8M8 12h8' },
  ],
  pen: [{ tag: 'path', d: 'M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' }],
  arrow: [
    { tag: 'path', d: 'M7 17 17 7' },
    { tag: 'path', d: 'M7 7h10v10' },
  ],
  eraser: [
    {
      tag: 'path',
      d: 'm7 21-4-4a2 2 0 0 1 0-2.8l9.2-9.2a2 2 0 0 1 2.8 0l4 4a2 2 0 0 1 0 2.8L13 21H7Z',
    },
    { tag: 'path', d: 'm12 8 6 6' },
  ],
  trash: [
    { tag: 'path', d: 'M3 6h18' },
    { tag: 'path', d: 'M8 6V4h8v2' },
    { tag: 'path', d: 'm6 6 1 14h10l1-14' },
  ],
  download: [
    { tag: 'path', d: 'M12 3v12' },
    { tag: 'path', d: 'm7 10 5 5 5-5' },
    { tag: 'path', d: 'M4 21h16' },
  ],
  left: [{ tag: 'path', d: 'm15 18-6-6 6-6' }],
  inbox: [
    { tag: 'path', d: 'M22 12h-6l-2 3h-4l-2-3H2' },
    {
      tag: 'path',
      d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z',
    },
  ],
  signal: [{ tag: 'path', d: 'M4 20v-2M9 20v-6M14 20v-10M19 20V6' }],
  forward: [
    { tag: 'path', d: 'M14 4h6v6' },
    { tag: 'path', d: 'M20 4 11 13' },
    { tag: 'path', d: 'M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5' },
  ],
  expand: [{ tag: 'path', d: 'M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5' }],
  detach: [
    { tag: 'rect', x: 3, y: 4, width: 18, height: 16, rx: 2 },
    { tag: 'path', d: 'M9 12h8M13 8l4 4-4 4' },
  ],
  grid: [
    { tag: 'rect', x: 3, y: 3, width: 7, height: 7, rx: 1.5 },
    { tag: 'rect', x: 14, y: 3, width: 7, height: 7, rx: 1.5 },
    { tag: 'rect', x: 14, y: 14, width: 7, height: 7, rx: 1.5 },
    { tag: 'rect', x: 3, y: 14, width: 7, height: 7, rx: 1.5 },
  ],
  more: [
    { tag: 'circle', cx: 5, cy: 12, r: 1 },
    { tag: 'circle', cx: 12, cy: 12, r: 1 },
    { tag: 'circle', cx: 19, cy: 12, r: 1 },
  ],
  'phone-off': [
    {
      tag: 'path',
      d: 'M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91M2 2l20 20',
    },
  ],
  mic: [
    { tag: 'rect', x: 9, y: 2, width: 6, height: 11, rx: 3 },
    { tag: 'path', d: 'M19 10v2a7 7 0 0 1-14 0v-2M12 19v3' },
  ],
  'mic-off': [
    {
      tag: 'path',
      d: 'm2 2 20 20M15 9.34V5a3 3 0 0 0-5.68-1.33M9 9v3a3 3 0 0 0 5.12 2.12M19 10v2a7 7 0 0 1-.11 1.23M5 10v2a7 7 0 0 0 12 5M12 19v3',
    },
  ],
  'cam-off': [
    {
      tag: 'path',
      d: 'M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2M2 2l20 20',
    },
  ],
  msg: [{ tag: 'path', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }],
  emoji: [
    { tag: 'circle', cx: 12, cy: 12, r: 9 },
    { tag: 'path', d: 'M8 14.5a4.5 4.5 0 0 0 8 0' },
    { tag: 'path', d: 'M9 9.5h.01M15 9.5h.01' },
  ],
  barrage: [
    { tag: 'rect', x: 2, y: 4, width: 20, height: 13, rx: 2.5 },
    { tag: 'path', d: 'M6.5 8.5h11M6.5 12h6' },
    { tag: 'path', d: 'm7 17-1 4 4-4' },
  ],
} as const satisfies Record<string, readonly IconShape[]>

export type IconName = keyof typeof ICONS

export const ICON_STROKE_WIDTH = stroke
