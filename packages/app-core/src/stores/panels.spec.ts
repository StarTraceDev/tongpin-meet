import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { usePanelsStore } from './panels'

describe('会中面板 store（10-M13 O14 三态）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('打开面板后占位并选中', () => {
    const panels = usePanelsStore()
    panels.open('members')
    expect(panels.opened).toEqual(['members'])
    expect(panels.active).toBe('members')
    expect(panels.hasPanels).toBe(true)
  })

  it('打开第二个面板只切换选中，不丢第一个', () => {
    const panels = usePanelsStore()
    panels.open('members')
    panels.open('chat')
    expect(panels.opened).toEqual(['members', 'chat'])
    expect(panels.active).toBe('chat')
    expect(panels.visible).toEqual(['members', 'chat'])
  })

  it('关闭选中面板后自动选中下一个', () => {
    const panels = usePanelsStore()
    panels.open('members')
    panels.open('chat')
    panels.close('chat')
    expect(panels.opened).toEqual(['members'])
    expect(panels.active).toBe('members')
  })

  it('脱离后面板让出主窗空间，合并回来重新选中', () => {
    const panels = usePanelsStore()
    panels.open('members')
    panels.setDetached('members', true)
    expect(panels.visible).toEqual([])
    expect(panels.hasPanels).toBe(false)
    expect(panels.active).toBeNull()

    panels.setDetached('members', false)
    expect(panels.visible).toEqual(['members'])
    expect(panels.active).toBe('members')
  })

  it('reset 清空三态', () => {
    const panels = usePanelsStore()
    panels.open('members')
    panels.setDetached('members', true)
    panels.reset()
    expect(panels.opened).toEqual([])
    expect(panels.detached).toEqual([])
    expect(panels.active).toBeNull()
  })
})
