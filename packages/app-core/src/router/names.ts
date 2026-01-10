/** 路由名集中一份（10-M13 O4）：跳转只写 ROUTE_NAMES.xxx，不散落字符串 */
export const ROUTE_NAMES = {
  home: 'home',
  login: 'login',
  meeting: 'meeting',
  meetingEnded: 'meeting-ended',
  device: 'device',
  subWindow: 'sub-window',
  notFound: 'not-found',
} as const

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
