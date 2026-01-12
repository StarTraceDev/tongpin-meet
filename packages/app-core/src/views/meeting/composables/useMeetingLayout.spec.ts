import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import type { MeetingParticipant } from '../../../stores/participants'
import { useParticipantsStore } from '../../../stores/participants'
import { useRtcStore } from '../../../stores/rtc'
import { LAYOUT_L_MIN_MEMBER, LAYOUT_OPTIONS, useMeetingLayout } from './useMeetingLayout'

function member(index: number, speaking = false): MeetingParticipant {
  return {
    id: `p${String(index)}`,
    name: `成员${String(index)}`,
    role: 'MEMBER',
    micOn: true,
    cameraOn: false,
    speaking,
  }
}

function seed(count: number): void {
  useParticipantsStore().replaceAll(
    Array.from({ length: count }, (_, index) => member(index, index === 0)),
  )
}

describe('useMeetingLayout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('单人时走 solo', () => {
    seed(1)
    const { layoutMode } = useMeetingLayout()
    expect(layoutMode.value).toBe('solo')
  })

  it('多人默认一屏 9 等分', () => {
    seed(3)
    expect(useMeetingLayout().layoutMode.value).toBe('grid9')
  })

  it('人数够时可以选 L 型', () => {
    seed(LAYOUT_L_MIN_MEMBER)
    const { layoutMode, setLayoutPreference } = useMeetingLayout()
    setLayoutPreference('layoutLTop')
    expect(layoutMode.value).toBe('layoutLTop')
  })

  it('人数不足时 L 型偏好被忽略', () => {
    seed(4)
    const { layoutMode, setLayoutPreference } = useMeetingLayout()
    setLayoutPreference('layoutLBottom')
    expect(layoutMode.value).toBe('grid9')
  })

  it('共享屏幕时宫格落到右侧列表', () => {
    seed(12)
    useRtcStore().sharing = true
    const { layoutMode, setLayoutPreference } = useMeetingLayout()
    setLayoutPreference('grid9')
    expect(layoutMode.value).toBe('speakerRight')
  })

  it('选择器共 5 项，L 型带 7 人下限', () => {
    expect(LAYOUT_OPTIONS).toHaveLength(5)
    expect(LAYOUT_OPTIONS.filter((item) => item.minMember === LAYOUT_L_MIN_MEMBER)).toHaveLength(2)
  })
})
