import { watchEffect } from 'vue'

import { usePlatform } from '../../../platform'

/** 10-M13 §二：顶栏固定 36px（useTitlebar） */
export const TITLEBAR_HEIGHT = 36

/**
 * 会议窗口的标题栏约定：高度 36 + 拖拽区（CSS 里的 -webkit-app-region），
 * 双击空白处最大化；窗口标题跟随会议标题。
 */
export function useTitlebar(title: () => string): { onDoubleClick: () => void } {
  const platform = usePlatform()

  watchEffect(() => {
    const value = title()
    document.title = value === '' ? '同频会议' : `${value} · 同频会议`
  })

  const onDoubleClick = (): void => {
    void platform.window.toggleMaximize()
  }

  return { onDoubleClick }
}
