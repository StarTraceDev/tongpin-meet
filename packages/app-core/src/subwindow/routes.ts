import type { SubWindowKey } from '@tongpin/platform'
import { SUB_WINDOW_SPECS } from '@tongpin/platform'
import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'

import { ROUTE_NAMES } from '../router/names'
import SubWindowHost from './SubWindowHost.vue'

export interface SubWindowRequest {
  key: SubWindowKey
  /** 壳把 `?payload=<json>` 解析好传进来，面板自己认字段 */
  payload?: unknown
}

export type SubWindowOverrides = Partial<Record<SubWindowKey, Component>>

/**
 * 子窗口不挂主路由树：桌面端用这套路由挂载，`?sub=key` 只做分发（O1）。
 * 共享选择器不要求登录，其余面板仍走鉴权守卫拿 user。
 */
export function subWindowRoutes(
  request: SubWindowRequest,
  overrides?: SubWindowOverrides,
): RouteRecordRaw[] {
  return [
    {
      path: '/',
      name: ROUTE_NAMES.subWindow,
      component: SubWindowHost,
      props: { request, ...(overrides === undefined ? {} : { overrides }) },
      meta: { public: request.key === 'sharePicker', title: SUB_WINDOW_SPECS[request.key].title },
    },
  ]
}
