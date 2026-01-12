import { computed, ref, type ComputedRef, type Ref } from 'vue'

import { useParticipantsStore } from '../../../stores/participants'
import { useRtcStore } from '../../../stores/rtc'

/** 用户手选的布局偏好；null = 跟随默认规则 */
export type LayoutPreference =
  'grid9' | 'speakerRight' | 'speakerTop' | 'layoutLTop' | 'layoutLBottom' | null

/** 实际生效的布局；solo 是单人默认，不出现在选择器里 */
export type LayoutMode = Exclude<LayoutPreference, null> | 'solo'

/** L 型布局的最低人数（10-M13 表：needMinMember 7） */
export const LAYOUT_L_MIN_MEMBER = 7

export interface LayoutOption {
  value: Exclude<LayoutPreference, null>
  label: string
  /** 人数不足时禁用并给提示 */
  minMember?: number
}

export const LAYOUT_OPTIONS: readonly LayoutOption[] = [
  { value: 'grid9', label: '一屏9等分' },
  { value: 'speakerRight', label: '右侧成员列表' },
  { value: 'speakerTop', label: '顶部成员列表' },
  { value: 'layoutLTop', label: '上L型布局', minMember: LAYOUT_L_MIN_MEMBER },
  { value: 'layoutLBottom', label: '下L型布局', minMember: LAYOUT_L_MIN_MEMBER },
]

/**
 * 布局决策：说话人/全员宫格/共享态都从 store 推导，组件只负责画。
 * 规则照 10-M13：共享时宫格禁用（落到右侧列表），L 型不足 7 人不可选。
 */
export function useMeetingLayout(): {
  layoutPreference: Ref<LayoutPreference>
  layoutMode: ComputedRef<LayoutMode>
  memberCount: ComputedRef<number>
  canUse: (option: LayoutOption) => boolean
  setLayoutPreference: (pref: LayoutPreference) => void
} {
  const participants = useParticipantsStore()
  const rtc = useRtcStore()

  const layoutPreference = ref<LayoutPreference>(null)
  const memberCount = computed<number>(() => Math.max(participants.count, 1))

  const canUse = (option: LayoutOption): boolean => {
    if (option.value === 'grid9') return !rtc.sharing
    return option.minMember === undefined || memberCount.value >= option.minMember
  }

  const layoutMode = computed<LayoutMode>(() => {
    const pref = layoutPreference.value
    if (rtc.sharing) {
      // 共享时宫格把共享人塞进等分格子，落到右侧列表；其余布局主位天然是共享人
      return !pref || pref === 'grid9' ? 'speakerRight' : pref
    }
    if (pref !== null && canUse({ value: pref, label: '' })) return pref
    if (memberCount.value <= 1) return 'solo'
    return 'grid9'
  })

  function setLayoutPreference(pref: LayoutPreference): void {
    if (pref !== null) {
      const option = LAYOUT_OPTIONS.find((item) => item.value === pref)
      if (option !== undefined && !canUse(option)) return
    }
    layoutPreference.value = pref
  }

  return { layoutPreference, layoutMode, memberCount, canUse, setLayoutPreference }
}
