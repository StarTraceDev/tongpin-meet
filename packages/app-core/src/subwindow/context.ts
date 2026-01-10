import type { SubWindowKey } from '@tongpin/platform'
import type { InjectionKey } from 'vue'

/** 子窗口宿主注入当前 key，面板按需读标题/尺寸，不用层层传 props */
export const SUB_WINDOW_KEY: InjectionKey<SubWindowKey> = Symbol('tongpin.subWindowKey')
