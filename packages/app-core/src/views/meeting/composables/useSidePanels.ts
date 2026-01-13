import { onBeforeUnmount, onMounted } from 'vue'

import { usePlatform } from '../../../platform'
import { usePanelsStore, type SidePanelKey } from '../../../stores/panels'
import { PANEL_BY_SUBWINDOW, PANEL_SPECS } from '../panels/spec'

/**
 * 侧面板三态（10-M13 M13-3）：
 * - 单面板：一个 key → 400 宽占真实空间
 * - 多面板：再开一个 → 选中 50%，其余平分
 * - 脱离：开 380×680 子窗口，主窗让出空间；子窗关闭自动合并回来
 * 状态全在 usePanelsStore，子窗关闭事件只在这里收口（O14）。
 */
export function useSidePanels(meetingId: () => string): {
  panels: ReturnType<typeof usePanelsStore>
  openPanel: (key: SidePanelKey) => void
  detachPanel: (key: SidePanelKey) => void
} {
  const panels = usePanelsStore()
  const platform = usePlatform()
  let unsubscribe: (() => void) | null = null

  function openPanel(key: SidePanelKey): void {
    // 已脱离的面板：点工具栏就是把子窗收回来
    if (panels.detached.includes(key)) {
      panels.setDetached(key, false)
      void platform.window.closeSub(PANEL_SPECS[key].subWindow)
      return
    }
    // 已选中：再点一次收起（工具栏按钮是开关）
    if (panels.active === key) {
      panels.close(key)
      return
    }
    panels.open(key)
  }

  function detachPanel(key: SidePanelKey): void {
    const spec = PANEL_SPECS[key]
    void platform.window.openSub(spec.subWindow, {
      title: `${spec.title} · 同频会议`,
      payload: { meetingId: meetingId(), panel: key },
    })
    panels.setDetached(key, true)
  }

  onMounted(() => {
    unsubscribe = platform.window.onSubClosed((key) => {
      const panel = PANEL_BY_SUBWINDOW[key]
      if (panel !== undefined) panels.setDetached(panel, false)
    })
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
    unsubscribe = null
    panels.reset()
  })

  return { panels, openPanel, detachPanel }
}
